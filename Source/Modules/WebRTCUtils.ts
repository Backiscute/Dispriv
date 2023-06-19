import { RTCConnection } from "../Classes/RTCConnection";

export function SendOp(SocketClient: RTCConnection, Opcode = 0, Data: unknown = null) {
    const Payload = {
        op: Opcode,
        d: Data
    };
    SocketClient.SocketClient.send(JSON.stringify(Payload));
}