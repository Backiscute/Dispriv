import ZlibSync from "zlib-sync";
import erlpack, { pack } from "erlpack";
import fs from "fs";

const inflator = new ZlibSync.Inflate({
    chunkSize: 128 * 1024,
});

export type AsyncReturnType<T extends (..._args: any) => Promise<any>> = Awaited<ReturnType<T>>;

export enum OpCodes {
    DISPATCH = 0,
    HEARTBEAT = 1,
    IDENTIFY = 2,
    PRESENCE_UPDATE = 3,
    VOICE_STATE_UPDATE = 4,
    VOICE_PING = 5,
    RESUME = 6,
    RECONNECT = 7,
    REQUEST_GUILD_MEMBERS = 8,
    INVALID_SESSION = 9,
    HELLO = 10,
    HEARTBEAT_ACK = 11,
    CALL_CONNECT = 13,
    REGISTER_GUILD_EVENTS = 14,
    LOBBY_CONNECT = 15,
    LOBBY_DISCONNECT = 16,
    LOBBY_VOICE_STATES_UPDATE = 17,
    STREAM_CREATE = 18,
    STREAM_DELETE = 19,
    STREAM_WATCH = 20,
    STREAM_PING = 21,
    STREAM_SET_PAUSED = 22,
    EMBEDDED_ACTIVITY_CREATE = 25,
    EMBEDDED_ACTIVITY_DELETE = 26,
    EMBEDDED_ACTIVITY_UPDATE = 27,
    REQUEST_FORUM_UNREADS = 28,
    REMOTE_COMMAND = 29,
    REQUEST_DELETED_ENTITY_IDS = 30,
    REQUEST_SOUNDBOARD_SOUNDS = 31,
    CLIENT_SPEEDTEST_CREATE = 32,
    CLIENT_SPEEDTEST_DELETE = 33,
}

function decodePacket(
    data: Buffer,
    json: boolean,
): Promise<{
    opReadable: string;
    data: any;
}> {
    return new Promise((resolve, reject) => {
        data = Buffer.from(data);
        if (data.length >= 4 && data.readUInt32BE(data.length - 4) === 0xffff) {
            inflator.push(data, ZlibSync.Z_SYNC_FLUSH);
            if (!inflator.result) return reject("Invalid data");
            data = Buffer.from(inflator.result);
            if (json) {
                const res = JSON.parse(data.toString());
                resolve({
                    opReadable: OpCodes[res.op],
                    data: res,
                });
            } else {
                const res = erlpack.unpack(data);
                resolve({
                    opReadable: OpCodes[res.op] || res.t,
                    data: res,
                });
            }
        } else {
            inflator.push(data, false);
        }
    });
}

(async () => {
    const packets: {
        type: "send" | "receive";
        time: number;
        opcode: number;
        data: string;
    }[] = JSON.parse(fs.readFileSync("cap.har").toString()).log.entries.find((x: any) =>
        x.request.url.startsWith("wss://gateway.discord.gg"),
    )._webSocketMessages;
    let decoded: AsyncReturnType<typeof decodePacket>[] = [];
    for (const packet of packets) {
        if (packet.type === "send") continue;
        const data = await decodePacket(Buffer.from(packet.data, "base64"), true);
        decoded.push(data);
    }
    fs.writeFileSync("packets.json", JSON.stringify(decoded, null, 4));
})();
