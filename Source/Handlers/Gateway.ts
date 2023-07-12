/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { WebSocketServer } from "ws";
import { unpack } from "erlpack";
import { Msg } from "../Modules/Logger";
import { GatewayConnection } from "../Classes/GatewayConnection";
import { GatewayCloseCodes, OpCodes } from "../Classes/GatewayOpCodes";
import { CloseConnection, ReplayMissedPackets, SendOp } from "../Modules/GatewayUtils";
import { GetTokenUserId, GetUserByToken, VerifyToken } from "../Modules/AuthUtils";
import { URLSearchParams } from "url";
import { Presence } from "../Classes/Presence";
import { SendGuildMemberUpdate, SendToDMOrServer, SendToMembers } from "../Modules/DiscordUtils";
import { time, timeEnd } from "console";
import { gray, green, red } from "colorette";
import { Channel, ChannelType } from "../Entities/Channel";
import { VoiceSessions } from "./RTCSocket";
import bcrypt from "bcrypt";
import {
    HelloPacket,
    ReadyPacket,
    ReadySupplementalPacket,
    SpeedTestCreatePacket,
    SpeedTestDeletePacket,
    SpeedTestServerUpdatePacket,
    VoiceServerUpdatePacket,
} from "../Classes/GatewayPackets";

const Socket = new WebSocketServer({
    port: parseInt(process.env.WSPORT) || 6968,
});

export const Connections: GatewayConnection[] = [];

function RemoveConnection(Conn: GatewayConnection) {
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
            if (!GatewayClient.ScheduledForRemoval)
                return; // client resumed the connection in time

            RemoveConnection(GatewayClient);
        }, 120 * 1000);
    });

    SendOp<HelloPacket>(GatewayClient, OpCodes.HELLO, {
        heartbeat_interval: 41250, // eslint-disable-next-line quotes
        _trace: ['["Dispriv-Gateway",{"micros":0.0}]'],
    });

    Client.on("message", async (Data: Buffer) => {
        const UnpackedData = GatewayClient.Encoding === "etf" ? unpack(Data) : JSON.parse(Data.toString());
        Msg(`Received packet from client ${red(GatewayClient.ID)}: ${JSON.stringify(UnpackedData)}`, "Gateway");
        switch (UnpackedData.op) {
            case OpCodes.HEARTBEAT:
                return SendOp(GatewayClient, OpCodes.HEARTBEAT_ACK);

            case OpCodes.PRESENCE_UPDATE:
                if (!GatewayClient.Account!)
                    return CloseConnection(GatewayClient, GatewayCloseCodes.NotAuthenticated, "Not authenticated");

                switch (UnpackedData.d.status) {
                    case "online":
                        GatewayClient.Account!.Presence = Presence.ONLINE;
                        break;
                    case "idle":
                        GatewayClient.Account!.Presence = Presence.IDLE;
                        break;
                    case "dnd":
                        GatewayClient.Account!.Presence = Presence.DND;
                        break;
                    case "invisible":
                        GatewayClient.Account!.Presence = Presence.INVISIBLE;
                        break;
                }

                await GatewayClient.Account!.save();

                SendGuildMemberUpdate(GatewayClient.Account!);
                break;

            case OpCodes.CLIENT_SPEEDTEST_CREATE:
                if (!GatewayClient.Account!)
                    return CloseConnection(GatewayClient, GatewayCloseCodes.NotAuthenticated, "Not authenticated");
                SendOp<SpeedTestCreatePacket>(
                    GatewayClient,
                    OpCodes.DISPATCH,
                    {
                        paused: false,
                        region: "us-south",
                        rtc_server_id: "1",
                        stream_key: "test:" + GatewayClient.Account!.ID,
                        stream_server_id: "1",
                        viewer_ids: [],
                    },
                    null,
                    "SPEED_TEST_CREATE",
                );
                SendOp<SpeedTestServerUpdatePacket>(
                    GatewayClient,
                    OpCodes.DISPATCH,
                    {
                        endpoint: "127.0.0.1:" + process.env.RTCWSPORT || "6967",
                        guild_id: undefined,
                        stream_key: "test:" + GatewayClient.Account!.ID,
                        token: GatewayClient.UserToken,
                    },
                    null,
                    "SPEED_TEST_SERVER_UPDATE",
                );
                break;

            case OpCodes.EMBEDDED_ACTIVITY_DELETE: {
                if (!GatewayClient.Account!)
                    return CloseConnection(GatewayClient, GatewayCloseCodes.NotAuthenticated, "Not authenticated");

                const GuildID = UnpackedData.d.guild_id;
                const ChannelID = UnpackedData.d.channel_id;
                const ApplicationID = UnpackedData.d.application_id;

                if (!GuildID || !ChannelID || !ApplicationID) return;

                const VoiceSession = VoiceSessions.find((S) => S.guild_id === GuildID && S.channel_id === ChannelID);
                if (!VoiceSession) return;

                const Activity = VoiceSession.Activities.find(
                    (A) => A.embedded_activity.application_id === ApplicationID,
                );

                if (!Activity) return;

                const ActivityUser = Activity.users.find((U) => U === GatewayClient.Account!.ID);

                if (!ActivityUser) return;

                const LinkedChannel = await Channel.findOne({
                    where: { ID: ChannelID },
                    relations: { OwnerGuild: true },
                });

                if (!LinkedChannel) return;

                if (Activity.users.length === 1) {
                    Msg(
                        `Deleting activity ${red(Activity.embedded_activity.name)} from session ${red(
                            VoiceSession.guild_id,
                        )}:${red(VoiceSession.channel_id)}`,
                        "Activities",
                    );

                    await SendToDMOrServer(
                        LinkedChannel,
                        OpCodes.DISPATCH,
                        {
                            channel_id: ChannelID,
                            connections: [],
                            embedded_activity: { application_id: ApplicationID },
                            guild_id: GuildID,
                            update_code: 3,
                            users: [],
                        },
                        null,
                        "EMBEDDED_ACTIVITY_UPDATE",
                    );

                    VoiceSession.Activities.splice(VoiceSession.Activities.indexOf(Activity), 1);
                    break;
                }

                const UserConnection = Activity.connections.find((C) => C.user_id === GatewayClient.Account!.ID)!;

                Activity.users.splice(Activity.users.indexOf(ActivityUser), 1);
                Activity.connections.splice(Activity.connections.indexOf(UserConnection), 1);

                Activity.update_code = 5;

                await SendToDMOrServer(LinkedChannel, OpCodes.DISPATCH, Activity, null, "EMBEDDED_ACTIVITY_UPDATE");

                break;
            }

            case OpCodes.VOICE_STATE_UPDATE: {
                if (!GatewayClient.Account!)
                    return CloseConnection(GatewayClient, GatewayCloseCodes.NotAuthenticated, "Not authenticated");

                // {"op":4,"d":{"guild_id":null,"channel_id":null,"self_mute":true,"self_deaf":false,"self_video":false,"flags":0}}
                // {"op":4,"d":{"guild_id":"1119711696458481664","channel_id":"1120028684745572352","self_mute":true,"self_deaf":false,"self_video":false,"flags":2}}
                const ChannelID = UnpackedData.d.channel_id;
                const GuildID = UnpackedData.d.guild_id;

                if (GuildID && ChannelID) {
                    const UserMembership = GatewayClient.Account!.Memberships.find((M) => M.ToGuild.ID === GuildID);
                    if (!UserMembership) return;

                    const Guild = UserMembership.ToGuild;

                    const LinkedChannel = Guild.Channels.find((C) => C.ID === ChannelID);
                    if (!LinkedChannel) return;

                    if (LinkedChannel.Type != ChannelType.GUILD_VOICE) return;

                    // add permissions to check if can connect to voice channel

                    const VoiceSession = VoiceSessions.find(
                        (S) => S.guild_id === GuildID && S.channel_id === ChannelID,
                    );

                    const VoiceState = {
                        channel_id: ChannelID,
                        deaf: UserMembership.Deafened,
                        guild_id: GuildID,
                        mute: UserMembership.Muted,
                        request_to_speak_timestamp: null,
                        self_deaf: UnpackedData.d.self_deaf,
                        self_mute: UnpackedData.d.self_mute,
                        self_video: UnpackedData.d.self_video,
                        session_id: GatewayClient.ID,
                        suppress: false,
                        user_id: GatewayClient.Account!.ID,
                        member: UserMembership.PackageGatewayVoice(),
                    };

                    if (VoiceSession) {
                        if (
                            VoiceSession.voice_states.some(
                                (state) =>
                                    state.user_id === GatewayClient.Account!.ID &&
                                    state.session_id === GatewayClient.ID,
                            )
                        ) {
                            // user is already in the voice session, edit muted and deaf (self)
                            const UserVoiceState = VoiceSession.voice_states.find(
                                (state) => state.user_id === GatewayClient.Account!.ID,
                            );
                            UserVoiceState!.self_mute = UnpackedData.d.self_mute;
                            UserVoiceState!.self_deaf = UnpackedData.d.self_deaf;
                            UserVoiceState!.self_video = UnpackedData.d.self_video;

                            await SendToMembers(GuildID, OpCodes.DISPATCH, VoiceState, null, "VOICE_STATE_UPDATE");

                            return;
                        } else if (
                            VoiceSession.voice_states.some(
                                (state) =>
                                    state.user_id === GatewayClient.Account!.ID && state.session_id != GatewayClient.ID,
                            )
                        ) {
                            // user is in another client, remove old client
                            const UserVoiceState = VoiceSession.voice_states.find(
                                (state) => state.user_id === GatewayClient.Account!.ID,
                            );
                            VoiceSession.voice_states.splice(VoiceSession.voice_states.indexOf(UserVoiceState!), 1);

                            await SendToMembers(GuildID, OpCodes.DISPATCH, VoiceState, null, "VOICE_STATE_UPDATE");
                        }

                        Msg(
                            `Connecting User ${red(GatewayClient.Account!.Username)} to voice channel ${red(
                                LinkedChannel.DisplayName,
                            )} in guild ${red(Guild.Name)}`,
                            "Voice",
                        );
                        VoiceSession.voice_states.push(VoiceState);

                        await SendToMembers(GuildID, OpCodes.DISPATCH, VoiceState, null, "VOICE_STATE_UPDATE");
                        SendOp<VoiceServerUpdatePacket>(
                            GatewayClient,
                            OpCodes.DISPATCH,
                            {
                                endpoint: "rotterdam11006.discord.media:443",
                                guild_id: GuildID,
                                token: bcrypt.hashSync(
                                    `${GuildID}-${GatewayClient.Account!.ID}-${GatewayClient.ID}-${
                                        GatewayClient.Account!.Password
                                    }`,
                                    10,
                                ),
                            },
                            null,
                            "VOICE_SERVER_UPDATE",
                        );
                    } else {
                        Msg(
                            `Creating new voice session for guild ${red(Guild.Name)} in channel ${red(
                                LinkedChannel.DisplayName,
                            )}`,
                            "Voice",
                        );

                        VoiceSessions.push({
                            channel_id: ChannelID,
                            guild_id: GuildID,
                            voice_states: [VoiceState],
                            ConnectedVoiceClients: [],
                            Activities: [],
                        });

                        await SendToMembers(GuildID, OpCodes.DISPATCH, VoiceState, null, "VOICE_STATE_UPDATE");
                        SendOp<VoiceServerUpdatePacket>(
                            GatewayClient,
                            OpCodes.DISPATCH,
                            {
                                endpoint: "rotterdam11006.discord.media:443",
                                guild_id: GuildID,
                                token: bcrypt.hashSync(
                                    `${GuildID}-${GatewayClient.Account!.ID}-${GatewayClient.ID}-${
                                        GatewayClient.Account!.Password
                                    }`,
                                    10,
                                ),
                            },
                            null,
                            "VOICE_SERVER_UPDATE",
                        );
                    }
                } else if (
                    !GuildID &&
                    !ChannelID &&
                    VoiceSessions.some((S) =>
                        S.voice_states.some((state) => state.user_id === GatewayClient.Account!.ID),
                    )
                ) {
                    const VoiceSession = VoiceSessions.find((S) =>
                        S.voice_states.some((state) => state.user_id === GatewayClient.Account!.ID),
                    )!;

                    const VoiceState = VoiceSession.voice_states.find(
                        (state) => state.user_id === GatewayClient.Account!.ID,
                    );

                    if (!VoiceState) return;

                    VoiceSession.voice_states.splice(VoiceSession.voice_states.indexOf(VoiceState), 1);

                    VoiceState.channel_id = null;

                    await SendToMembers(VoiceState.guild_id, OpCodes.DISPATCH, VoiceState, null, "VOICE_STATE_UPDATE");

                    if (VoiceSession.voice_states.length === 0) {
                        
                        const LinkedChannel = await Channel.findOne({
                            where: { ID: VoiceSession.channel_id },
                            relations: { OwnerGuild: true },
                        });

                        if (!LinkedChannel) return;

                        VoiceSession.Activities.forEach(async (Activity) => {
                            VoiceSession.Activities.splice(VoiceSession.Activities.indexOf(Activity), 1);
                            await SendToDMOrServer(
                                LinkedChannel,
                                OpCodes.DISPATCH,
                                {
                                    channel_id: Activity.channel_id,
                                    connections: [],
                                    embedded_activity: { application_id: Activity.embedded_activity.application_id },
                                    guild_id: Activity.guild_id,
                                    update_code: 3,
                                    users: [],
                                },
                                null,
                                "EMBEDDED_ACTIVITY_UPDATE",
                            );
                        });
                        
                        VoiceSessions.splice(VoiceSessions.indexOf(VoiceSession), 1);
                    }
                }

                break;
            }

            case OpCodes.REQUEST_GUILD_MEMBERS:
                break;

            case OpCodes.CLIENT_SPEEDTEST_DELETE:
                if (!GatewayClient.Account!)
                    return CloseConnection(GatewayClient, GatewayCloseCodes.NotAuthenticated, "Not authenticated");
                SendOp<SpeedTestDeletePacket>(
                    GatewayClient,
                    OpCodes.DISPATCH,
                    { reason: "user_requested", stream_key: "test:" + GatewayClient.Account!.ID },
                    null,
                    "SPEED_TEST_DELETE",
                );
                break;

            case OpCodes.RESUME: {
                const Token = UnpackedData.d.token ?? "";
                try {
                    if (!(await VerifyToken(Token)))
                        throw new Error("Invalid token"); // no doubling up the code when you can just throw an error

                    if (typeof UnpackedData.d.session_id !== "string")
                        throw new Error("Invalid session");

                    if (typeof UnpackedData.d.seq !== "number")
                        throw new Error("Invalid seq");
                } catch (e) {
                    SendOp(GatewayClient, OpCodes.INVALID_SESSION, false);

                    const er = (e as Error).message.split(" ")[1].toLowerCase();
                    const CloseCode = er === "token" || er === "session" ?
                        GatewayCloseCodes.AuthenticationFailed : er === "seq" ?
                        GatewayCloseCodes.InvalidSeq :
                        GatewayCloseCodes.UnknownError;

                    CloseConnection(GatewayClient, CloseCode, "Authentication failed.");
                    return;
                }

                const Session = UnpackedData.d.session_id ?? "";
                const NewGtCl = Connections.find(x =>
                    x.ScheduledForRemoval
                    && x.ID === Session
                    && x.Account?.ID === GetTokenUserId(Token));

                if (!NewGtCl)
                {
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

                SendOp(GatewayClient, OpCodes.DISPATCH, {
                    _trace: [
                        // eslint-disable-next-line quotes
                        '["Dispriv-Gateway",{"micros":189890,"calls":["id_created",{"micros":735,"calls":[]},"session_lookup_time",{"micros":480,"calls":[]},"session_lookup_finished",{"micros":14,"calls":[]},"discord-sessions-prd-2-73",{"micros":187060,"calls":["start_session",{"micros":120393,"calls":["discord-api-785656c5b6-hnsw9",{"micros":112351,"calls":["get_user",{"micros":23943},"get_guilds",{"micros":16119},"user_settings_proto",{"micros":129},"relationships",{"micros":19935},"friend_suggestion",{"micros":59},"connections",{"micros":27},"serialized_read_states",{"micros":8},"pending_payments",{"micros":2},"send_scheduled_deletion_message",{"micros":1},"sanitize_premium_perks",{"micros":1},"guild_join_requests",{"micros":1},"user_guild_settings",{"micros":2},"serialized_private_channels",{"micros":5724},"user_segments",{"micros":5},"experiments",{"micros":12410},"affine_user_ids",{"micros":10646},"required_action",{"micros":4},"authorized_ip_coro",{"micros":1}]}]},"starting_guild_connect",{"micros":33,"calls":[]},"presence_started",{"micros":279,"calls":[]},"guilds_started",{"micros":114,"calls":[]},"guilds_connect",{"micros":65877,"calls":[]},"presence_connect",{"micros":1,"calls":[]},"connect_finished",{"micros":65894,"calls":[]},"build_ready",{"micros":312,"calls":[]},"clean_ready",{"micros":1,"calls":[]},"optimize_ready",{"micros":27,"calls":[]},"split_ready",{"micros":4,"calls":[]}]}]}]',
                    ]
                }, null, "RESUMED");

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

            case OpCodes.IDENTIFY: {
                time(`identify-${GatewayClient.ID}`);
                const Token = UnpackedData.d.token ?? "";

                if (!(await VerifyToken(Token)))
                {
                    SendOp(GatewayClient, OpCodes.INVALID_SESSION, false);
                    CloseConnection(GatewayClient, GatewayCloseCodes.AuthenticationFailed, "Authentication failed.");
                    return;
                }

                const ExistingSession = Connections.find(x => x.Account?.ID === GetTokenUserId(Token));
                if (ExistingSession) {
                    if (ExistingSession.ScheduledForRemoval)
                        RemoveConnection(ExistingSession);
                    else
                    {
                        SendOp(GatewayClient, OpCodes.INVALID_SESSION, false);
                        CloseConnection(GatewayClient, GatewayCloseCodes.AuthenticationFailed, "Someone is already logged into that account.");
                        return;
                    }
                }

                console.log("--- GETTING ACCOUNT");
                GatewayClient.Account = (await GetUserByToken(Token, {
                    Memberships: {
                        Owner: false,
                        ToGuild: {
                            Members: {
                                Owner: true,
                            },
                            Channels: {
                                OwnerCategory: true
                            },
                        },
                    },
                    AvailableDMs: {
                        DMRecipients: true,
                    },
                    RelationsFrom: {
                        From: true,
                        Regarding: true
                    },
                    RelationsRegarding: {
                        From: true,
                        Regarding: true
                    },
                }))!;
                GatewayClient.UserToken = Token;
                GatewayClient.PackagedAccount = GatewayClient.Account.Package();
				
                console.log("--- ACCOUNT GOTTEN");
                const ConnectionIntents = UnpackedData.d.intents ?? 0;
                GatewayClient.Intents = ConnectionIntents; // TODO: add check for privileged intents

                Msg(
                    `Client ${red(GatewayClient.ID)} identified as ${red(
                        GatewayClient.Account!.Username + "#" + GatewayClient.Account!.Discriminator,
                    )}`,
                    "Gateway",
                );

                const PresenceSet = UnpackedData.d.presence.status ?? Presence.ONLINE;
                GatewayClient.Account!.Presence = PresenceSet;

                await GatewayClient.Account!.save();

                console.log("--- SENDING READY DISPATCH");
                // you'd better thank me for adding types --maddie
                SendOp<ReadyPacket>(
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
                        experiments: [
                            [3471124138, 0, 1, -1, 0, 0, 0]
                        ], // TODO (if u want lol)
                        friend_suggestion_count: 0,
                        geo_ordered_rtc_regions: ["dispriv"],
                        guild_experiments: [], // TODO (also if you want)
                        guild_join_requests: [], // PENDING guilds (those ones when you click on discovery)
                        guilds: GatewayClient.Account!.Memberships.map((M) =>
                            M.ToGuild.GatewayPackage(GatewayClient.Account!),
                        ),
                        merged_members: GatewayClient.Account!.Memberships.map((M) => M.PackageGateway()), // YOUR member object in every guild (for roles and stuff)
                        private_channels: GatewayClient.Account!.AvailableDMs.map((C) =>
                            C.GatewayDMPackage(GatewayClient.Account!),
                        ), // group chats and dms
                        read_state: { entries: [], partial: false, version: 0 }, // not sure what this is (prob unread dms)
                        relationships: [
                            ...GatewayClient.Account!.RelationsFrom.map((R) =>
                                R.PackageGateway(true, GatewayClient.Account!),
                            ),
                            ...GatewayClient.Account!.RelationsRegarding.map((R) =>
                                R.PackageGateway(true, GatewayClient.Account!),
                            ),
                        ], // friends
                        resume_gateway_url: process.env.OverrideWS || "ws://127.0.0.1:6968",
                        session_id: GatewayClient.ID,
                        session_type: "normal",
                        sessions: [], // sessions so you can see the devices to log them out i think
                        tutorial: {
                            indicators_confirmed: GatewayClient.Account!.TutorialReadIndicators,
                            indicators_suppressed: GatewayClient.Account!.TutorialSuppressed,
                        },
                        user: GatewayClient.Account!.Package(),
                        user_guild_settings: { entries: [], partial: false, version: 0 }, // guild settings for the user (notifications, etc)
                        user_settings_proto: GatewayClient.Account!.SettingsProto[0], // settings of the client
                        users: [
                            GatewayClient.Account!.PackageSmall(),
                            ...GatewayClient.Account!.AvailableDMs.map((C) =>
                                C.DMRecipients!.filter((U) => U.ID !== GatewayClient.Account!.ID).map((U) =>
                                    U.PackageSmall(),
                                ),
                            ).flat(),
                            ...GatewayClient.Account!.Memberships.map((M) =>
                                M.ToGuild.Members.map((M) => M.Owner.PackageSmall()),
                            ).flat(),
                        ], // EVERY user in EVERY guild (for searching, mentions, etc)
                        v: 9, // api version (fr)
                    },
                    1,
                    "READY",
                );

                //console.log(GatewayClient.Account!.Memberships[0].ToGuild);
                console.log("--- SENDING READY_SUPPLIMENTAL DISPATCH");
                SendOp<ReadySupplementalPacket>(
                    GatewayClient,
                    OpCodes.DISPATCH,
                    {
                        disclose: ["pomelo"], // username system?
                        guilds: GatewayClient.Account!.Memberships.map((M) => M.ToGuild.GatewaySupplementalPackage()), // embedded_activities array (empty), guild id and voice_states array
                        lazy_private_channels: [], // not sure but not needed i think
                        merged_members: [
                            ...GatewayClient.Account!.Memberships.map((M) =>
                                M.ToGuild.Members.map((M) => M.PackageGateway()),
                            ).flat(),
                        ], // OTHER members object in every guild (for roles and stuff)
                        merged_presences: { friends: [], guilds: [] }, // presences from friends and guilds
                    },
                    2,
                    "READY_SUPPLEMENTAL",
                );
                console.log("--- CLIENT READY'IED");
                timeEnd(`identify-${GatewayClient.ID}`);
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
