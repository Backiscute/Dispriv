import { pack } from "erlpack";
import { deflateSync } from "zlib";

export function SendOp(SocketClient, Opcode, Data) {
    const PackedData = pack({
        t: null,
        s: null,
        op: Opcode,
        d: Data
    });
    SocketClient.send(deflateSync(PackedData));
}

export function SendIntent(SocketClient, Intent: string, Data) { // https://discord.com/developers/docs/topics/gateway#list-of-intents
    const PackedData = pack({
        t: Intent,
        s: null,
        op: null,
        d: Data
    });
    SocketClient.send(deflateSync(PackedData));
}