import { v4 } from "uuid";
import { User } from "../entity/User";

export class GatewayConnection {
    ID: string; // Autogenerate
    SocketClient: WebSocket;
    Account?: User;

    constructor(Socket) {
        this.ID = v4();
        this.SocketClient = Socket;
    }
}