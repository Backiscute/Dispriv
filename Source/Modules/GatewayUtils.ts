import { pack } from "erlpack";
import { GatewayConnection } from "../Classes/GatewayConnection";
import { Connections } from "../Handlers/Gateway";
import { GatewayIntents } from "../Classes/GatewayIntents";
import { Msg } from "./Logger";

export function CloseConnection(SocketClient: GatewayConnection, Code: number, Reason: string) {
    SocketClient.Deflater.close();
    SocketClient.Inflater.close();
    SocketClient.SocketClient.close(Code, Reason);
}

export function FindConnection(UserID: string): GatewayConnection {
    return Connections.find(x => x.Account?.ID === UserID);
}

export function ConnectionHasIntent(SocketClient: GatewayConnection, Intent: GatewayIntents) {
    if (SocketClient.Intents == 0 && !SocketClient.Account.Bot) return true;

    return (SocketClient.Intents & Intent) === Intent;
}

export function HasIntent(intentNumber: number, intent: GatewayIntents): boolean {
    return (intentNumber & intent) === intent;
}

export function SendOp(SocketClient: GatewayConnection, Opcode, Data = null, s = null, t = null) {
    const PackedData = pack({
        t: t,
        s: s,
        op: Opcode,
        d: Data
    });
    const Buffer = SocketClient.Deflater.process(PackedData);
    Msg(`Sending packet to client ${SocketClient.ID.red}: ${JSON.stringify(Data)}`, "Gateway");
    SocketClient.SocketClient.send(Buffer);
}

export function SendRawJSON(SocketClient: GatewayConnection, Data) {
    const PackedData = pack(Data);
    const Buffer = SocketClient.Deflater.process(PackedData);
    SocketClient.SocketClient.send(Buffer);
}