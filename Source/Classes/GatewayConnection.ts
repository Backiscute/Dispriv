import { v4 } from "uuid";
import { User } from "../Entities/User";
import { Deflate, Inflate } from "fast-zlib";
import { WebSocket } from "ws";
import { OpCodes } from "./GatewayOpCodes";
import { DispatchType } from "../Modules/GatewayUtils";
import { GatewayCapabilities } from "./GatewayCapabilities";

export interface BasePacket {
	op: OpCodes; // opcode
    d: unknown; // data
    s: number; // session packet number
    t: DispatchType | undefined; // dispatch event type
}

export class GatewayConnection {
    ID: string; // Autogenerate
    UserToken: string;
    ScheduledForRemoval: boolean = false;
    SocketClient: WebSocket;
    UseZlib: boolean;
    Encoding: "etf" | "json";
    Account?: User;
    PackagedAccount?: ReturnType<typeof User.prototype.Package>;
    Deflater: Deflate;
    Inflater: Inflate;
    Intents: number;
    Capabilities: GatewayCapabilities;

    LastPacketSession: number = -1;
    MissedPackets: BasePacket[] = [];

    constructor(Socket: WebSocket, Overrides?: { zlib: boolean; encoding: "etf" | "json" }) {
        this.ID = v4();
        this.SocketClient = Socket;

        this.UseZlib = Overrides ? Overrides.zlib : true;
        this.Encoding = Overrides ? Overrides.encoding : "etf";

        this.Deflater = new Deflate();
        this.Inflater = new Inflate();
        this.Intents = 0;
        this.Capabilities = GatewayCapabilities.UNKNOWN;
    }

    HasCapability(Capability: GatewayCapabilities): boolean {
        return (this.Capabilities & Capability) === Capability;
    };

    CapabilitiesToStringArray(): string[] {
        const Capabilities: string[] = [];
        for (const Capability in GatewayCapabilities) {
            if (this.HasCapability(GatewayCapabilities[Capability as keyof typeof GatewayCapabilities])) {
                Capabilities.push(Capability);
            }
        }
        return Capabilities;
    }

    Dispose() {
        this.Deflater?.close();
        this.Inflater?.close();
    }
}
