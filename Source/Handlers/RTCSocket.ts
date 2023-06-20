import { WebSocketServer } from "ws";
import { Msg } from "../Modules/Logger";
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
        if (Idx !== -1)
            Connections.splice(Idx, 1);
    });

    SendOp(RTCClient, RTCOpCodes.HELLO, {v: 7, heartbeat_interval: 13750});

    Msg(`Client ${chalk.red(RTCClient.ID)} connected to WebRTC!`, "RTCSocket");
    Client.on("message", async (Data) => {
        const Payload = JSON.parse(Data.toString()); // buffer to json
        if (!Payload) return Client.close(4002, "Failed to decode payload");

        Msg(`Received packet from client ${chalk.red(RTCClient.ID)}: ${JSON.stringify(Payload)}`, "RTCSocket");
        switch (Payload.op) {
            case RTCOpCodes.HEARTBEAT:
                return SendOp(RTCClient, RTCOpCodes.HEARTBEAT_ACK, Date.now());
            case RTCOpCodes.REQUEST_VERSIONS:
                return SendOp(RTCClient, RTCOpCodes.REQUEST_VERSIONS, {voice: "0.0.1", rtc_worker: "0.3.42"});
            case RTCOpCodes.IDENTIFY: 
            {
                const GuildID = Payload.d.server_id;
                const UserID = Payload.d.user_id;
                const SessionID = Payload.d.session_id;
                const Token = Payload.d.token;

                if (!GuildID || !UserID || !SessionID || !Token) return Client.close(RTCCloseCodes.AuthenticationFailed, "Authentication failed");

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
                    Session.ConnectedVoiceClients.find((C) => C.Account.ID === UserID).SocketClient.close(RTCCloseCodes.Disconnected, "New Client Connected");
                    Session.ConnectedVoiceClients.splice(Session.ConnectedVoiceClients.findIndex((C) => C.Account.ID === UserID), 1);

                RTCClient.Account = UserEntry;
                RTCClient.server_id = GuildID;
                RTCClient.session_id = SessionID;
                RTCClient.video = Payload.d.video ?? false;
                RTCClient.streams = Payload.d.streams ?? [];

                Session.ConnectedVoiceClients.push(RTCClient);

                Msg(`Client ${chalk.red(RTCClient.ID)} authenticated as ${chalk.red(UserEntry.Username)}!`, "RTCSocket");


                break;
            }
            default:
                console.log("unknown op: " + Payload.op); // TODO FOR VOICE CHANNELS
        }
    });
});