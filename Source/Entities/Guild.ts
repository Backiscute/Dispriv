/* eslint-disable no-unused-vars */
import "reflect-metadata";
import {
    AfterInsert,
    BaseEntity,
    Column,
    Entity,
    JoinColumn,
    JoinTable,
    ManyToMany,
    ManyToOne,
    OneToMany,
    PrimaryColumn,
} from "typeorm";
import { Membership, User } from "./User";
import { Permissions } from "../Classes/Flags";
import { Channel, ChannelType } from "./Channel";
import { CreateTimestamp, GetHighestRole } from "../Modules/DiscordUtils";
import { GenerateSnowflake } from "../Modules/SnowflakeUtils";
import { VoiceSessions } from "../Handlers/RTCSocket";
import { CustomEmoji } from "./Emoji";

export const enum InviteType {
    GUILD = 0,
    GROUP_DM = 1,
    FRIEND = 2,
}

export const enum GuildHubType {
    NONE = 0,
    HIGH_SCHOOL = 1,
    COLLEGE = 2
}

export const enum SystemChannelFlags {
    SUPPRESS_JOIN_NOTIFICATIONS = 1 << 0,
    SUPPRESS_PREMIUM_SUBSCRIPTIONS = 1 << 1,
    SUPPRESS_GUILD_REMINDER_NOTIFICATIONS = 1 << 2,
    SUPPRESS_JOIN_NOTIFICATION_REPLIES = 1 << 3,
    SUPPRESS_ROLE_SUBSCRIPTION_PURCHASE_NOTIFICATIONS = 1 << 4,
    SUPPRESS_GUILD_REMINDER_NOTIFICATION_REPLIES = 1 << 5
}

export const enum GuildFeatures {
    ACTIVITIES_ALPHA = "ACTIVITIES_ALPHA",
    ACTIVITIES_EMPLOYEE = "ACTIVITIES_EMPLOYEE",
    ACTIVITIES_INTERNAL_DEV = "ACTIVITIES_INTERNAL_DEV",
    ANIMATED_BANNER = "ANIMATED_BANNER",
    ANIMATED_ICON = "ANIMATED_ICON",
    APPLICATION_COMMAND_PERMISSIONS_V2 = "APPLICATION_COMMAND_PERMISSIONS_V2",
    AUTO_MODERATION = "AUTO_MODERATION",
    AUTOMOD_TRIGGER_KEYWORD_FILTER = "AUTOMOD_TRIGGER_KEYWORD_FILTER",
    AUTOMOD_TRIGGER_ML_SPAM_FILTER = "AUTOMOD_TRIGGER_ML_SPAM_FILTER",
    AUTOMOD_TRIGGER_SPAM_LINK_FILTER = "AUTOMOD_TRIGGER_SPAM_LINK_FILTER",
    AUTOMOD_TRIGGER_USER_PROFILE = "AUTOMOD_TRIGGER_USER_PROFILE",
    BANNER = "BANNER",
    BFG = "BFG",
    BOOSTING_TIERS_EXPERIMENT_MEDIUM_GUILD = "BOOSTING_TIERS_EXPERIMENT_MEDIUM_GUILD",
    BOOSTING_TIERS_EXPERIMENT_SMALL_GUILD = "BOOSTING_TIERS_EXPERIMENT_SMALL_GUILD",
    BOT_DEVELOPER_EARLY_ACCESS = "BOT_DEVELOPER_EARLY_ACCESS",
    BURST_REACTIONS = "BURST_REACTIONS",
    COMMERCE = "COMMERCE",
    COMMUNITY = "COMMUNITY",
    COMMUNITY_CANARY = "COMMUNITY_CANARY",
    CREATOR_ACCEPTED_NEW_TERMS = "CREATOR_ACCEPTED_NEW_TERMS",
    CREATOR_MONETIZABLE = "CREATOR_MONETIZABLE",
    CREATOR_MONETIZABLE_DISABLED = "CREATOR_MONETIZABLE_DISABLED",
    CREATOR_MONETIZABLE_PENDING_NEW_OWNER_ONBOARDING = "CREATOR_MONETIZABLE_PENDING_NEW_OWNER_ONBOARDING",
    CREATOR_MONETIZABLE_PROVISIONAL = "CREATOR_MONETIZABLE_PROVISIONAL",
    CREATOR_MONETIZABLE_RESTRICTED = "CREATOR_MONETIZABLE_RESTRICTED",
    CREATOR_MONETIZABLE_WHITEGLOVE = "CREATOR_MONETIZABLE_WHITEGLOVE",
    CREATOR_MONETIZATION_APPLICATION_ALLOWLIST = "CREATOR_MONETIZATION_APPLICATION_ALLOWLIST",
    CREATOR_STORE_PAGE = "CREATOR_STORE_PAGE",
    DEVELOPER_SUPPORT_SERVER = "DEVELOPER_SUPPORT_SERVER",
    DISCOVERABLE = "DISCOVERABLE",
    DISCOVERABLE_DISABLED = "DISCOVERABLE_DISABLED",
    ENABLED_DISCOVERABLE_BEFORE = "ENABLED_DISCOVERABLE_BEFORE",
    EXPOSED_TO_ACTIVITIES_WTP_EXPERIMENT = "EXPOSED_TO_ACTIVITIES_WTP_EXPERIMENT",
    EXPOSED_TO_BOOSTING_TIERS_EXPERIMENT = "EXPOSED_TO_BOOSTING_TIERS_EXPERIMENT",
    FEATURABLE = "FEATURABLE",
    FORCE_RELAY = "FORCE_RELAY",
    GUILD_AUTOMOD_DEFAULT_LIST = "GUILD_AUTOMOD_DEFAULT_LIST",
    GUILD_COMMUNICATION_DISABLED_GUILDS = "GUILD_COMMUNICATION_DISABLED_GUILDS",
    GUILD_HOME_DEPRECATION_OVERRIDE = "GUILD_HOME_DEPRECATION_OVERRIDE",
    GUILD_HOME_OVERRIDE = "GUILD_HOME_OVERRIDE",
    GUILD_HOME_TEST = "GUILD_HOME_TEST",
    GUILD_MEMBER_VERIFICATION_EXPERIMENT = "GUILD_MEMBER_VERIFICATION_EXPERIMENT",
    GUILD_ONBOARDING = "GUILD_ONBOARDING",
    GUILD_ONBOARDING_ADMIN_ONLY = "GUILD_ONBOARDING_ADMIN_ONLY",
    GUILD_ONBOARDING_EVER_ENABLED = "GUILD_ONBOARDING_EVER_ENABLED",
    GUILD_ONBOARDING_HAS_PROMPTS = "GUILD_ONBOARDING_HAS_PROMPTS",
    GUILD_ROLE_SUBSCRIPTIONS = "GUILD_ROLE_SUBSCRIPTIONS",
    GUILD_ROLE_SUBSCRIPTION_PURCHASE_FEEDBACK_LOOP = "GUILD_ROLE_SUBSCRIPTION_PURCHASE_FEEDBACK_LOOP",
    GUILD_ROLE_SUBSCRIPTION_TRIALS = "GUILD_ROLE_SUBSCRIPTION_TRIALS",
    GUILD_SERVER_GUIDE = "GUILD_SERVER_GUIDE",
    GUILD_WEB_PAGE_VANITY_URL = "GUILD_WEB_PAGE_VANITY_URL",
    HAD_EARLY_ACTIVITIES_ACCESS = "HAD_EARLY_ACTIVITIES_ACCESS",
    HAS_DIRECTORY_ENTRY = "HAS_DIRECTORY_ENTRY",
    HIDE_FROM_EXPERIMENT_UI = "HIDE_FROM_EXPERIMENT_UI",
    HUB = "HUB",
    INCREASED_THREAD_LIMIT = "INCREASED_THREAD_LIMIT",
    INTERNAL_EMPLOYEE_ONLY = "INTERNAL_EMPLOYEE_ONLY",
    INVITE_SPLASH = "INVITE_SPLASH",
    INVITES_DISABLED = "INVITES_DISABLED",
    LINKED_TO_HUB = "LINKED_TO_HUB",
    LURKABLE = "LURKABLE",
    MARKETPLACES_CONNECTION_ROLES = "MARKETPLACES_CONNECTION_ROLES",
    MEDIA_CHANNEL_ALPHA = "MEDIA_CHANNEL_ALPHA",
    MEMBER_LIST_DISABLED = "MEMBER_LIST_DISABLED",
    MEMBER_PROFILES = "MEMBER_PROFILES",
    MEMBER_VERIFICATION_GATE_ENABLED = "MEMBER_VERIFICATION_GATE_ENABLED",
    MEMBER_VERIFICATION_MANUAL_APPROVAL = "MEMBER_VERIFICATION_MANUAL_APPROVAL",
    MOBILE_WEB_ROLE_SUBSCRIPTION_PURCHASE_PAGE = "MOBILE_WEB_ROLE_SUBSCRIPTION_PURCHASE_PAGE",
    MONETIZATION_ENABLED = "MONETIZATION_ENABLED",
    MORE_EMOJI = "MORE_EMOJI",
    MORE_STICKERS = "MORE_STICKERS",
    NEWS = "NEWS",
    NEW_THREAD_PERMISSIONS = "NEW_THREAD_PERMISSIONS",
    PARTNERED = "PARTNERED",
    PREMIUM_TIER_3_OVERRIDE = "PREMIUM_TIER_3_OVERRIDE",
    PREVIEW_ENABLED = "PREVIEW_ENABLED",
    PRIVATE_THREADS = "PRIVATE_THREADS",
    PUBLIC = "PUBLIC",
    PUBLIC_DISABLED = "PUBLIC_DISABLED",
    RAID_ALERTS_DISABLED = "RAID_ALERTS_DISABLED",
    RAID_ALERTS_ENABLED = "RAID_ALERTS_ENABLED",
    RELAY_ENABLED = "RELAY_ENABLED",
    RESTRICT_SPAM_RISK_GUILDS = "RESTRICT_SPAM_RISK_GUILDS",
    ROLE_ICONS = "ROLE_ICONS",
    ROLE_SUBSCRIPTIONS_AVAILABLE_FOR_PURCHASE = "ROLE_SUBSCRIPTIONS_AVAILABLE_FOR_PURCHASE",
    ROLE_SUBSCRIPTIONS_ENABLED = "ROLE_SUBSCRIPTIONS_ENABLED",
    ROLE_SUBSCRIPTIONS_ENABLED_FOR_PURCHASE = "ROLE_SUBSCRIPTIONS_ENABLED_FOR_PURCHASE",
    SEVEN_DAY_THREAD_ARCHIVE = "SEVEN_DAY_THREAD_ARCHIVE",
    SHARD = "SHARD",
    SHARED_CANVAS_FRIENDS_AND_FAMILY_TEST = "SHARED_CANVAS_FRIENDS_AND_FAMILY_TEST",
    SOUNDBOARD = "SOUNDBOARD",
    SUMMARIES_ENABLED = "SUMMARIES_ENABLED",
    SUMMARIES_ENABLED_GA = "SUMMARIES_ENABLED_GA",
    SUMMARIES_DISABLED_BY_USER = "SUMMARIES_DISABLED_BY_USER",
    SUMMARIES_ENABLED_BY_USER = "SUMMARIES_ENABLED_BY_USER",
    TEXT_IN_STAGE_ENABLED = "TEXT_IN_STAGE_ENABLED",
    TEXT_IN_VOICE_ENABLED = "TEXT_IN_VOICE_ENABLED",
    THREADS_ENABLED_TESTING = "THREADS_ENABLED_TESTING",
    THREADS_ENABLED = "THREADS_ENABLED",
    THREAD_DEFAULT_AUTO_ARCHIVE_DURATION = "THREAD_DEFAULT_AUTO_ARCHIVE_DURATION",
    THREADS_ONLY_CHANNEL = "THREADS_ONLY_CHANNEL",
    THREE_DAY_THREAD_ARCHIVE = "THREE_DAY_THREAD_ARCHIVE",
    TICKETED_EVENTS_ENABLED = "TICKETED_EVENTS_ENABLED",
    TICKETING_ENABLED = "TICKETING_ENABLED",
    VANITY_URL = "VANITY_URL",
    VERIFIED = "VERIFIED",
    VIP_REGIONS = "VIP_REGIONS",
    VOICE_CHANNEL_EFFECTS = "VOICE_CHANNEL_EFFECTS",
    VOICE_IN_THREADS = "VOICE_IN_THREADS",
    WELCOME_SCREEN_ENABLED = "WELCOME_SCREEN_ENABLED",
}

@Entity()
export class Guild extends BaseEntity {
    @PrimaryColumn()
        ID: string;

    @Column()
        Name: string;

    @Column({ nullable: true })
        IconID?: string;

    @Column({ nullable: true })
        BannerID?: string;

    @ManyToOne(() => User, (U) => U.OwnedGuilds, { eager: true, onDelete: "CASCADE", orphanedRowAction: "nullify" })
        Owner: User;

    @Column({ nullable: true })
        VanityInviteURL?: string;

    @Column({ default: false })
        ShowBoostBar: boolean;

    @Column({ default: false })
        ClassifiedAsNSFW: boolean;

    @Column({ nullable: true })
        Description?: string;

    @Column({ default: false })
        Disabled: boolean;

    @Column({ type: "simple-array" })
        Features: GuildFeatures[];

    @Column({ default: 1000 })
        MaximumMembers: number;

    @OneToMany(() => Membership, (U) => U.ToGuild, { orphanedRowAction: "delete", onDelete: "CASCADE" })
    @JoinTable()
        Members: Membership[];

    @OneToMany(() => Channel, (C) => C.OwnerGuild, { eager: true, orphanedRowAction: "delete", onDelete: "CASCADE" })
    @JoinColumn()
        Channels: Channel[];

    @OneToMany(() => Role, (R) => R.InGuild, { eager: true, orphanedRowAction: "delete", onDelete: "CASCADE" })
    @JoinColumn()
        Roles: Role[];

    @OneToMany(() => CustomEmoji, (E) => E.Guild, { eager: true })
    @JoinTable()
        Emojis: CustomEmoji[];

    @OneToMany(() => Invite, (I) => I.InGuild, { eager: true, orphanedRowAction: "delete", onDelete: "CASCADE" })
    @JoinColumn()
        Invites: Invite[];

    @Column({ nullable: true })
        SystemChannelID?: string;

    @Column({ default: 0 })
        SystemChannelFlags: number;

    @Column({ nullable: true })
        AfkChannelID?: string;

    @Column({ default: 0 })
        AfkTimeout: number;

    @Column({ default: 0 })
        DefaultMessageNotifications: number;

    get DefaultRole() {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.Roles.find((R) => R.ID === this.ID)!;
    }

    SystemChannelHasFlag(Flag: SystemChannelFlags) {
        return (this.SystemChannelFlags & Flag) === Flag;
    }

    @AfterInsert()
    private async AddEveryoneRole() {
        const R = await Role.create({
            ID: this.ID,
            Name: "@everyone",
            Color: 0,
            Position: 0,
            AnyoneCanMention: false,
            InGuild: this,
        }).save();
        this.Roles = [R];
    }

    @AfterInsert()
    private async CreateDefaultChannels() {
        // categories made the thing logout for osme rason
        const GeneralChannel = await Channel.create({
            ID: GenerateSnowflake(),
            DisplayName: "general",
            OwnerGuild: this,
            //OwnerCategory: TextCategory,
        }).save();

        await Channel.create({
            ID: GenerateSnowflake(),
            DisplayName: "General",
            Type: ChannelType.GUILD_VOICE,
            OwnerGuild: this,
            //OwnerCategory: VoiceCategory,
        }).save();

        this.SystemChannelID = GeneralChannel.ID;
        await this.save();
    }

    Partial() {
        return {
            id: this.ID,
            name: this.Name,
            icon: this.IconID,
            description: this.Description,
            banner: this.BannerID,
            splash: this.BannerID,
            discovery_splash: this.BannerID,
            home_header: this.BannerID,
            features: this.Features,
            approximate_member_count: 0,
            approximate_presence_count: 0,
            vanity_url_code: this.VanityInviteURL,
            emojis: this.Emojis?.map((E) => E.Package()) ?? [],
            stickers: [],
        };
    }

    Package(UserContext?: User) {
        const Boosters = this.Members?.filter((M) => M.BoostingSince).length;
        const UserMembershipHere = UserContext?.Memberships?.find((x) => x.ToGuild.ID === this.ID);

        return {
            id: this.ID,
            name: this.Name,
            icon: this.IconID,
            splash: this.BannerID,
            discovery_splash: this.BannerID,
            owner: UserContext?.ID === this.Owner?.ID,
            owner_id: this.Owner?.ID,
            permissions: UserMembershipHere ? GetHighestRole(UserMembershipHere).Permissions.toString() : "0",
            afk_channel_id: this.AfkChannelID,
            afk_timeout: this.AfkTimeout,
            widget_enabled: true,
            widget_channel_id: null,
            verification_level: 0,
            default_message_notifications: this.DefaultMessageNotifications,
            explicit_content_filter: 0,
            roles: this.Roles?.map((R) => R.Package()),
            emojis: this.Emojis?.map((E) => E.Package()) ?? [],
            features: this.Features,
            mfa_level: 0,
            joined_at: CreateTimestamp(new Date()),
            large: this.Members?.length > 100,
            unavailable: this.Disabled,
            member_count: this.Members?.length,
            channels: this.Channels?.map((C) => C.GuildPackage(this.ID, UserContext?.ID)),
            threads: [],
            max_members: this.MaximumMembers,
            vanity_url_code: this.VanityInviteURL,
            description: this.Description,
            banner: this.BannerID,
            premium_tier: Boosters >= 14 ? 3 : Boosters >= 7 ? 2 : Boosters >= 2 ? 1 : 0,
            premium_subscription_count: Boosters,
            preferred_locale: "en-US",
            nsfw_level: 0,
            system_channel_id: this.SystemChannelID,
            system_channel_flags: this.SystemChannelFlags,
            premium_progress_bar_enabled: this.ShowBoostBar
        };
    }

    GatewayPackage(UserContext: User) {
        return {
            application_command_counts: {},
            channels: this.Channels ? this.Channels.map((C) => C.GuildPackage(this.ID, UserContext.ID)) : [],
            data_mode: "full",
            emojis: this.Emojis?.map((E) => E.Package()) ?? [],
            guild_scheduled_events: [],
            id: this.ID,
            joined_at: CreateTimestamp(new Date()),
            large: this.Members ? this.Members.length > 100 : false,
            lazy: true,
            member_count: this.Members ? this.Members.length : 1,
            premium_subscription_count: this.Members ? this.Members.filter((M) => M.BoostingSince).length : 0,
            properties: this.Package(UserContext),
            roles: this.Roles?.map((R) => R.Package()),
            stage_instances: [],
            stickers: [],
            threads: [],
            version: Date.now(),
            system_channel_id: this.SystemChannelID,
            system_channel_flags: this.SystemChannelFlags
        };
    }

    DiscoveryPackage() {
        return {
            approximate_member_count: this.Members?.length,
            approximate_presence_count: 0,
            auto_removed: false,
            banner: this.BannerID,
            description: this.Description,
            discovery_splash: this.BannerID,
            features: this.Features,
            icon: this.IconID,
            id: this.ID,
            is_published: true,
            keywords: [],
            name: this.Name,
            preferred_locale: "en-US",
            premium_subscription_count: this.Members?.filter((M) => M.BoostingSince).length,
            primary_category_id: 0,
            splash: this.BannerID,
            vanity_url_code: this.VanityInviteURL,
        };
    }

    GatewayPackageEvent(UserContext: User) {
        return {
            application_command_counts: {},
            channels: this.Channels ? this.Channels.map((C) => C.GuildPackage(this.ID, UserContext.ID)) : [],
            data_mode: "full",
            emojis: this.Emojis?.map((E) => E.Package()) ?? [],
            guild_scheduled_events: [],
            id: this.ID,
            joined_at: CreateTimestamp(new Date()),
            large: this.Members ? this.Members.length > 100 : false,
            lazy: true,
            member_count: this.Members ? this.Members.length : 1,
            premium_subscription_count: this.Members ? this.Members.filter((M) => M.BoostingSince).length : 0,
            properties: this.Package(UserContext),
            roles: this.Roles?.map((R) => R.Package()),
            stage_instances: [],
            stickers: [],
            threads: [],
            members: this.Members
                ? this.Members.map((C) => C.Package())
                : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  [UserContext.Memberships.find((M) => M.ToGuild.ID === this.ID)!.Package()],
            presences: [], // TODO
            embedded_activities: [], // same as ready embedded_activities
            version: Date.now(),
        };
    }

    GatewaySupplementalPackage() {
        const FilteredVoiceSessions = VoiceSessions.filter((V) => V.guild_id === this.ID);
        const VoiceStates = FilteredVoiceSessions.map((V) => V.voice_states)
            .flat()
            .map((voiceState) => ({
                channel_id: voiceState.channel_id,
                deaf: voiceState.deaf,
                mute: voiceState.mute,
                request_to_speak_timestamp: voiceState.request_to_speak_timestamp,
                self_deaf: voiceState.self_deaf,
                self_mute: voiceState.self_mute,
                self_video: voiceState.self_video,
                session_id: voiceState.session_id,
                suppress: voiceState.suppress,
                user_id: voiceState.user_id,
            }));

        const EmbeddedActivitiesRooms = FilteredVoiceSessions.map((V) => V.Activities);

        const EmbeddedActivities = EmbeddedActivitiesRooms.flatMap((arr) =>
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            arr.map(({ guild_id, update_code, ...rest }) => rest),
        );

        return {
            embedded_activities: EmbeddedActivities,
            id: this.ID,
            voice_states: VoiceStates,
        };
    }
}

@Entity()
export class Role extends BaseEntity {
    @PrimaryColumn()
        ID: string;

    @Column()
        Name: string;

    @Column({ length: 90, nullable: true })
        Description?: string;

    @Column()
        Color: number;

    @Column({ default: 0 })
        Position: number;

    @Column({ default: true })
        ShownOnMemberlist: boolean;

    @Column({ nullable: true })
        IconID?: string;

    @Column({ nullable: true })
        UnicodeEmoji?: string;

    @ManyToOne(() => Guild, (G) => G.Roles, { onDelete: "CASCADE", orphanedRowAction: "delete" })
        InGuild: Guild;

    @ManyToMany(() => Membership, (M) => M.Roles, { orphanedRowAction: "nullify" })
    @JoinTable()
        Members: Membership[];

    @Column({
        default:
            Permissions.CONNECT |
            Permissions.SPEAK |
            Permissions.CREATE_INSTANT_INVITE |
            Permissions.VIEW_CHANNEL |
            Permissions.SEND_MESSAGES |
            Permissions.READ_MESSAGE_HISTORY |
            Permissions.USE_EMBEDDED_ACTIVITIES,
    })
        Permissions: Permissions;

    @Column({ default: false })
        AnyoneCanMention: boolean;

    Package() {
        return {
            id: this.ID,
            name: this.Name,
            description: this.Description,
            color: this.Color,
            flags: 0,
            hoist: this.ShownOnMemberlist,
            icon: this.IconID,
            unicode_emoji: this.UnicodeEmoji,
            position: this.Position,
            permissions: this.Permissions.toString(),
            managed: false,
            mentionable: this.AnyoneCanMention,
            tags: {},
        };
    }
}

@Entity()
export class Invite extends BaseEntity {
    @PrimaryColumn()
        InviteCode: string;

    @Column()
        MaxUses: number;

    @Column({ default: 0 })
        CurrentUses: number;

    @Column()
        Created: Date;

    @Column({ nullable: true })
        Expires?: Date;

    @ManyToOne(() => Guild, (G) => G.Invites)
        InGuild: Guild;

    @Column({ default: InviteType.GUILD })
        Type: InviteType;

    @ManyToOne(() => Channel, (C) => C.Invites, { eager: true })
        LinkedChannel: Channel;

    @ManyToOne(() => User, (U) => U.CreatedInvites, { eager: true })
        InviteOwner: User;

    Package() {
        return {
            code: this.InviteCode,
            guild: this.InGuild.Partial(),
            type: this.Type,
            created_at: CreateTimestamp(this.Created),
            expires_at: this.Expires ? CreateTimestamp(this.Expires) : null,
            uses: this.CurrentUses,
            max_uses: this.MaxUses,
            inviter: this.InviteOwner.PackageSmall(),
            channel: {
                id: this.LinkedChannel.ID,
                name: this.LinkedChannel.DisplayName,
                type: this.LinkedChannel.Type,
                guild_id: this.InGuild.ID
            },
        };
    }

    PackagePublic(NewMember = false) {
        return {
            code: this.InviteCode,
            guild: this.InGuild.Partial(),
            type: this.Type,
            expires_at: this.Expires ? CreateTimestamp(this.Expires) : null,
            approximate_member_count: 0,
            approximate_presence_count: 0, // TODO
            channel: {
                id: this.LinkedChannel.ID,
                name: this.LinkedChannel.DisplayName,
                type: this.LinkedChannel.Type,
                guild_id: this.InGuild.ID
            },
            new_member:	NewMember ? undefined : true,
        };
    }
}

// TODO: Emojis
