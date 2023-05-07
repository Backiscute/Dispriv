import { WebSocketServer } from "ws";
import { Msg } from "../Modules/Logger";
import { RTCConnection } from "../Classes/RTCConnection";
import { SendOp } from "../Modules/WebRTCUtils";
import { RTCOpCodes } from "../Classes/RTCOpCodes";
import { GetUserByToken, VerifyToken } from "../Modules/SnowflakeUtils";

// mediasoup didnt work fine

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

    Msg(`Client ${RTCClient.ID.red} connected to WebRTC!`, "RTCSocket");
    Client.on("message", async (Data) => {
        const Payload = JSON.parse(Data.toString()); // buffer to json
        if (!Payload) return Client.close(4002, "Failed to decode payload");

        Msg(`Received packet from client ${RTCClient.ID.red}: ${JSON.stringify(Payload)}`, "RTCSocket");
        switch (Payload.op) {
            case RTCOpCodes.HEARTBEAT:
                return SendOp(RTCClient, RTCOpCodes.HEARTBEAT_ACK, Date.now());
            case RTCOpCodes.REQUEST_VERSIONS:
                return SendOp(RTCClient, RTCOpCodes.REQUEST_VERSIONS, {voice: "0.0.1", rtc_worker: "0.3.42"});
                break;
            case RTCOpCodes.IDENTIFY: {
                const Token = Payload.d.token ?? "";
                const UserID = Payload.d.user_id;
                const Server_id = Payload.d.server_id;
                const ValidToken = await VerifyToken(Token);
                if (!UserID || !ValidToken || !Server_id || !Payload.d.streams) return Client.close(4004, "Authentication failed");
                RTCClient.UserToken = Token;
                RTCClient.server_id = Server_id;
                RTCClient.streams = Payload.d.streams;
                RTCClient.Account = await GetUserByToken(Token);
                Msg("WebRTC Client " + RTCClient.ID.red + " identified as " + RTCClient.Account.Username + " successfully", "RTCSocket");

                // TODO webrtc media server and more stuff for calls
                SendOp(RTCClient, RTCOpCodes.READY, {
                    streams: [], // i aint streaming allat
                    ssrc: -1, // Synchronization Source 
                    port: "0000",
                    ip: "127.0.0.1",
                    modes: ["aead_aes256_gcm_rtpsize","aead_aes256_gcm","aead_xchacha20_poly1305_rtpsize","xsalsa20_poly1305_lite_rtpsize","xsalsa20_poly1305_lite","xsalsa20_poly1305_suffix","xsalsa20_poly1305"],
                    experiments: ["fixed_keyframe_interval"]
                });
            }
        }
    });
});