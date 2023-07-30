import {
    BaseEntity,
    Entity,
    PrimaryColumn,
    Column,
    ManyToOne,
    OneToMany,
    ManyToMany,
    JoinTable,
    OneToOne,
    BeforeInsert,
} from "typeorm";
import { UserFlags } from "../Classes/Flags";
import { Message, MessageType } from "./Message";
import { Relation } from "./FriendUser";
import { DiscordApplication } from "./Application";
import { Channel, ChannelType } from "./Channel";
import { Guild, Invite, Role, SystemChannelFlags } from "./Guild";
import { CreateTimestamp, GetHighestRoleInArr, NitroType, SendMessage } from "../Modules/DiscordUtils";
import { Presence } from "../Classes/Presence";
import { Badge } from "./Badge";
import { OAuth2App } from "./OAuth2";
import { Gift } from "./Gift";
import { CustomEmoji } from "./Emoji";
import { UserSubscription } from "./Subscription";
import { GenerateSnowflake } from "../Modules/SnowflakeUtils";
import { Integration } from "./Integration";

export interface UserSettings {
    locale: string;
    show_current_game: boolean;
    restricted_guilds: object[];
    default_guilds_restricted: boolean;
    inline_attachment_media: boolean;
    inline_embed_media: boolean;
    gif_auto_play: boolean;
    render_embeds: boolean;
    render_reactions: boolean;
    animate_emoji: boolean;
    enable_tts_command: boolean;
    message_display_compact: boolean;
    convert_emoticons: boolean;
    explicit_content_filter: number;
    disable_games_tab: boolean;
    theme: string;
    developer_mode: boolean;
    detect_platform_accounts: boolean;
    status: string;
    afk_timeout: number;
    timezone_offset: number;
    stream_notifications_enabled: boolean;
    allow_accessibility_detection: false,
    contact_sync_enabled: boolean,
    native_phone_integration_enabled: boolean,
    animate_stickers: number,
    friend_discovery_flags: number,
    view_nsfw_guilds: false,
    view_nsfw_commands: false,
    passwordless: boolean,
    friend_source_flags: {
      all: boolean
    },
    guild_folders: {
      guild_ids: string[];
      id?: number | null;
      name?: string | null;
      color?: string | null;
    }[];
    custom_status?: string | null;
    activity_restricted_guild_ids?: string[];
    activity_joining_restricted_guild_ids?: string[];
    broadcast_allow_friends?: false,
    broadcast_allowed_guild_ids?: [],
    broadcast_allowed_user_ids?: []
}  

@Entity()
export class User extends BaseEntity {
    @PrimaryColumn()
        ID: string;

    @Column({ length: 32 })
        Username: string;

    @Column({ length: 4 })
        Discriminator: string;

    @Column()
        Email: string;

    @Column()
        Password: string;

    @Column({ length: 200 })
        Bio: string;

    @Column()
        DateOfBirth: Date;

    @Column({ nullable: true })
        AvatarID?: string;

    @Column({ nullable: true })
        BannerID?: string;

    @Column({ nullable: true })
        AvatarDecoration?: string;

    @Column({ nullable: true })
        BannerColor?: string;

    @Column({ default: 3 })
        AvailableSuperreactions: number;

    @Column({ default: false })
        Bot: boolean;

    @Column({ type: "simple-json" })
        Settings: UserSettings;

    @ManyToMany(() => Badge, (B) => B.UsersOwningThis, { orphanedRowAction: "nullify", eager: true })
    @JoinTable()
        Badges: Badge[];

    @OneToMany(() => OAuth2App, (O) => O.AuthorizedUsers, { orphanedRowAction: "nullify", eager: true })
    @JoinTable()
        AuthorizedApps: OAuth2App[];

    @OneToMany(() => CustomEmoji, (E) => E.Author, { eager: true })
    @JoinTable()
        UploadedEmojis: CustomEmoji[];

    @OneToMany(() => UserSubscription, (S) => S.LinkedUser, { eager: true })
    @JoinTable()
        Subscriptions: UserSubscription[];

    @OneToOne(() => DiscordApplication, (DA) => DA.Bot, { nullable: true, onDelete: "CASCADE" })
        BotApplication?: DiscordApplication;

    @Column({ default: UserFlags.VERIFIED_EMAIL })
        Flags: UserFlags;

    @Column({ default: Presence.OFFLINE })
        Presence: Presence;

    @ManyToMany(() => Channel, (C) => C.DMRecipients)
    @JoinTable()
        AvailableDMs: Channel[];

    @OneToMany(() => Message, (M) => M.Author, { orphanedRowAction: "delete" })
    @JoinTable()
        MessagesByUser: Message[];

    @OneToMany(() => Relation, (Rel) => Rel.From, { onDelete: "CASCADE" })
    @JoinTable()
        RelationsFrom: Relation[];

    @OneToMany(() => Relation, (Rel) => Rel.Regarding, { onDelete: "CASCADE" })
    @JoinTable()
        RelationsRegarding: Relation[];

    @OneToMany(() => DiscordApplication, (Rel) => Rel.Owner, { orphanedRowAction: "delete" })
    @JoinTable()
        Applications: DiscordApplication[];

    @OneToMany(() => Guild, (G) => G.Owner, { orphanedRowAction: "delete" })
    @JoinTable()
        OwnedGuilds: Guild[];

    @OneToMany(() => Invite, (I) => I.InviteOwner)
    @JoinTable()
        CreatedInvites: Invite[];

    @OneToMany(() => Membership, (M) => M.Owner, { orphanedRowAction: "delete" })
    @JoinTable()
        Memberships: Membership[];

    @Column({ nullable: true })
        PremiumStreak?: string;

    @Column({ default: false })
        Premium: boolean;

    @Column({ nullable: true })
        PremiumType?: NitroType;

    @Column({ default: false })
        TutorialSuppressed: boolean;

    @Column({ type: "simple-array" })
        TutorialReadIndicators: string[];

    @Column({ type: "simple-array" })
        SettingsProto: string[] = ["CgIYAWIJCgcKBWVuLVVT"];

    @OneToMany(() => Gift, (G) => G.User)
        Gifts: Gift[];
    
    @Column({ type: "simple-array", nullable: true })
        ThemeColors: number[] = [];

    HasFlag(Flag: UserFlags) {
        return (this.Flags & Flag) === Flag;
    }

    @BeforeInsert()
    private async SetDiscriminator() {
        const Users = await User.find({
            where: {
                Username: this.Username
            },
            select: {
                Discriminator: true
            }
        });
        const AvailableDiscrims = [];
        for (let Discrim = 1; Discrim < 10000; Discrim++)
            if (!Users.find((U) => parseInt(U.Discriminator) === Discrim)) AvailableDiscrims.push(Discrim);
        if (AvailableDiscrims.length === 0) throw "Too many users have that username.";
        this.Discriminator = AvailableDiscrims[0].toString().padStart(4, "0");
    }

    Package() {
        return {
            accent_color: null,
            avatar: this.AvatarID,
            avatar_decoration: null,
            desktop: true,
            discriminator: this.Discriminator,
            display_name: this.Username,
            email: this.Email,
            flags: this.Flags,
            global_name: this.Username,
            id: this.ID,
            mfa_enabled: true,
            mobile: true,
            nsfw_allowed: true,
            phone: "phone number priv when",
            premium_since: this.PremiumStreak,
            premium: this.Premium,
            premium_type: this.PremiumType,
            premium_usage_flags: 0,
            public_flags: this.Flags,
            purchased_flags: 0,
            username: this.Username,
            system: this.HasFlag(UserFlags.SYSTEM),
            verified: true,
            bot: this.Bot,
            theme_colors: this.ThemeColors,
            locale: this.Settings.locale,
            pronouns: null
        };
    }

    PackagePublic() {
        return {
            accent_color: null,
            avatar: this.AvatarID,
            avatar_decoration: null,
            banner: this.BannerID,
            banner_color: null,
            bio: this.Bio,
            discriminator: this.Discriminator,
            display_name: this.Username,
            flags: this.Flags, // 1 << 0 = Nitro Classic, 1 << 1 = Nitro, 1 << 2 = Guild Boost, 1 << 3 = Nitro Basic
            global_name: this.Username,
            id: this.ID,
            system: this.HasFlag(UserFlags.SYSTEM),
            public_flags: this.Flags,
            username: this.Username,
            bot: this.Bot,
            premium_since: this.PremiumStreak,
            premium_type: this.PremiumType,
            premium_usage_flags: 0,
            pronouns: null
        };
    }

    PackageSmall() {
        return {
            avatar: this.AvatarID,
            avatar_decoration: null,
            bot: this.Bot,
            discriminator: this.Discriminator,
            display_name: this.Username,
            global_name: this.Username,
            id: this.ID,
            system: this.HasFlag(UserFlags.SYSTEM),
            public_flags: this.Flags,
            username: this.Username,
            premium_since: this.PremiumStreak,
            premium: this.Premium,
            premium_type: this.PremiumType,
            premium_usage_flags: 0,
            pronouns: null
        };
    }

    Gateway(MemberOf: Membership) {
        return {
            avatar: MemberOf.AvatarID ?? this.AvatarID,
            banner: MemberOf.BannerID ?? this.BannerID,
            bio: MemberOf.Bio,
            communication_disabled_until: null,
            deaf: MemberOf.Deafened,
            flags: 0,
            joined_at: MemberOf.CreatedAt,
            mute: MemberOf.Muted,
            nick: null,
            pending: false,
            premium_since: this.PremiumStreak,
            premium: this.Premium,
            premium_type: this.PremiumType,
            premium_usage_flags: 0,
            roles: MemberOf.Roles.filter((R) => R.ID !== MemberOf.ToGuild.ID).map((R) => R.ID),
            user: this.PackageSmall(),
        };
    }

    Partial() {
        return {
            id: this.ID,
            username: this.Username,
            discriminator: this.Discriminator,
            avatar: this.AvatarID,
            avatar_decoration: this.AvatarDecoration,
            bot: this.Bot,
            system: this.HasFlag(UserFlags.SYSTEM),
            banner: this.BannerID,
            accent_color: 0,
            public_flags: this.Flags,
            premium_since: this.PremiumStreak,
            premium: this.Premium,
            premium_type: this.PremiumType,
            premium_usage_flags: 0
        };
    }

    PartialVoice() {
        return {
            avatar: this.AvatarID,
            avatar_decoration: this.AvatarDecoration,
            bot: this.Bot,
            discriminator: this.Discriminator,
            display_name: null,
            global_name: null,
            id: this.ID,
            public_flags: this.Flags,
            username: this.Username
        };
    }
}

@Entity()
export class Membership extends BaseEntity {
    @PrimaryColumn()
        ID: string;

    @Column({ nullable: true })
        AvatarID?: string;

    @Column({ nullable: true })
        BannerID?: string;

    @Column({ length: 200, nullable: true })
        Bio: string = "";

    @Column()
        CreatedAt: Date;

    @Column({ nullable: true })
        BoostingSince?: Date;

    @Column({ default: 0 })
        BoostCount: number;

    @Column({ default: false })
        Muted: boolean;

    @Column({ default: false })
        Deafened: boolean;

    @ManyToOne(() => User, (U) => U.Memberships, { eager: true, onDelete: "CASCADE", orphanedRowAction: "delete" })
    @JoinTable()
        Owner: User;

    @Column({ nullable: true })
        GuildNickname?: string;

    @Column({ type: "simple-array", nullable: true })
        ThemeColors: number[] = [];
        
    @ManyToOne(() => Guild, (G) => G.Members, { onDelete: "CASCADE", orphanedRowAction: "delete" })
    @JoinTable()
        ToGuild: Guild;

    @ManyToMany(() => Role, (R) => R.Members, { eager: true, onDelete: "CASCADE", orphanedRowAction: "delete" })
    @JoinTable()
        Roles: Role[];

    @OneToMany(() => Integration, (I) => I.AddedBy, { orphanedRowAction: "delete" })
    @JoinTable()
        AddedIntegrations: Integration[];

    @BeforeInsert()
    async SendJoinMessage() {
        if (!this.ToGuild.Channels) return;

        const SystemChannelID = this.ToGuild.SystemChannelID;

        if (!SystemChannelID) return;
    
        const SystemChannel = this.ToGuild.Channels.find((x) => x.ID === SystemChannelID);
    
        if (!SystemChannel) return;
    
        if (SystemChannel.Type !== ChannelType.GUILD_TEXT) return;
        if (this.ToGuild.SystemChannelHasFlag(SystemChannelFlags.SUPPRESS_JOIN_NOTIFICATIONS)) return;
    
        const SystemMessage = Message.create({
            ID: GenerateSnowflake(),
            Channel: SystemChannel,
            Content: "",
            Type: MessageType.USER_JOIN,
            CreationDate: new Date(),
            Author: this.Owner,
        });
    
        SendMessage(SystemMessage);
    
        await SystemMessage.save();
    }

    Package(IncludeUser: boolean = true /*, ChannelContext: Channel*/) {
        return {
            user: IncludeUser ? this.Owner.Partial() : undefined,
            avatar: this.AvatarID,
            banner: this.BannerID,
            bio: this.Bio,
            nick: this.GuildNickname,
            roles: this.Roles ? this.Roles.map((R) => R.ID).slice(1) : [],
            joined_at: CreateTimestamp(this.CreatedAt),
            deaf: this.Deafened,
            mute: this.Muted,
            premium_type: this.Owner.PremiumType,
            premium_since: this.Owner.PremiumStreak,
            premium_guild_since: this.BoostingSince ? CreateTimestamp(this.BoostingSince) : undefined,
            pending: false,
            permissions: GetHighestRoleInArr(this.Roles).Permissions.toString(),
            theme_colors: this.ThemeColors
        };
    }

    PackageGatewayVoice() {
        return {
            avatar: this.AvatarID,
            communication_disabled_until: null,
            deaf: this.Deafened,
            flags: 0,
            joined_at: CreateTimestamp(this.CreatedAt),
            mute: this.Muted,
            nick: this.GuildNickname,
            pending: false,
            premium_type: this.Owner.PremiumType,
            premium_since: this.Owner ? this.Owner.PremiumStreak : null,
            premium_guild_since: this.BoostingSince ? CreateTimestamp(this.BoostingSince) : null,
            roles: this.Roles ? this.Roles.map((R) => R.ID) : [],
            user: this.Owner.PartialVoice(),
        };
    }

    PackageGateway() {
        return [
            {
                avatar: this.AvatarID,
                banner: this.BannerID,
                bio: this.Bio,
                nick: this.GuildNickname,
                roles: this.Roles ? this.Roles.map((R) => R.ID) : [],
                joined_at: CreateTimestamp(this.CreatedAt),
                deaf: this.Deafened,
                mute: this.Muted,
                premium_type: this.Owner.PremiumType,
                premium_since: this.Owner.PremiumStreak,
                premium_guild_since: this.BoostingSince ? CreateTimestamp(this.BoostingSince) : undefined,
                pending: false,
                communication_disabled_until: null,
                user_id: this.Owner.ID,
            },
        ];
    }
}
