import { unpack, pack } from "erlpack";
import { deflateSync } from "zlib";
import { Msg } from "./Logger";
import "colors";

export function SendOp(SocketClient, Opcode, Data = null, s = null, t = null) {
    const PackedData = pack({
        t: t,
        s: s,
        op: Opcode,
        d: Data
    });
    console.log(unpack(PackedData));
    SocketClient.send(deflateSync(PackedData));
}

export function SendIntent(SocketClient, Intent: string, Data, s = null) { // https://discord.com/developers/docs/topics/gateway#list-of-intents
    const PackedData = pack({
        t: Intent,
        s: s,
        op: null,
        d: Data
    });
    SocketClient.send(deflateSync(PackedData));
}