/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { WebSocketServer } from "ws";
import { unpack } from "erlpack";
import { Msg } from "../Modules/Logger";
import { GatewayConnection } from "../Classes/GatewayConnection";
import { GatewayCloseCodes, OpCodes } from "../Classes/GatewayOpCodes";
import { CloseConnection, ReplayMissedPackets, SendOp } from "../Modules/GatewayUtils";
import { GetTokenUserId, VerifyToken } from "../Modules/AuthUtils";
import { URLSearchParams } from "url";
import { Presence } from "../Classes/Presence";
import { gray, green, red } from "colorette";
import {
    HelloPacket,
} from "../Classes/GatewayPackets";
import path from "path";
import fs from "fs";

const Socket = new WebSocketServer({
    port: parseInt(process.env.WSPORT) || 6968,
});

export const Connections: GatewayConnection[] = [];

export function RemoveConnection(Conn: GatewayConnection) {
    Conn.Dispose();

    if (Conn.Account!) Conn.Account!.Presence = Presence.OFFLINE;

    const Idx = Connections.findIndex((C) => C.ID === Conn.ID);
    if (Idx !== -1) Connections.splice(Idx, 1);
}

Socket.on("connection", async (Client, req) => {
    const QueryParams = new URLSearchParams(req.url?.split("?")[1]);
    /*console.log(QueryParams);
    console.log({
        zlib: QueryParams.get("compress") === "zlib-stream",
        encoding: ["etf", "json"].includes(QueryParams.get("encoding") as string)
            ? (QueryParams.get("encoding") as "etf" | "json")
            : "etf",
    });*/
    let GatewayClient = new GatewayConnection(Client, {
        zlib: QueryParams.get("compress") === "zlib-stream",
        encoding: ["etf", "json"].includes(QueryParams.get("encoding") as string)
            ? (QueryParams.get("encoding") as "etf" | "json")
            : "etf",
    });
    Connections.push(GatewayClient);

    Client.on("close", () => {
        GatewayClient.ScheduledForRemoval = true;
        setTimeout(() => {
            if (!GatewayClient.ScheduledForRemoval) return; // client resumed the connection in time

            RemoveConnection(GatewayClient);
        }, 120 * 1000);
    });

    SendOp<HelloPacket>(GatewayClient, OpCodes.HELLO, {
        heartbeat_interval: 41250,
        _trace: ["[\"Dispriv-Gateway\",{\"micros\":0.0}]"],
    });

    Client.on("message", async (Data: Buffer) => {
        const UnpackedData = GatewayClient.Encoding === "etf" ? unpack(Data) : JSON.parse(Data.toString());
        Msg(`Received packet from client ${red(GatewayClient.ID)}: ${JSON.stringify(UnpackedData)}`, "Gateway");
        switch (UnpackedData.op) {
            case OpCodes.HEARTBEAT:
                return SendOp(GatewayClient, OpCodes.HEARTBEAT_ACK);

            case OpCodes.RESUME: {
                const Token = UnpackedData.d.token ?? "";
                try {
                    if (!(await VerifyToken(Token))) throw new Error("Invalid token"); // no doubling up the code when you can just throw an error

                    if (typeof UnpackedData.d.session_id !== "string") throw new Error("Invalid session");

                    if (typeof UnpackedData.d.seq !== "number") throw new Error("Invalid seq");
                } catch (e) {
                    SendOp(GatewayClient, OpCodes.INVALID_SESSION, false);

                    const er = (e as Error).message.split(" ")[1].toLowerCase();
                    const CloseCode =
                        er === "token" || er === "session"
                            ? GatewayCloseCodes.AuthenticationFailed
                            : er === "seq"
                                ? GatewayCloseCodes.InvalidSeq
                                : GatewayCloseCodes.UnknownError;

                    CloseConnection(GatewayClient, CloseCode, "Authentication failed.");
                    return;
                }

                const Session = UnpackedData.d.session_id ?? "";
                const NewGtCl = Connections.find(
                    (x) => x.ScheduledForRemoval && x.ID === Session && x.Account?.ID === GetTokenUserId(Token),
                );

                if (!NewGtCl) {
                    SendOp(GatewayClient, OpCodes.INVALID_SESSION, false);
                    CloseConnection(GatewayClient, GatewayCloseCodes.AuthenticationFailed, "Authentication failed.");
                    return;
                }

                NewGtCl.UseZlib = GatewayClient.UseZlib;
                NewGtCl.Encoding = GatewayClient.Encoding;
                RemoveConnection(GatewayClient);

                NewGtCl.SocketClient = Client;
                NewGtCl.ScheduledForRemoval = false;
                GatewayClient = NewGtCl;

                await ReplayMissedPackets(GatewayClient, Number(UnpackedData.d.seq));

                SendOp(
                    GatewayClient,
                    OpCodes.DISPATCH,
                    {
                        _trace: [
                            // eslint-disable-next-line quotes
                            '["Dispriv-Gateway",{"micros":189890,"calls":["id_created",{"micros":735,"calls":[]},"session_lookup_time",{"micros":480,"calls":[]},"session_lookup_finished",{"micros":14,"calls":[]},"discord-sessions-prd-2-73",{"micros":187060,"calls":["start_session",{"micros":120393,"calls":["discord-api-785656c5b6-hnsw9",{"micros":112351,"calls":["get_user",{"micros":23943},"get_guilds",{"micros":16119},"user_settings_proto",{"micros":129},"relationships",{"micros":19935},"friend_suggestion",{"micros":59},"connections",{"micros":27},"serialized_read_states",{"micros":8},"pending_payments",{"micros":2},"send_scheduled_deletion_message",{"micros":1},"sanitize_premium_perks",{"micros":1},"guild_join_requests",{"micros":1},"user_guild_settings",{"micros":2},"serialized_private_channels",{"micros":5724},"user_segments",{"micros":5},"experiments",{"micros":12410},"affine_user_ids",{"micros":10646},"required_action",{"micros":4},"authorized_ip_coro",{"micros":1}]}]},"starting_guild_connect",{"micros":33,"calls":[]},"presence_started",{"micros":279,"calls":[]},"guilds_started",{"micros":114,"calls":[]},"guilds_connect",{"micros":65877,"calls":[]},"presence_connect",{"micros":1,"calls":[]},"connect_finished",{"micros":65894,"calls":[]},"build_ready",{"micros":312,"calls":[]},"clean_ready",{"micros":1,"calls":[]},"optimize_ready",{"micros":27,"calls":[]},"split_ready",{"micros":4,"calls":[]}]}]}]',
                        ],
                    },
                    null,
                    "RESUMED",
                );

                /*console.log("--- GETTING RESUME ACCOUNT");

                GatewayClient.Account = (await GetUserByToken(Token, {
                    Memberships: {
                        Owner: false,
                        ToGuild: {
                            Members: {
                                Owner: true,
                            },
                            Channels: {
                                OwnerCategory: true,
                            },
                        },
                    },
                    AvailableDMs: {
                        DMRecipients: true,
                    },
                    RelationsFrom: true,
                    RelationsRegarding: true,
                }))!;
                GatewayClient.UserToken = Token;
                GatewayClient.PackagedAccount = GatewayClient.Account.Package();

                console.log("--- RESUME ACCOUNT GOTTEN");
                GatewayClient.Intents = 0;*/

                Msg(
                    `Client ${red(GatewayClient.ID)} resumed as ${red(
                        GatewayClient.Account!.Username + "#" + GatewayClient.Account!.Discriminator,
                    )}`,
                    "Gateway",
                );
                break;
            }         

            default: {
                const OpName = OpCodes[UnpackedData.op];

                //if (!OpName) return CloseConnection(GatewayClient, GatewayCloseCodes.UnknownOpcode, "Unknown opcode");
                if (!OpName) return;

                const Exists = fs
                    .existsSync(path.join(".", Symbol.for("ts-node.register.instance") in process ? "Source" : "bin", `GatewayEvents/${OpName}.ts`));

                if (!Exists) return;

                try 
                {
                    const OperationFile = await import(`../GatewayEvents/${OpName}.ts`);
                    OperationFile.HandleOpcode(UnpackedData, GatewayClient);
                }
                catch {
                    Msg(`Failed to handle opcode ${red(OpName)}!`, "Gateway");
                }
                
                break;
            }
        }
    });
});

console.log(
    `${gray(new Date().toISOString())} [${green("Gateway")}] ${`Gateway initialized! Listening on port ${green(
        Socket.options.port!,
    )}`}`,
);
