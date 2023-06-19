import { pack } from "erlpack";
import { GatewayConnection } from "../Classes/GatewayConnection";
import { Connections } from "../Handlers/Gateway";
import { GatewayIntents } from "../Classes/GatewayIntents";
import { Msg } from "./Logger";
import { OpCodes } from "../Classes/OpCodes";
import { red } from "colorette";

export function CloseConnection(SocketClient: GatewayConnection, Code: number, Reason: string) {
    SocketClient.Deflater.close();
    SocketClient.Inflater.close();
    SocketClient.SocketClient.close(Code, Reason);
}

export function FindConnection(UserID: string): GatewayConnection {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return Connections.find(x => x.Account?.ID === UserID)!;
}

export function ConnectionHasIntent(SocketClient: GatewayConnection, Intent: GatewayIntents) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (SocketClient.Intents == 0 && !SocketClient.Account!.Bot) return true;

    return (SocketClient.Intents & Intent) === Intent;
}

export function HasIntent(intentNumber: number, intent: GatewayIntents) {
    return intentNumber === 0 || (intentNumber & intent) === intent;
}

export function SendOp(SocketClient: GatewayConnection, Opcode: OpCodes, Data: unknown = null, s: unknown = null, t: unknown = null) {
    const D = {
        t: t,
        s: s,
        op: Opcode,
        d: Data
    };
    const PackedData = SocketClient.Encoding === "etf" ? pack(D) : Buffer.from(JSON.stringify(D));
    const Bf = SocketClient.UseZlib ? SocketClient.Deflater.process(PackedData) : PackedData;
    Msg(`Sending packet to client ${red(SocketClient.ID)}: ${JSON.stringify(D)}`, "Gateway");
    SocketClient.SocketClient.send(Bf);
}

export function SendRawJSON(SocketClient: GatewayConnection, Data: unknown) {
    const PackedData = SocketClient.Encoding === "etf" ? pack(Data) : Buffer.from(JSON.stringify(Data));
    const Bf = SocketClient.UseZlib ? SocketClient.Deflater.process(PackedData) : PackedData;
    SocketClient.SocketClient.send(Bf);
}