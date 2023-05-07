import { pack } from "erlpack";
import { GatewayConnection } from "../Classes/GatewayConnection";

import "colors";

export function CloseConnection(SocketClient: GatewayConnection, Code: number, Reason: string) {
    SocketClient.Deflater.close();
    SocketClient.Inflater.close();
    SocketClient.SocketClient.close(Code, Reason);
}

export function SendOp(SocketClient: GatewayConnection, Opcode, Data = null, s = null, t = null) {
    const PackedData = pack({
        t: t,
        s: s,
        op: Opcode,
        d: Data
    });
    const Buffer = SocketClient.Deflater.process(PackedData) as Buffer; // ezpz
    SocketClient.SocketClient.send(Buffer);
}

export function SendRawJSON(SocketClient: GatewayConnection, Data) {
    const PackedData = pack(Data);
    const Buffer = SocketClient.Deflater.process(PackedData) as Buffer;
    SocketClient.SocketClient.send(Buffer);
}