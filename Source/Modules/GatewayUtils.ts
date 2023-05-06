import { unpack, pack } from "erlpack";
import { Deflate, Inflate } from "fast-zlib";
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
    const NewDeflate = new Deflate();
    const Buffer = NewDeflate.process(PackedData);
    SocketClient.send(Buffer);
}

export function SendIntent(SocketClient, Intent: string, Data, s = null) { // https://discord.com/developers/docs/topics/gateway#list-of-intents
    const PackedData = pack({
        t: Intent,
        s: s,
        op: null,
        d: Data
    });
    const NewDeflate = new Deflate();
    const Buffer = NewDeflate.process(PackedData);
    SocketClient.send(Buffer);
}
export function SendRawJSON(SocketClient, Data) {
    const PackedData = pack(Data);
    const NewDeflate = new Deflate();
    const Buffer = NewDeflate.process(PackedData);
    SocketClient.send(Buffer);
}