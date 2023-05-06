import { WebSocketServer } from "ws";
import { unpack } from "erlpack";
import { Msg } from "../Modules/Logger";
import { GatewayConnection } from "../Classes/GatewayConnection";
import { OpCodes } from "../Classes/OpCodes";
import { SendOp } from "../Modules/GatewayUtils";
import { GetUserByToken, VerifyToken } from "../Modules/SnowflakeUtils";

const Socket = new WebSocketServer({ port: parseInt(process.env.WSPORT) || 6968 });

const Connections: GatewayConnection[] = [];
Socket.on("connection", (Client) => {
    const GatewayClient = new GatewayConnection(Client); // create new connection
    Connections.push(GatewayClient); 

    SendOp(Client, OpCodes.HELLO, {
        heartbeat_interval: 41250,
        _trace: ["[\"Dispriv-Gateway\",{\"micros\":0.0}]"]
    });

    Client.on("message", async (Data: Buffer) => {
        const UnpackedData = unpack(Data);
        Msg(`Received packet from client ${GatewayClient.ID.red}: ${JSON.stringify(UnpackedData)}`, "Gateway");
        switch (UnpackedData.op) // Opcodes
        {
        case OpCodes.HEARTBEAT:
            return SendOp(Client, OpCodes.HEARTBEAT_ACK);
        case OpCodes.IDENTIFY: {
            const Token = UnpackedData.d.token ?? "";
            const ValidToken = await VerifyToken(Token);

            if (!ValidToken) return Client.close(4004, "Authentication failed.");

            GatewayClient.Account = await GetUserByToken(Token);

            Msg(`Client ${GatewayClient.ID.red} identified as ${GatewayClient.Account.username} successfully`, "Gateway");

            SendOp(Client, OpCodes.DISPATCH, {
                _trace: ["[\"Dispriv-Gateway\",{\"micros\":0.0}]"],
                analytics_token: Token,
                api_code_version: 1,
                connected_accounts: [], // TODO
                consents: { personalization: { consented: true } },
                country_code: "US",
                experiments: [], // TODO (if u want lol)
                friend_suggestion_count: 0,
                geo_ordered_rtc_regions: ["Dispriv"],
                guild_experiments: [], // TODO (also if you want)
                guild_join_requests: [], // idk what this is but its needed for guilds i think
                guilds: [], // TODO (important for guilds)
                merged_members: [], // YOUR member object in every guild (for roles and stuff)
                private_channels: [], // group chats and dms
                read_state: [], // not sure what this is
                relationships: [], // friends
                resume_gateway_url: "wss://localhost:6968",
                session_id: GatewayClient.ID,
                session_type: "normal",
                sessions: [], // sessions so you can see the devices to log them out i think
                tutorial: null,
                user: GatewayClient.Account.toJSON(), // this should do it for now (CHANGE LATER THO BECAUSE CONTAINS PRIVATE INFO)
                user_guild_settings: [], // guild settings for the user (notifications, etc)
                user_settings_proto: "Dispriv-Proto", // idk what this is
                users: [], // EVERY user in EVERY guild (for searching, mentions, etc)
                v: 9 // api version
            }, 1, "READY");

            return SendOp(Client, OpCodes.DISPATCH, {
                disclose: ["pomelo"], // what
                guilds: [], // embedded_activities array (empty), guild id and voice_states array
                lazy_private_channels: [], // not sure but not needed i think
                merged_members: [], // YOUR member object in every guild (for roles and stuff) same as the other ready merged_members 
                merged_presences: {friends: [], guilds: []} // presences from friends and guilds
            }, 2, "READY_SUPPLEMENTAL");

        }
        }
    });

});

Msg("Gateway initialized!", "Gateway");