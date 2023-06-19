import { v4 } from "uuid";
import { User } from "../Entities/User";
import { Deflate, Inflate } from "fast-zlib";
import { WebSocket } from "ws";

export class GatewayConnection {
    ID: string; // Autogenerate
    UserToken: string;
    SocketClient: WebSocket;
    UseZlib: boolean;
    Encoding: "etf" | "json";
    Account?: User;
    Deflater: Deflate;
    Inflater: Inflate;
    Intents: number;

    constructor(Socket, Overrides?: { zlib: boolean, encoding: "etf" | "json" }) {
        this.ID = v4();
        this.SocketClient = Socket;

        this.UseZlib = Overrides ? Overrides.zlib : true;
        this.Encoding = Overrides ? Overrides.encoding : "etf";

        this.Deflater = new Deflate();
        this.Inflater = new Inflate();
        this.Intents = 0;
    }

    Dispose() {
        this.Deflater?.close();
        this.Inflater?.close();
    }
}