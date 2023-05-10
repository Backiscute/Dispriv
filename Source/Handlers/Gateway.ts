import { WebSocketServer } from "ws";
import { unpack } from "erlpack";
import { Msg } from "../Modules/Logger";
import { GatewayConnection } from "../Classes/GatewayConnection";
import { OpCodes } from "../Classes/OpCodes";
import { CloseConnection, SendOp } from "../Modules/GatewayUtils";
import { GetUserByToken, VerifyToken } from "../Modules/SnowflakeUtils";
import { parse, URLSearchParams } from "url";

const Socket = new WebSocketServer({
  port: parseInt(process.env.WSPORT) || 6968,
});

export const Connections: GatewayConnection[] = [];
Socket.on("connection", (Client, req) => {
  const QueryParams = new URLSearchParams(parse(req.url).query);
  console.log(QueryParams);
  console.log({
    zlib: QueryParams.get("compress") === "zlib-stream",
    encoding: (QueryParams.get("encoding") === "etf" || QueryParams.get("encoding") === "json") ? QueryParams.get("encoding") : "etf"
  });
  const GatewayClient = new GatewayConnection(Client, {
    zlib: QueryParams.get("compress") === "zlib-stream",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    encoding: (QueryParams.get("encoding") === "etf" || QueryParams.get("encoding") === "json") ? QueryParams.get("encoding") as any : "etf"
  }); // create new connection
  Connections.push(GatewayClient);

  Client.on("close", () => {
    // brain damage generator
    GatewayClient.Dispose();
    const Idx = Connections.findIndex((C) => C.ID === GatewayClient.ID);
    if (Idx !== -1)
        Connections.splice(Idx, 1);
  });

  SendOp(GatewayClient, OpCodes.HELLO, {
    heartbeat_interval: 41250, // eslint-disable-next-line quotes
    _trace: ['["Dispriv-Gateway",{"micros":0.0}]'],
  });

  Client.on("message", async (Data: Buffer) => {
    const UnpackedData = GatewayClient.Encoding === "etf" ? unpack(Data) : JSON.parse(Data.toString());
    Msg(
      `Received packet from client ${GatewayClient.ID.red}: ${JSON.stringify(
        UnpackedData
      )}`,
      "Gateway"
    );
    switch (
      UnpackedData.op // Opcodes
    ) {
      case OpCodes.HEARTBEAT:
        return SendOp(GatewayClient, OpCodes.HEARTBEAT_ACK);

      case OpCodes.CLIENT_SPEEDTEST_CREATE:
        if (!GatewayClient.Account) return CloseConnection(GatewayClient, 4003, "Not authenticated");
        SendOp(GatewayClient, OpCodes.DISPATCH, {paused: false, region: "Dispriv", rtc_server_id: "1", stream_key: "test:" + GatewayClient.Account.ID, stream_server_id: "1", viewer_ids: []}, null, "SPEED_TEST_CREATE");
        SendOp(GatewayClient, OpCodes.DISPATCH, {endpoint: "127.0.0.1:" + process.env.RTCWSPORT || "6967", guild_id: null, stream_key: "test:" + GatewayClient.Account.ID, token: GatewayClient.UserToken}, null, "SPEED_TEST_SERVER_UPDATE");
        break;

      case OpCodes.CLIENT_SPEEDTEST_DELETE:
        if (!GatewayClient.Account) return CloseConnection(GatewayClient, 4003, "Not authenticated");
        SendOp(GatewayClient, OpCodes.DISPATCH, {reason: "user_requested", stream_key: "test:" + GatewayClient.Account.ID}, null, "SPEED_TEST_DELETE");
        break;

      case OpCodes.IDENTIFY: {
        const Token = UnpackedData.d.token ?? "";
        const ValidToken = await VerifyToken(Token);

        if (!ValidToken) return CloseConnection(GatewayClient, 4004, "Authentication failed.");

        GatewayClient.Account = await GetUserByToken(Token, { AvailableDMs: { DMRecipients: true }, RelationsFrom: true, RelationsRegarding: true });
        GatewayClient.UserToken = Token;

        const ConnectionIntents = UnpackedData.d.intents ?? 0;
        GatewayClient.Intents = ConnectionIntents; // TODO: add check for privileged intents

        Msg(
          `Client ${GatewayClient.ID.red} identified as ${GatewayClient.Account.Username} successfully`,
          "Gateway"
        );
        

        SendOp(
          GatewayClient,
          OpCodes.DISPATCH,
          {
              _trace: [
              // eslint-disable-next-line quotes
              '["Dispriv-Gateway",{"micros":189890,"calls":["id_created",{"micros":735,"calls":[]},"session_lookup_time",{"micros":480,"calls":[]},"session_lookup_finished",{"micros":14,"calls":[]},"discord-sessions-prd-2-73",{"micros":187060,"calls":["start_session",{"micros":120393,"calls":["discord-api-785656c5b6-hnsw9",{"micros":112351,"calls":["get_user",{"micros":23943},"get_guilds",{"micros":16119},"user_settings_proto",{"micros":129},"relationships",{"micros":19935},"friend_suggestion",{"micros":59},"connections",{"micros":27},"serialized_read_states",{"micros":8},"pending_payments",{"micros":2},"send_scheduled_deletion_message",{"micros":1},"sanitize_premium_perks",{"micros":1},"guild_join_requests",{"micros":1},"user_guild_settings",{"micros":2},"serialized_private_channels",{"micros":5724},"user_segments",{"micros":5},"experiments",{"micros":12410},"affine_user_ids",{"micros":10646},"required_action",{"micros":4},"authorized_ip_coro",{"micros":1}]}]},"starting_guild_connect",{"micros":33,"calls":[]},"presence_started",{"micros":279,"calls":[]},"guilds_started",{"micros":114,"calls":[]},"guilds_connect",{"micros":65877,"calls":[]},"presence_connect",{"micros":1,"calls":[]},"connect_finished",{"micros":65894,"calls":[]},"build_ready",{"micros":312,"calls":[]},"clean_ready",{"micros":1,"calls":[]},"optimize_ready",{"micros":27,"calls":[]},"split_ready",{"micros":4,"calls":[]}]}]}]',
            ],
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
            private_channels: GatewayClient.Account.AvailableDMs.map(C => C.GatewayDMPackage(GatewayClient.Account)), // group chats and dms
            read_state: {"entries": [], "partial": false, "version": 0}, // not sure what this is (prob unread dms)
            relationships: [ ...GatewayClient.Account.RelationsFrom.map((R) => R.PackageGateway(true, GatewayClient.Account)), ...GatewayClient.Account.RelationsRegarding.map((R) => R.PackageGateway(true, GatewayClient.Account)) ], // friends
            resume_gateway_url: process.env.OverrideWS || "ws://127.0.0.1:6968",
            session_id: GatewayClient.ID,
            session_type: "normal",
            sessions: [], // sessions so you can see the devices to log them out i think
            tutorial: { "indicators_confirmed": [], "indicators_suppressed": false },
            user: GatewayClient.Account.Package(),
            user_guild_settings: {"entries": [], "partial": false, "version": 0}, // guild settings for the user (notifications, etc)
            user_settings_proto: "CgIYAWIJCgcKBWVuLVVT", // idk what this is
            users: [
              ...GatewayClient.Account.AvailableDMs.map(C => C.DMRecipients.filter(U => U.ID !== GatewayClient.Account.ID).map(U => U.PackageSmall())).flat()
            ], // EVERY user in EVERY guild (for searching, mentions, etc)
            v: 9, // api version (fr)
          },
          1,
          "READY"
        );

        SendOp(
          GatewayClient,
          OpCodes.DISPATCH,
          {
            disclose: ["pomelo"], // what
            guilds: [], // embedded_activities array (empty), guild id and voice_states array
            lazy_private_channels: [], // not sure but not needed i think
            merged_members: [], // YOUR member object in every guild (for roles and stuff) same as the other ready merged_members
            merged_presences: { friends: [], guilds: [] }, // presences from friends and guilds
          },
          2,
          "READY_SUPPLEMENTAL"
        );

        break;
      }
    }
  });
});

Msg("Gateway initialized!", "Gateway");
