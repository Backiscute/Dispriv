import { WebSocketServer } from "ws";
import { Msg } from "../Modules/Logger";
import { RTCConnection } from "../Classes/RTCConnection";
import { SendOp } from "../Modules/WebRTCUtils";
import { RTCOpCodes } from "../Classes/RTCOpCodes";
import chalk from "chalk";

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
                break;
            default:
                console.log("unknown op"); // TODO FOR VOICE CHANNELS
        }
    });
});