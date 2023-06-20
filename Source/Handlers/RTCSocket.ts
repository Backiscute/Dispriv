import { WebSocketServer } from "ws";
import { Error, Msg } from "../Modules/Logger";
import { RTCConnection } from "../Classes/RTCConnection";
import { SendOp } from "../Modules/WebRTCUtils";
import { RTCCloseCodes, RTCOpCodes } from "../Classes/RTCOpCodes";
import chalk from "chalk";
import { VoiceSession } from "../Classes/VoiceSession";
import bcrypt from "bcrypt";
import { User } from "../Entities/User";

export const VoiceSessions: VoiceSession[] = [];

const Socket = new WebSocketServer({
    port: parseInt(process.env.RTCWSPORT) || 6967,
});

const Connections: RTCConnection[] = [];
Socket.on("connection", (Client) => {
    const RTCClient = new RTCConnection(Client); // create new connection
    Connections.push(RTCClient);

    Client.on("close", () => {
        const Idx = Connections.findIndex((C) => C.ID === RTCClient.ID);
        if (Idx !== -1) Connections.splice(Idx, 1);
    });

    SendOp(RTCClient, RTCOpCodes.HELLO, { v: 7, heartbeat_interval: 13750 });

    Msg(`Client ${chalk.red(RTCClient.ID)} connected to WebRTC!`, "RTCSocket");
    Client.on("message", async (Data) => {
        const Payload = JSON.parse(Data.toString()); // buffer to json
        if (!Payload) return Client.close(4002, "Failed to decode payload");

        Msg(`Received packet from client ${chalk.red(RTCClient.ID)}: ${JSON.stringify(Payload)}`, "RTCSocket");
        switch (Payload.op) {
            case RTCOpCodes.HEARTBEAT:
                return SendOp(RTCClient, RTCOpCodes.HEARTBEAT_ACK, Date.now());
            case RTCOpCodes.REQUEST_VERSIONS:
                return SendOp(RTCClient, RTCOpCodes.REQUEST_VERSIONS, { voice: "0.0.1", rtc_worker: "0.3.42" });
            case RTCOpCodes.IDENTIFY: {
                const GuildID = Payload.d.server_id;
                const UserID = Payload.d.user_id;
                const SessionID = Payload.d.session_id;
                const Token = Payload.d.token;

                if (!GuildID || !UserID || !SessionID || !Token)
                    return Client.close(RTCCloseCodes.AuthenticationFailed, "Authentication failed");

                const UserEntry = await User.findOne({ where: { ID: UserID } });

                if (!UserEntry) return Client.close(RTCCloseCodes.AuthenticationFailed, "Authentication failed");

                const TokenCheck = `${GuildID}-${UserID}-${SessionID}-${UserEntry.Password}`;

                const HashResult = await bcrypt.compareSync(TokenCheck, Token);

                if (!HashResult) return Client.close(RTCCloseCodes.AuthenticationFailed, "Authentication failed");

                const Session = VoiceSessions.find((S) => S.guild_id === GuildID);

                if (!Session) return Client.close(RTCCloseCodes.ServerNotFound, "Server Not Found");

                const VoiceState = Session.voice_states.find((S) => S.user_id === UserID);

                if (!VoiceState) return Client.close(RTCCloseCodes.SessionNoLongerValid, "Session No Longer Valid");

                if (Session.ConnectedVoiceClients.find((C) => C.session_id === SessionID))
                    return Client.close(RTCCloseCodes.AlreadyAuthenticated, "Already Authenticated");
                else if (Session.ConnectedVoiceClients.find((C) => C.Account.ID === UserID))
                    Session.ConnectedVoiceClients.find((C) => C.Account.ID === UserID).SocketClient.close(
                        RTCCloseCodes.Disconnected,
                        "New Client Connected"
                    );
                Session.ConnectedVoiceClients.splice(
                    Session.ConnectedVoiceClients.findIndex((C) => C.Account.ID === UserID),
                    1
                );

                RTCClient.Account = UserEntry;
                RTCClient.server_id = GuildID;
                RTCClient.session_id = SessionID;
                RTCClient.video = Payload.d.video ?? false;
                RTCClient.streams = Payload.d.streams ?? [];

                Session.ConnectedVoiceClients.push(RTCClient);

                Msg(
                    `Client ${chalk.red(RTCClient.ID)} authenticated as ${chalk.red(UserEntry.Username)}!`,
                    "RTCSocket"
                );

                SendOp(RTCClient, RTCOpCodes.READY, {
                    streams: [
                        { type: "video", ssrc: 178840, rtx_ssrc: 178841, rid: "100", quality: 100, active: false },
                    ],
                    ssrc: 178839,
                    port: 50001,
                    modes: [
                        "aead_aes256_gcm_rtpsize",
                        "aead_aes256_gcm",
                        "aead_xchacha20_poly1305_rtpsize",
                        "xsalsa20_poly1305_lite_rtpsize",
                        "xsalsa20_poly1305_lite",
                        "xsalsa20_poly1305_suffix",
                        "xsalsa20_poly1305",
                    ],
                    ip: "66.22.198.18",
                    experiments: ["fixed_keyframe_interval"],
                });
                break;
            }
            case RTCOpCodes.SELECT_PROTOCOL: {
                const Session = VoiceSessions.find((S) => S.guild_id === RTCClient.server_id);
                if (!Session) return Client.close(RTCCloseCodes.SessionNoLongerValid, "Session no longer valid");
                // TODO: implement RTC server
                SendOp(RTCClient, RTCOpCodes.SESSION_DESCRIPTION, {
                    video_codec: "H264",
                    sdp: "m=audio 50008 ICE/SDP\na=fingerprint:sha-256 4A:79:94:16:44:3F:BD:05:41:5A:C7:20:F3:12:54:70:00:73:5D:33:00:2D:2C:80:9B:39:E1:9F:2D:A7:49:87\nc=IN IP4 35.214.140.185\na=rtcp:50008\na=ice-ufrag:kdQV\na=ice-pwd:DvKMbn46m8EX5pWwlTHrxG\na=fingerprint:sha-256 4A:79:94:16:44:3F:BD:05:41:5A:C7:20:F3:12:54:70:00:73:5D:33:00:2D:2C:80:9B:39:E1:9F:2D:A7:49:87\na=candidate:1 1 UDP 4261412862 35.214.140.185 50008 typ host\n",
                    media_session_id: "b5de7bfe1ca8a5b4690990d6a38bbe03",
                    audio_codec: "opus",
                });
                break;
            }
            default:
                Error("unknown op: " + Payload.op); // TODO FOR VOICE CHANNELS
        }
    });
});
