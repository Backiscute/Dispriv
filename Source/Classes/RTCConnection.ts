import { v4 } from "uuid";
import { User } from "../Entities/User";
import WebSocket from "ws";

export class RTCConnection {
    ID: string; // Autogenerate
    session_id: string;
    SocketClient: WebSocket;
    Account?: User;
    server_id: string;
    streams: object;
    video: boolean; // Supports video

    constructor(Socket: WebSocket) {
        this.ID = v4();
        this.SocketClient = Socket;
    }
}
