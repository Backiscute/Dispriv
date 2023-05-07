import { v4 } from "uuid";
import { User } from "../Entities/User";
import { Deflate, Inflate } from "fast-zlib";

export class GatewayConnection {
    ID: string; // Autogenerate
    UserToken: string;
    SocketClient: WebSocket;
    Account?: User;
    Deflater: Deflate;
    Inflater: Inflate;

    constructor(Socket) {
        this.ID = v4();
        this.SocketClient = Socket;

        this.Deflater = new Deflate();
        this.Inflater = new Inflate();
    }

    Dispose() {
        this.Deflater?.close();
        this.Inflater?.close();
    }
}