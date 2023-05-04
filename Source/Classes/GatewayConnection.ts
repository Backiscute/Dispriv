import { v4 } from "uuid";

export class GatewayConnection {
    ID: string; // Autogenerate
    SocketClient: WebSocket;
    Account?: object; // TODO: Replace with account class made using typeorm

    constructor(Socket) {
        this.ID = v4();
        this.SocketClient = Socket;
    }
}