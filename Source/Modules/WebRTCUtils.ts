import { red } from "colorette";
import { Msg } from "./Logger";
import { RTCConnection } from "../Classes/RTCConnection";

export function SendOp(SocketClient: RTCConnection, Opcode = 0, Data: unknown = null) {
    const Payload = {
        op: Opcode,
        d: Data
    };
    Msg(`Sending packet to client ${red(SocketClient.ID)}: ${JSON.stringify(Data)}`, "RTCSocket");
    SocketClient.SocketClient.send(JSON.stringify(Payload));
}