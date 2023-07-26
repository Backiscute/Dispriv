import { pack } from "erlpack";
import { BasePacket, GatewayConnection } from "../Classes/GatewayConnection";
import { Connections } from "../Handlers/Gateway";
import { GatewayIntents } from "../Classes/GatewayIntents";
import { Msg } from "./Logger";
import { OpCodes } from "../Classes/GatewayOpCodes";
import { red } from "colorette";

export type DispatchType =
    | "HELLO"
    | "HEARTBEAT_ACK"
    | "RECONNECT"
    | "INVALID_SESSION"
    | "READY"
    | "READY_SUPPLEMENTAL"
    | "RESUMED"
    | "AUTH_SESSION_CHANGE"
    | "APPLICATION_COMMAND_PERMISSIONS_UPDATE"
    | "CALL_CREATE"
    | "CALL_UPDATE"
    | "CALL_DELETE"
    | "CHANNEL_CREATE"
    | "CHANNEL_UPDATE"
    | "CHANNEL_DELETE"
    | "CHANNEL_PINS_UPDATE"
    | "CHANNEL_RECIPIENT_ADD"
    | "CHANNEL_RECIPIENT_REMOVE"
    | "THREAD_CREATE"
    | "THREAD_UPDATE"
    | "THREAD_DELETE"
    | "THREAD_LIST_SYNC"
    | "THREAD_MEMBER_UPDATE"
    | "THREAD_MEMBERS_UPDATE"
    | "GUILD_CREATE"
    | "GUILD_UPDATE"
    | "GUILD_DELETE"
    | "GUILD_AUDIT_LOG_ENTRY_CREATE"
    | "GUILD_BAN_ADD"
    | "GUILD_BAN_REMOVE"
    | "GUILD_EMOJIS_UPDATE"
    | "GUILD_STICKERS_UPDATE"
    | "GUILD_MEMBER_ADD"
    | "GUILD_MEMBER_REMOVE"
    | "GUILD_MEMBER_UPDATE"
    | "GUILD_MEMBERS_CHUNK"
    | "GUILD_MEMBER_LIST_UPDATE"
    | "GUILD_ROLE_CREATE"
    | "GUILD_ROLE_UPDATE"
    | "GUILD_ROLE_DELETE"
    | "GUILD_SCHEDULED_EVENT_CREATE"
    | "GUILD_SCHEDULED_EVENT_UPDATE"
    | "GUILD_SCHEDULED_EVENT_DELETE"
    | "GUILD_SCHEDULED_EVENT_USER_ADD"
    | "GUILD_SCHEDULED_EVENT_USER_REMOVE"
    | "GUILD_INTEGRATIONS_UPDATE"
    | "INTEGRATION_CREATE"
    | "INTEGRATION_UPDATE"
    | "INTEGRATION_DELETE"
    | "INTERACTION_CREATE"
    | "INVITE_CREATE"
    | "INVITE_DELETE"
    | "MESSAGE_CREATE"
    | "MESSAGE_UPDATE"
    | "MESSAGE_DELETE"
    | "MESSAGE_DELETE_BULK"
    | "MESSAGE_REACTION_ADD"
    | "MESSAGE_REACTION_REMOVE"
    | "MESSAGE_REACTION_REMOVE_ALL"
    | "MESSAGE_REACTION_REMOVE_EMOJI"
    | "RECENT_MENTION_DELETE"
    | "PRESENCE_UPDATE"
    | "RELATIONSHIP_ADD"
    | "RELATIONSHIP_UPDATE"
    | "RELATIONSHIP_REMOVE"
    | "SESSIONS_REPLACE"
    | "STAGE_INSTANCE_CREATE"
    | "STAGE_INSTANCE_UPDATE"
    | "STAGE_INSTANCE_DELETE"
    | "TYPING_START"
    | "USER_UPDATE"
    | "USER_NOTE_UPDATE"
    | "USER_REQUIRED_ACTION_UPDATE"
    | "VOICE_STATE_UPDATE"
    | "VOICE_SERVER_UPDATE"
    | "WEBHOOKS_UPDATE"
    | "SPEED_TEST_CREATE"
    | "SPEED_TEST_DELETE"
    | "SPEED_TEST_SERVER_UPDATE"
    | "EMBEDDED_ACTIVITY_UPDATE"
    | "VOICE_CHANNEL_EFFECT_SEND";

export function CloseConnection(SocketClient: GatewayConnection, Code: number, Reason: string) {
    SocketClient.Deflater.close();
    SocketClient.Inflater.close();
    SocketClient.SocketClient.close(Code, Reason);
}

export function FindConnection(UserID: string) {
    const Conns = Connections.filter((x) => x.Account?.ID === UserID);
    if (Conns.length < 1) return null;

    let ReturnedConn = Conns[0];
    if (Conns.length > 1)
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        ReturnedConn = Conns.find((x) => !x.ScheduledForRemoval)!;

    return ReturnedConn;
}

export function ConnectionHasIntent(SocketClient: GatewayConnection, Intent: GatewayIntents) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (SocketClient.Intents == 0 && !SocketClient.Account!.Bot) return true;

    return (SocketClient.Intents & Intent) === Intent;
}

export function HasIntent(intentNumber: number, intent: GatewayIntents) {
    return intentNumber === 0 || (intentNumber & intent) === intent;
}

export function SendOp<T>(
    SocketClient: GatewayConnection,
    Opcode: OpCodes,
    Data: T | null = null,
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    _s: unknown = null, // no longer taken into account, done automatically
    t?: DispatchType,
    ReplayingPacket?: BasePacket,
) {
    if (!ReplayingPacket) SocketClient.LastPacketSession++;

    const D: BasePacket = ReplayingPacket ?? {
        op: Opcode,
        d: Data,
        s: SocketClient.LastPacketSession,
        t: t,
    };

    const PackedData = SocketClient.Encoding === "etf" ? pack(D) : Buffer.from(JSON.stringify(D));
    const Bf = SocketClient.UseZlib ? SocketClient.Deflater.process(PackedData) : PackedData.toString();

    if (SocketClient.ScheduledForRemoval) {
        Msg(
            `Scheduling packet ${red(D.s)} as missed for client ${red(SocketClient.ID)}: ${JSON.stringify(D)}`,
            "Gateway",
        );
        SocketClient.MissedPackets.push(D);
        return;
    }

    Msg(
        `${ReplayingPacket ? "Re-s" : "S"}ending packet ${red(D.s)} to client ${red(SocketClient.ID)}: ${JSON.stringify(
            D,
        )}`,
        "Gateway",
    );
    SocketClient.SocketClient.send(Bf);
}

export async function ReplayMissedPackets(SocketClient: GatewayConnection, FromSeq: number) {
    for await (const Packet of SocketClient.MissedPackets.filter((bp) => bp.s >= FromSeq)) {
        await SendOp(SocketClient, 0, undefined, undefined, undefined, Packet);
    }

    SocketClient.MissedPackets = [];
}

export function SendRawJSON(SocketClient: GatewayConnection, Data: unknown) {
    const PackedData = SocketClient.Encoding === "etf" ? pack(Data) : Buffer.from(JSON.stringify(Data));
    const Bf = SocketClient.UseZlib ? SocketClient.Deflater.process(PackedData) : PackedData.toString();
    SocketClient.SocketClient.send(Bf);
}
