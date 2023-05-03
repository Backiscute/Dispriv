import { WebSocketServer } from "ws";
import { pack, unpack } from "erlpack";
import { deflateSync } from "zlib";
import { Msg } from "../Modules/Logger";
import { GatewayConnection } from "../Classes/GatewayConnection";

const Socket = new WebSocketServer({ port: parseInt(process.env.WSPORT) || 6968 });

const Connections: GatewayConnection[] = [];
Socket.on("connection", (Client) => {
    Connections.push(new GatewayConnection(Client)); // create new connection
});

Msg("Gateway initialized!", "Gateway");