/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { red } from "colorette";
import { time, timeEnd } from "console";
import { GatewayCapabilities } from "../Classes/GatewayCapabilities";
import { GatewayConnection } from "../Classes/GatewayConnection";
import { OpCodes, GatewayCloseCodes } from "../Classes/GatewayOpCodes";
import { ReadyPacket, ReadySupplementalPacket } from "../Classes/GatewayPackets";
import { Presence } from "../Classes/Presence";
import { GetUserExperiments, GetGuildExperiments } from "../Handlers/Experiments";
import { Connections, RemoveConnection } from "../Handlers/Gateway";
import { VerifyToken, GetTokenUserId } from "../Modules/AuthUtils";
import { RequestGatewayAccount, SendGuildStatusUpdate } from "../Modules/DiscordUtils";
import { CloseConnection, SendOp } from "../Modules/GatewayUtils";
import { Msg } from "../Modules/Logger";

export async function HandleOpcode(UnpackedData: any, GatewayClient: GatewayConnection) {
    time(`identify-${GatewayClient.ID}`);
    const Token = UnpackedData.d.token ?? "";

    if (!(await VerifyToken(Token))) {
        SendOp(GatewayClient, OpCodes.INVALID_SESSION, false);
        CloseConnection(GatewayClient, GatewayCloseCodes.AuthenticationFailed, "Authentication failed.");
        return;
    }

    const ExistingSession = Connections.find((x) => x.Account?.ID === GetTokenUserId(Token));
    if (ExistingSession) {
        if (ExistingSession.ScheduledForRemoval) RemoveConnection(ExistingSession);
        else {
            SendOp(GatewayClient, OpCodes.INVALID_SESSION, false);
            CloseConnection(
                GatewayClient,
                GatewayCloseCodes.AuthenticationFailed,
                "Someone is already logged into that account.",
            );
            return;
        }
    }

    console.log("--- GETTING ACCOUNT");
    GatewayClient.Account = (await RequestGatewayAccount(Token))!;
    GatewayClient.UserToken = Token;
    GatewayClient.PackagedAccount = GatewayClient.Account.Package();

    console.log("--- ACCOUNT GOTTEN");
    const ConnectionIntents = UnpackedData.d.intents ?? 0;
    GatewayClient.Capabilities = UnpackedData.d.capabilities ?? GatewayCapabilities.UNKNOWN;
    GatewayClient.Intents = ConnectionIntents; // TODO: add check for privileged intents

    if (ConnectionIntents == 0 && GatewayClient.Account.Bot) return CloseConnection(GatewayClient, GatewayCloseCodes.InvalidIntents, "Invalid intents");

    Msg(
        `Client ${red(GatewayClient.ID)} identified as ${red(
                        GatewayClient.Account!.Username + "#" + GatewayClient.Account!.Discriminator,
        )} using ${red(UnpackedData.d.properties?.browser ?? "Unknown")}`,
        "Gateway",
    );

    const PresenceSet: Presence = UnpackedData.d.presence?.status ?? Presence.ONLINE;
                GatewayClient.Account!.Presence = PresenceSet;
                SendGuildStatusUpdate(GatewayClient.Account!, PresenceSet);
                await GatewayClient.Account!.save();

                const Guilds = GatewayClient.Account.Memberships.map((M) => M.ToGuild);
                const Memberships = Guilds.map((G) => G.Members);

                console.log("--- SENDING READY DISPATCH");
                // you'd better thank me for adding types --maddie
                SendOp<ReadyPacket>(
                    GatewayClient,
                    OpCodes.DISPATCH,
                    {
                        _trace: [
                            "[\"Dispriv-Gateway\",{\"micros\":189890,\"calls\":[\"id_created\",{\"micros\":735,\"calls\":[]},\"session_lookup_time\",{\"micros\":480,\"calls\":[]},\"session_lookup_finished\",{\"micros\":14,\"calls\":[]},\"discord-sessions-prd-2-73\",{\"micros\":187060,\"calls\":[\"start_session\",{\"micros\":120393,\"calls\":[\"discord-api-785656c5b6-hnsw9\",{\"micros\":112351,\"calls\":[\"get_user\",{\"micros\":23943},\"get_guilds\",{\"micros\":16119},\"user_settings_proto\",{\"micros\":129},\"relationships\",{\"micros\":19935},\"friend_suggestion\",{\"micros\":59},\"connections\",{\"micros\":27},\"serialized_read_states\",{\"micros\":8},\"pending_payments\",{\"micros\":2},\"send_scheduled_deletion_message\",{\"micros\":1},\"sanitize_premium_perks\",{\"micros\":1},\"guild_join_requests\",{\"micros\":1},\"user_guild_settings\",{\"micros\":2},\"serialized_private_channels\",{\"micros\":5724},\"user_segments\",{\"micros\":5},\"experiments\",{\"micros\":12410},\"affine_user_ids\",{\"micros\":10646},\"required_action\",{\"micros\":4},\"authorized_ip_coro\",{\"micros\":1}]}]},\"starting_guild_connect\",{\"micros\":33,\"calls\":[]},\"presence_started\",{\"micros\":279,\"calls\":[]},\"guilds_started\",{\"micros\":114,\"calls\":[]},\"guilds_connect\",{\"micros\":65877,\"calls\":[]},\"presence_connect\",{\"micros\":1,\"calls\":[]},\"connect_finished\",{\"micros\":65894,\"calls\":[]},\"build_ready\",{\"micros\":312,\"calls\":[]},\"clean_ready\",{\"micros\":1,\"calls\":[]},\"optimize_ready\",{\"micros\":27,\"calls\":[]},\"split_ready\",{\"micros\":4,\"calls\":[]}]}]}]",
                        ],
                        analytics_token: Token,
                        api_code_version: 1,
                        connected_accounts: [], // TODO
                        consents: { personalization: { consented: true } },
                        country_code: "US",
                        application: GatewayClient.Account.BotApplication ? GatewayClient.Account.BotApplication.Package() : undefined,
                        experiments: GetUserExperiments(GatewayClient.Account),
                        friend_suggestion_count: 0,
                        geo_ordered_rtc_regions: ["dispriv"],
                        guild_experiments: GetGuildExperiments(),
                        guild_join_requests: [], // PENDING guilds (those ones when you click on discovery)
                        guilds: GatewayClient.Account!.Memberships.map((M) =>
                            M.ToGuild.GatewayPackage(GatewayClient.Account!),
                        ),
                        merged_members: GatewayClient.HasCapability(GatewayCapabilities.PRIORITIZED_READY_PAYLOAD) ? GatewayClient.Account!.Memberships.map((M) => M.PackageGateway()) : [
                            ...GatewayClient.Account!.Memberships.map((M) => M.PackageGateway()),
                            ...GatewayClient.Account!.Memberships.map((M) =>
                                M.ToGuild.Members.map((M) => M.PackageGateway()),
                            ).flat(),
                        ],
                        merged_presences: GatewayClient.HasCapability(GatewayCapabilities.PRIORITIZED_READY_PAYLOAD) ? {
                            friends: [],
                            guilds: Memberships.map((M) =>
                                M.map((M) => M.Owner).map((U) => ({
                                    user_id: U.ID,
                                    status: U.Presence,
                                    client_status: {
                                        web: U.Presence,
                                    },
                                    broadcast: null,
                                    activities: [],
                                })),
                            ),
                        }  : undefined,   // 6 When using the DEDUPE_USER_OBJECTS Gateway capability, presences, as well as each guild's presences array, is replaced by merged_presences. In addition, each guild's members array will be collapsed into merged_members. Finally, the users array will contain the user objects for every user in the event. Any user object in the event will be omitted, with an ID left in its place (e.g. user_id in member objects, recipient_ids in private channel objects, etc.).
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
                        resume_gateway_url: process.env.OverrideWS || "ws://localhost:6968",
                        session_id: GatewayClient.ID,
                        session_type: "normal",
                        sessions: [], // sessions so you can see the devices to log them out i think
                        tutorial: {
                            indicators_confirmed: GatewayClient.Account!.TutorialReadIndicators,
                            indicators_suppressed: GatewayClient.Account!.TutorialSuppressed,
                        },
                        user: GatewayClient.Account!.Package(),
                        user_guild_settings: { entries: [], partial: false, version: 0 }, // guild settings for the user (notifications, etc)
                        user_settings: !GatewayClient.HasCapability(GatewayCapabilities.USER_SETTINGS_PROTO) ? GatewayClient.Account!.Settings : undefined, // settings of the client
                        user_settings_proto: GatewayClient.HasCapability(GatewayCapabilities.USER_SETTINGS_PROTO) ? GatewayClient.Account!.SettingsProto[0] : undefined, // settings of the client
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
                        auth_token: GatewayClient.HasCapability(GatewayCapabilities.AUTH_TOKEN_REFRESH) ? GatewayClient.UserToken : undefined,
                        v: 9, // api version (fr)
                    },
                    1,
                    "READY",
                );

                console.log("--- CLIENT READY'IED");

                if (GatewayClient.Account.Bot) // Guild and etc
                {
                    console.log("--- SENDING AVAILABLE GUILDS TO BOT CLIENT");
                    const Guilds = GatewayClient.Account!.Memberships.map((M) => M.ToGuild.GatewayPackage(GatewayClient.Account!));

                    if (!Guilds) return;

                    Guilds.forEach((G) => {
                        SendOp(GatewayClient, OpCodes.DISPATCH, G, 1, "GUILD_CREATE");
                    });
                    
                    console.log("--- SENT GUILDS TO BOT CLIENT");
                }

                if (!GatewayClient.HasCapability(GatewayCapabilities.PRIORITIZED_READY_PAYLOAD)) return;

                //console.log(GatewayClient.Account!.Memberships[0].ToGuild);
                console.log("--- SENDING READY_SUPPLEMENTAL DISPATCH");
                SendOp<ReadySupplementalPacket>(
                    GatewayClient,
                    OpCodes.DISPATCH,
                    {
                        disclose: ["pomelo"], // username system?
                        guilds: GatewayClient.Account!.Memberships.map((M) => M.ToGuild.GatewaySupplementalPackage()), // embedded_activities array (empty), guild id and voice_states array
                        lazy_private_channels: [], // list of channels to lazy-load (member access related, ig?)
                        merged_members: [
                            ...GatewayClient.Account!.Memberships.map((M) =>
                                M.ToGuild.Members.map((M) => M.PackageGateway()),
                            ).flat(),
                        ], // OTHER members object in every guild (for roles and stuff)
                        merged_presences: {
                            friends: [],
                            guilds: Memberships.map((M) =>
                                M.map((M) => M.Owner).map((U) => ({
                                    user_id: U.ID,
                                    status: U.Presence,
                                    client_status: {
                                        web: U.Presence,
                                    },
                                    broadcast: null,
                                    activities: [],
                                })),
                            ),
                        }, // presences from friends and guilds
                    },
                    2,
                    "READY_SUPPLEMENTAL",
                );
                console.log("--- CLIENT READY'IED (SUPPLEMENTAL)");
                timeEnd(`identify-${GatewayClient.ID}`);
}