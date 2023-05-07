import { v4 } from "uuid";
import { User } from "../Entities/User";

export class RTCConnection {
    ID: string; // Autogenerate
    UserToken: string;
    SocketClient: WebSocket;
    Account?: User;
    server_id: string;
    streams: object;

    constructor(Socket) {
        this.ID = v4();
        this.SocketClient = Socket;
    }
}