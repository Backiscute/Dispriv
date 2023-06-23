import { GatewayConnection } from "../Classes/GatewayConnection";
import WebSocket, { WebSocketServer } from "ws";
import { Connections } from "./Gateway";

export type TestWSType = "log" | "ws";

export interface WebsocketPacket {
    connections: GatewayConnection[];
    action: "add" | "remove";
}

export const Socket = new WebSocketServer({
    port: 6970,
    path: "/api/tests/ws",
});

export const Clients: WebSocket[] = [];

Socket.on("connection", (WS) => {
    Clients.push(WS);
    TestSendToClient<WebsocketPacket>(
        {
            connections: Connections,
            action: "add",
        },
        "ws",
        WS,
    );
    WS.on("close", () => {
        const index = Clients.indexOf(WS);
        if (index !== -1) {
            Clients.splice(index, 1);
        }
    });
    WS.on("message", (data) => {
        const parsed = JSON.parse(data.toString());
        if (!parsed || !parsed.Type) return;
        switch (parsed.Type) {
            case "SEND_WS_CONN":
                TestSendToClient<WebsocketPacket>(
                    {
                        connections: Connections,
                        action: "add",
                    },
                    "ws",
                    WS,
                );
                break;
        }
    });
});

export function TestSendToClient<T>(Data: T, Type: TestWSType, Client: WebSocket) {
    Client.send(
        JSON.stringify({
            Data,
            Type,
        }),
    );
}

export function TestSendToClients<T>(Data: T, Type: TestWSType) {
    Clients.forEach((Client) => {
        Client.send(
            JSON.stringify({
                Data,
                Type,
            }),
        );
    });
}

