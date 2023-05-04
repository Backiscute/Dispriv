import { WebSocketServer } from "ws";
import { unpack } from "erlpack";
import { Msg } from "../Modules/Logger";
import { GatewayConnection } from "../Classes/GatewayConnection";
import { OpCodes } from "../Classes/OpCodes";
import { SendOp } from "../Modules/GatewayUtils";

const Socket = new WebSocketServer({ port: parseInt(process.env.WSPORT) || 6968 });

const Connections: GatewayConnection[] = [];
Socket.on("connection", (Client) => {
    const GatewayClient = new GatewayConnection(Client); // create new connection
    Connections.push(GatewayClient); 

    SendOp(Client, OpCodes.HELLO, {
        heartbeat_interval: 41250,
        _trace: ["[\"Dispriv-Gateway\",{\"micros\":0.0}]"]
    });

    Client.on("message", (Data: Buffer) => {
        const UnpackedData = unpack(Data);
        Msg(`Received packet from client ${GatewayClient.ID.red}: ${JSON.stringify(UnpackedData)}`, "Gateway");
        switch (UnpackedData.op) // Opcodes
        {
        case OpCodes.HEARTBEAT:
            return SendOp(Client, OpCodes.HEARTBEAT_ACK, null);
        }
    });

});

Msg("Gateway initialized!", "Gateway");