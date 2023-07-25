/* eslint-disable no-unused-vars */
import MurmurHash3 from "murmurhash3js";
import { Message } from "../Entities/Message";
import { Channel, ChannelType } from "../Entities/Channel";
import { DispatchType, FindConnection, HasIntent, SendOp } from "./GatewayUtils";
import { GatewayIntents } from "../Classes/GatewayIntents";
import { OpCodes } from "../Classes/GatewayOpCodes";
import { Guild, Role } from "../Entities/Guild";
import { Membership, User } from "../Entities/User";
import { Permissions } from "../Classes/Flags";
import { VoiceSessions } from "../Handlers/RTCSocket";
import { Presence } from "../Classes/Presence";
import { GetUserByToken } from "./AuthUtils";
import { SKU, SubscriptionPlan } from "../Entities/Gift";
import { DiscordApplication } from "../Entities/Application";
import { GenerateSnowflake } from "./SnowflakeUtils";

export const DISCORD_EPOCH = 1420070400000;
export const NitroSubs = ["978380692553465866", "1024422698568122368", "511651876987469824", "511651871736201216", "642251038925127690", "511651880837840896", "511651885459963904", "944037208325619722"];
export const NitroClassic = ["511651876987469824", "511651871736201216"];
export const NitroBasic = ["978380692553465866", "1024422698568122368"];
export const NitroPremium = ["511651880837840896", "511651885459963904", "944037208325619722", "642251038925127690"];

export enum NitroType {
    NONE, // Deprecated
    NITRO_CLASSIC,
    NITRO,
    NITRO_BASIC
}

export function CreateTimestamp(DateToConvert?: Date) {
    // Creates a timestamp in ISO 8601 format (Discord uses timezone offset +00:00)
    const NewDate = DateToConvert ?? new Date();
    const IsoStringInUTC = NewDate.toISOString().replace("Z", "+00:00");
    return IsoStringInUTC;
}

export function GenerateExperimentHash(Name: string): number {
    const Hash = MurmurHash3.x86.hash32(Name);
    return Hash >>> 0;
}

export function RequestGatewayAccount(Token: string) {
    return GetUserByToken(Token, {
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
        RelationsFrom: {
            From: true,
            Regarding: true,
        },
        RelationsRegarding: {
            From: true,
            Regarding: true,
        },
        Subscriptions: true
    });
}

export async function HasPermission(Usr: Membership, Permission: Permissions) {
    const HR = GetHighestRole(Usr);

    //    if (Usr.ToGuild.Owner.ID === Usr.Owner.ID) return true;

    if ((HR.Permissions & Permissions.ADMINISTRATOR) === Permissions.ADMINISTRATOR) return true;

    return (HR.Permissions & Permission) === Permission;
}

export function MembershipFromGuild(Usr: User, Server: Guild) {
    return Usr.Memberships.find((x) => x.ToGuild.ID === Server.ID);
}

export function GetHighestRoleInArr(R: Role[]) {
    return R.reduce((A, B) => (A.Position > B.Position ? A : B));
}

export function GetHighestRole(Usr: Membership) {
    return GetHighestRoleInArr(Usr.Roles);
}

export async function SyncMemberList(Guild: Guild) {
    const OnlineMembers = SortUsers(
        Guild.Members.filter(
            (x) =>
                x.Owner.Presence === Presence.ONLINE ||
                x.Owner.Presence === Presence.IDLE ||
                x.Owner.Presence === Presence.DND,
        ),
    );
    const OfflineMembers = SortUsers(
        Guild.Members.filter(
            (x) =>
                x.Owner.Presence !== Presence.ONLINE &&
                x.Owner.Presence !== Presence.IDLE &&
                x.Owner.Presence !== Presence.DND,
        ),
    );
    Guild.Members.map((M) => M.Owner)
        .map((U) => FindConnection(U.ID))
        .forEach((C) =>
            C
                ? SendOp(
                    C,
                    OpCodes.DISPATCH,
                    {
                        ops: [
                            {
                                range: [0, 99],
                                op: "SYNC",
                                items: [
                                    {
                                        group: {
                                            id: "online",
                                            count: OnlineMembers.length,
                                        },
                                    },
                                    ...OnlineMembers.map((m) => ({
                                        member: m.Package(),
                                    })),
                                    {
                                        group: {
                                            id: "offline",
                                            count: OfflineMembers.length,
                                        },
                                    },
                                    ...OfflineMembers.map((m) => ({
                                        member: m.Package(),
                                    })),
                                ],
                            },
                        ],
                        online_count: OnlineMembers.length,
                        member_count: Guild.Members.length,
                        id: "everyone",
                        guild_id: Guild.ID,
                        groups: [
                            {
                                id: "online",
                                count: OnlineMembers.length,
                            },
                            {
                                id: "offline",
                                count: OfflineMembers.length,
                            },
                        ],
                    },
                    null,
                    "GUILD_MEMBER_LIST_UPDATE",
                )
                : null,
        );
}

export function CreateDefaultSubscriptions()
{
    DiscordApplication.create({
        ID: "521842831262875670",
        DisplayName: "Nitro",
        IsHook: true,
        Flags: 0,
        Summary: ""
    }).save();

    SubscriptionPlan.create({
        ID: "978380692553465866",
        SKUID: "978380684370378762",
        Name: "Nitro Basic Monthly",
        Interval: 1,
        IntervalCount: 1,
        Price: 0,
        TaxInclusive: true
    }).save();

    SubscriptionPlan.create({
        ID: "1024422698568122368",
        SKUID: "978380684370378762",
        Name: "Nitro Basic Yearly",
        Interval: 1,
        IntervalCount: 1,
        Price: 0,
        TaxInclusive: true
    }).save();

    SubscriptionPlan.create({
        ID: "511651876987469824",
        SKUID: "521846918637420545",
        Name: "Nitro Classic Yearly",
        Interval: 1,
        IntervalCount: 1,
        Price: 0,
        TaxInclusive: true
    }).save();

    SubscriptionPlan.create({
        ID: "511651871736201216",
        SKUID: "521846918637420545",
        Name: "Nitro Classic Monthly",
        Interval: 1,
        IntervalCount: 1,
        Price: 0,
        TaxInclusive: true
    }).save();

    SubscriptionPlan.create({
        ID: "642251038925127690",
        SKUID: "521847234246082599",
        Name: "Nitro 3 Month",
        Interval: 1,
        IntervalCount: 1,
        Price: 0,
        TaxInclusive: true
    }).save();

    SubscriptionPlan.create({
        ID: "511651880837840896",
        SKUID: "521847234246082599",
        Name: "Nitro Monthly",
        Interval: 1,
        IntervalCount: 1,
        Price: 0,
        TaxInclusive: true
    }).save();

    SubscriptionPlan.create({
        ID: "511651885459963904",
        SKUID: "521847234246082599",
        Name: "Nitro Yearly",
        Interval: 1,
        IntervalCount: 1,
        Price: 0,
        TaxInclusive: true
    }).save();

    SubscriptionPlan.create({
        ID: "944037208325619722",
        SKUID: "521847234246082599",
        Name: "Nitro 6 Month",
        Interval: 1,
        IntervalCount: 1,
        Price: 0,
        TaxInclusive: true
    }).save();

    SubscriptionPlan.create({
        ID: "590665532894740483",
        SKUID: "590663762298667008",
        Name: "Server Boost Monthly",
        Interval: 1,
        IntervalCount: 1,
        Price: 0,
        TaxInclusive: true
    }).save();

    SubscriptionPlan.create({
        ID: "590665538238152709",
        SKUID: "590663762298667008",
        Name: "Server Boost Yearly",
        Interval: 1,
        IntervalCount: 1,
        Price: 0,
        TaxInclusive: true
    }).save();

    SubscriptionPlan.create({
        ID: "944037355453415424",
        SKUID: "590663762298667008",
        Name: "Server Boost 3 Month",
        Interval: 1,
        IntervalCount: 1,
        Price: 0,
        TaxInclusive: true
    }).save();

    SubscriptionPlan.create({
        ID: "944037391444738048",
        SKUID: "590663762298667008",
        Name: "Server Boost 6 Month",
        Interval: 1,
        IntervalCount: 1,
        Price: 0,
        TaxInclusive: true
    }).save();

    SKU.create({
        ID: "978380684370378762"
    }).save();

    SKU.create({
        ID: "521846918637420545"
    }).save();

    SKU.create({
        ID: "521847234246082599"
    }).save();

    SKU.create({
        ID: "590663762298667008"
    }).save();
}

export async function UpdateMemberList(Guild: Guild, Member: Membership) {
    const OnlineMembers = SortUsers(
        Guild.Members.filter(
            (x) =>
                x.Owner.Presence === Presence.ONLINE ||
                x.Owner.Presence === Presence.IDLE ||
                x.Owner.Presence === Presence.DND,
        ),
    );
    const OfflineMembers = SortUsers(
        Guild.Members.filter(
            (x) =>
                x.Owner.Presence !== Presence.ONLINE &&
                x.Owner.Presence !== Presence.IDLE &&
                x.Owner.Presence !== Presence.DND,
        ),
    );
    Guild.Members.map((M) => M.Owner)
        .map((U) => FindConnection(U.ID))
        .forEach((C) =>
            C
                ? SendOp(
                    C,
                    OpCodes.DISPATCH,
                    {
                        ops: [
                            {
                                op: "UPDATE",
                                item: {
                                    member: {
                                        ...Member.Package(),
                                        presence: {
                                            user: {
                                                id: Member.Owner.ID,
                                            },
                                            status: Member.Owner.Presence,
                                            client_status: {
                                                web: Member.Owner.Presence,
                                            },
                                            broadcast: null,
                                            activities: [],
                                        },
                                    },
                                },
                                index:
                                    OnlineMembers.concat(OfflineMembers)
                                        .map((O) => O.Owner.ID)
                                        .indexOf(Member.Owner.ID) + 1,
                            },
                        ],
                        online_count: OnlineMembers.length,
                        member_count: Guild.Members.length,
                        id: "everyone",
                        guild_id: Guild.ID,
                        groups: [
                            {
                                id: "online",
                                count: OnlineMembers.length,
                            },
                            {
                                id: "offline",
                                count: OfflineMembers.length,
                            },
                        ],
                    },
                    null,
                    "GUILD_MEMBER_LIST_UPDATE",
                )
                : null,
        );
}

export function SortUsers(User: User[]): User[];
export function SortUsers(Membership: Membership[]): Membership[];
export function SortUsers(Data: (User | Membership)[]): (User | Membership)[] {
    if (Data.length === 0) return [];
    const IsMembers = !!(Data[0] as any).Owner;
    if (IsMembers) {
        const Memberships = Data as Membership[];
        return Memberships.sort((a, b) => {
            return (a.GuildNickname || a.Owner.Username).localeCompare(b.GuildNickname || b.Owner.Username);
        });
    } else {
        const Users = Data as User[];
        return Users.sort((a, b) => {
            return a.Username.localeCompare(b.Username);
        });
    }
}

export async function SendToUser(
    Usr: User,
    Opcode: OpCodes,
    Data?: unknown,
    s?: unknown,
    t?: DispatchType | undefined,
) {
    const Conn = FindConnection(Usr.ID);
    if (!Conn) return;

    SendOp(Conn, Opcode, Data, s, t);
}

export function SendGuildMemberUpdate(Usr: User) {
    const AlreadySentTo: string[] = [];

    Usr.Memberships.forEach((R) => {
        const SentGuild = R.ToGuild;

        SentGuild.Members.forEach((Recipient) => {
            if (AlreadySentTo.includes(Recipient.Owner.ID)) return;

            const Conn = FindConnection(Recipient.Owner.ID);
            if (!Conn) return;
            //if (!HasIntent(Conn.Intents, GatewayIntents.GUILD_MESSAGES)) return;

            AlreadySentTo.push(Recipient.Owner.ID);
            SendOp(
                Conn,
                OpCodes.DISPATCH,
                {
                    ...R.Package(),
                    guild_id: SentGuild.ID,
                },
                666,
                "GUILD_MEMBER_UPDATE",
            );
        });
    });
}

export async function SendGuildStatusUpdate(Usr: User, Status: Presence) {
    // Err("Unimplemented function! (SendGuildStatusUpdate(), DiscordUtils.ts)");
    const UserGatewayClient = FindConnection(Usr.ID);
    if (!UserGatewayClient) return;
    Usr.Memberships.map((M) => M.ToGuild).forEach((G) => {
        G.Members.map((M) => M.Owner).forEach(async (U) => {
            const Connection = FindConnection(U.ID);
            if (!Connection) return;
            SendOp(
                Connection,
                OpCodes.DISPATCH,
                [
                    {
                        status: Usr.Presence,
                        session_id: UserGatewayClient.ID,
                        client_info: {
                            version: 0,
                            os: "windows",
                            client: "web",
                        },
                        activities: [],
                    },
                ],
                null,
                "SESSIONS_REPLACE",
            );
            SendOp(
                Connection,
                OpCodes.DISPATCH,
                {
                    user: Usr.Partial(),
                    status: Usr.Presence,
                    guild_id: G.ID,
                    client_status: {
                        web: Usr.Presence,
                    },
                    activities: [],
                },
                null,
                "PRESENCE_UPDATE",
            );
            const FoundUser = await User.findOne({ where: { ID: U.ID }, relations: { Memberships: true } });
            const FoundGuild = await Guild.findOne({ where: { ID: G.ID } });
            if (!FoundUser || !FoundGuild) return;
            const FoundMembership = await Membership.findOne({
                where: { Owner: { ID: FoundUser.ID } },
                relations: { Owner: true },
            });
            if (!FoundMembership) return;
            UpdateMemberList(G, FoundMembership);
        });
    });
}

export async function SendToConnections(
    Usr: User,
    Opcode: OpCodes,
    Data?: unknown,
    s?: unknown,
    t?: DispatchType | undefined,
) {
    const AlreadySentTo: string[] = [];

    [...Usr.RelationsFrom, ...Usr.RelationsRegarding].forEach((R) => {
        const OtherUser = R.From.ID === Usr.ID ? R.Regarding : R.From;
        if (AlreadySentTo.includes(OtherUser.ID)) return;

        const Conn = FindConnection(OtherUser.ID);
        if (!Conn) return;

        AlreadySentTo.push(OtherUser.ID);
        SendOp(Conn, Opcode, Data, s, t);
    });

    Usr.Memberships.forEach((R) => {
        const SentGuild = R.ToGuild;
        SentGuild.Members.forEach((Recipient) => {
            if (AlreadySentTo.includes(Recipient.Owner.ID)) return;

            const Conn = FindConnection(Recipient.Owner.ID);
            if (!Conn) return;
            //if (!HasIntent(Conn.Intents, GatewayIntents.GUILD_MESSAGES)) return;

            AlreadySentTo.push(Recipient.Owner.ID);
            SendOp(Conn, Opcode, Data, s, t);
        });
    });
}

export async function MakeBoosterRole(TargetGuild: Guild, Member: Membership) {

    let BoosterRole = TargetGuild.Roles.find((x) => x.BoosterRole == true);

    if (!BoosterRole)
    {
        BoosterRole = Role.create({
            ID: GenerateSnowflake(),
            Name: "Server Booster",
            Color: 16722884,
            Position: TargetGuild.DefaultRole.Position + 1,
            InGuild: TargetGuild,
            BoosterRole: true
        });
    
        await BoosterRole.save();

        SendToMembers(
            TargetGuild.ID,
            OpCodes.DISPATCH,
            {
                guild_id: TargetGuild.ID,
                role: BoosterRole.Package(),
            },
            6942,
            "GUILD_ROLE_CREATE",
        );
    }

    if (Member.Roles.find((x) => x.ID == BoosterRole?.ID)) return;

    Member.Roles.push(BoosterRole);

    await Member.save();

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    SendGuildMemberUpdate((await User.findOne({
        where: {
            ID: Member.Owner.ID
        },
        relations: {
            Memberships: {
                ToGuild: {
                    Members: true
                }
            }
        }
    }))!);
}

export async function SendToMembers(
    ServerID: string,
    Opcode: OpCodes,
    Data?: unknown,
    s?: unknown,
    t?: DispatchType | undefined,
) {
    const SentGuild = await Guild.findOne({ where: { ID: ServerID }, relations: { Members: true } });

    if (!SentGuild) return;

    SentGuild.Members.forEach((Recipient) => {
        const Conn = FindConnection(Recipient.Owner.ID);
        if (!Conn) return;
        //if (!HasIntent(Conn.Intents, GatewayIntents.GUILD_MESSAGES)) return;

        SendOp(Conn, Opcode, Data, s, t);
    });
}

export async function SendToVC(
    Chnl: Channel,
    Opcode: OpCodes,
    Data?: unknown,
    s?: unknown,
    t?: DispatchType | undefined,
) {
    if (Chnl.Type !== ChannelType.GUILD_VOICE) return;

    const VoiceSession = VoiceSessions.find((x) => x.channel_id === Chnl.ID);
    if (!VoiceSession) return;

    VoiceSession.voice_states.forEach((x) => {
        const Conn = FindConnection(x.user_id);
        if (!Conn) return;

        SendOp(Conn, Opcode, Data, s, t);
    });
}

export async function SendToDMOrServer(
    Chnl: Channel,
    Opcode: OpCodes,
    Data?: unknown,
    s?: unknown,
    t?: DispatchType | undefined,
) {
    if (Chnl.IsDM) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        Chnl.DMRecipients!.forEach((Recipient) => {
            const Conn = FindConnection(Recipient.ID);

            if (!Conn) return;
            if (!HasIntent(Conn.Intents, GatewayIntents.DIRECT_MESSAGES)) return;

            SendOp(Conn, Opcode, Data, s, t);
        });
    } else {
        const SentGuild = await Guild.findOne({
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            where: { ID: Chnl.OwnerGuild!.ID },
            relations: { Roles: false, Invites: false, Channels: false, Members: true },
        });

        if (SentGuild)
            SentGuild.Members.forEach((Recipient) => {
                const Conn = FindConnection(Recipient.Owner.ID);
                if (!Conn) return;
                if (!HasIntent(Conn.Intents, GatewayIntents.GUILD_MESSAGES)) return;

                SendOp(Conn, Opcode, Data, s, t);
            });
    }
}

export async function SendMessage(Msg: Message) {
    SendToDMOrServer(Msg.Channel, OpCodes.DISPATCH, Msg.Package(new User()), 69420, "MESSAGE_CREATE");
}

export function GenerateRandomString(Count = 8, OverrideChars = ""): string {
    let Result = "";
    const Characters =
        OverrideChars === "" ? "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" : OverrideChars;
    for (let I = 0; I < Count; I++) {
        Result += Characters.charAt(Math.floor(Math.random() * Characters.length));
    }
    return Result;
}
