import { BaseEntity, Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { Membership, User } from "./User";
import { Permissions } from "../Classes/Flags";
import { Channel } from "./Channel";
import { CreateTimestamp, GetHighestRole } from "../Modules/DiscordUtils";

export const enum InviteType {
	GUILD = 0,
	GROUP_DM = 1,
	FRIEND = 2,
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
	BOOSTING_TIERS_EXPERIMENT_MEDIUM_GUILD =
		"BOOSTING_TIERS_EXPERIMENT_MEDIUM_GUILD",
	BOOSTING_TIERS_EXPERIMENT_SMALL_GUILD =
		"BOOSTING_TIERS_EXPERIMENT_SMALL_GUILD",
	BOT_DEVELOPER_EARLY_ACCESS = "BOT_DEVELOPER_EARLY_ACCESS",
	BURST_REACTIONS = "BURST_REACTIONS",
	COMMERCE = "COMMERCE",
	COMMUNITY = "COMMUNITY",
	COMMUNITY_CANARY = "COMMUNITY_CANARY",
	CREATOR_ACCEPTED_NEW_TERMS = "CREATOR_ACCEPTED_NEW_TERMS",
	CREATOR_MONETIZABLE = "CREATOR_MONETIZABLE",
	CREATOR_MONETIZABLE_DISABLED = "CREATOR_MONETIZABLE_DISABLED",
	CREATOR_MONETIZABLE_PENDING_NEW_OWNER_ONBOARDING =
		"CREATOR_MONETIZABLE_PENDING_NEW_OWNER_ONBOARDING",
	CREATOR_MONETIZABLE_PROVISIONAL = "CREATOR_MONETIZABLE_PROVISIONAL",
	CREATOR_MONETIZABLE_RESTRICTED = "CREATOR_MONETIZABLE_RESTRICTED",
	CREATOR_MONETIZABLE_WHITEGLOVE = "CREATOR_MONETIZABLE_WHITEGLOVE",
	CREATOR_MONETIZATION_APPLICATION_ALLOWLIST =
		"CREATOR_MONETIZATION_APPLICATION_ALLOWLIST",
	CREATOR_STORE_PAGE = "CREATOR_STORE_PAGE",
	DEVELOPER_SUPPORT_SERVER = "DEVELOPER_SUPPORT_SERVER",
	DISCOVERABLE = "DISCOVERABLE",
	DISCOVERABLE_DISABLED = "DISCOVERABLE_DISABLED",
	ENABLED_DISCOVERABLE_BEFORE = "ENABLED_DISCOVERABLE_BEFORE",
	EXPOSED_TO_ACTIVITIES_WTP_EXPERIMENT =
		"EXPOSED_TO_ACTIVITIES_WTP_EXPERIMENT",
	EXPOSED_TO_BOOSTING_TIERS_EXPERIMENT =
		"EXPOSED_TO_BOOSTING_TIERS_EXPERIMENT",
	FEATURABLE = "FEATURABLE",
	FORCE_RELAY = "FORCE_RELAY",
	GUILD_AUTOMOD_DEFAULT_LIST = "GUILD_AUTOMOD_DEFAULT_LIST",
	GUILD_COMMUNICATION_DISABLED_GUILDS =
		"GUILD_COMMUNICATION_DISABLED_GUILDS",
	GUILD_HOME_DEPRECATION_OVERRIDE = "GUILD_HOME_DEPRECATION_OVERRIDE",
	GUILD_HOME_OVERRIDE = "GUILD_HOME_OVERRIDE",
	GUILD_HOME_TEST = "GUILD_HOME_TEST",
	GUILD_MEMBER_VERIFICATION_EXPERIMENT =
		"GUILD_MEMBER_VERIFICATION_EXPERIMENT",
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
	WELCOME_SCREEN_ENABLED = "WELCOME_SCREEN_ENABLED"
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

    @ManyToOne(() => User, U => U.OwnedGuilds, { eager: true, onDelete: "CASCADE", orphanedRowAction: "nullify" })
	@JoinColumn()
    Owner: User;

    @Column({ nullable: true })
    VanityInviteURL?: string;

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

    @OneToMany(() => Membership, U => U.ToGuild, { orphanedRowAction: "delete", onDelete: "CASCADE" })
	@JoinTable()
    Members: Membership[];

    @OneToMany(() => Channel, C => C.OwnerGuild, { eager: true, orphanedRowAction: "delete", onDelete: "CASCADE" })
	@JoinColumn()
    Channels: Channel[];

	@OneToMany(() => Role, R => R.InGuild, { eager: true, orphanedRowAction: "delete", onDelete: "CASCADE" })
	@JoinColumn()
	Roles: Role[];

	@OneToMany(() => Invite, I => I.InGuild, { eager: true, orphanedRowAction: "delete", onDelete: "CASCADE" })
	@JoinColumn()
	Invites: Invite[];

	DefaultRole() {
		return this.Roles.find(R => R.ID === this.ID);
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
			emojis: [],
			stickers: []
		};
	}

	Package(UserContext: User) {
		const Boosters = this.Members?.filter(M => M.BoostingSince).length;
		const UserMembershipHere = UserContext.Memberships?.find(x => x.ToGuild.ID === this.ID);

		return {
			id: this.ID,
			name: this.Name,
			icon: this.IconID,
			splash: this.BannerID,
			discovery_splash: this.BannerID,
			owner: UserContext.ID === this.Owner.ID,
			owner_id: this.Owner.ID,
			permissions: UserMembershipHere ? GetHighestRole(UserMembershipHere).Permissions.toString() : "0",
			afk_channel_id: "",
			afk_timeout: 0,
			widget_enabled: true,
			widget_channel_id: null,
			verification_level: 0,
			default_message_notifications: 0,
			explicit_content_filter: 0,
			roles: this.Roles?.map(R => R.Package()),
			emojis: [],
			features: this.Features,
			mfa_level: 0,
			joined_at: CreateTimestamp(new Date()),
			large: this.Members?.length > 100,
			unavailable: this.Disabled,
			member_count: this.Members?.length,
			channels: this.Channels?.map(C => C.GuildPackage(this.ID)),
			threads: [],
			max_members: this.MaximumMembers,
			vanity_url: this.VanityInviteURL,
			description: this.Description,
			banner: this.BannerID,
			premium_tier: Boosters >= 14 ? 3 : Boosters >= 7 ? 2 : Boosters >= 2 ? 1 : 0,
			premium_subscription_count: Boosters,
			preferred_locale: "en-US",
			nsfw_level: 0
		};
	}

	GatewayPackage(UserContext: User) {
		return {
			application_command_counts: {},
			channels: this.Channels ? this.Channels.map(C => C.GuildPackage(this.ID)) : [],
			data_mode: "full",
			emojis: [],
			guild_scheduled_events: [],
			id: this.ID,
			joined_at: CreateTimestamp(new Date()),
			large: this.Members ? this.Members.length > 100 : false,
			lazy: true,
			member_count: this.Members ? this.Members.length : 1,
			premium_subscription_count: this.Members ? this.Members.filter(M => M.BoostingSince).length : 0,
			properties: this.Package(UserContext),
			roles: this.Roles?.map(R => R.Package()),
			stage_instances: [],
			stickers: [],
			threads: [],
			version: Date.now()
		};
	}

	GatewayPackageEvent(UserContext: User) {
		return {
			application_command_counts: {},
			channels: this.Channels ? this.Channels.map(C => C.GuildPackage(this.ID)) : [],
			data_mode: "full",
			emojis: [],
			guild_scheduled_events: [],
			id: this.ID,
			joined_at: CreateTimestamp(new Date()),
			large: this.Members ? this.Members.length > 100 : false,
			lazy: true,
			member_count: this.Members ? this.Members.length : 1,
			premium_subscription_count: this.Members ? this.Members.filter(M => M.BoostingSince).length : 0,
			properties: this.Package(UserContext),
			roles: this.Roles?.map(R => R.Package()),
			stage_instances: [],
			stickers: [],
			threads: [],
			members: this.Members ? this.Members.map(C => C.Package()) : [ UserContext.Memberships.find(M => M.ToGuild.ID === this.ID).Package() ],
			presences: [], // TODO
			embedded_activities: [], // same as ready embedded_activities
			version: Date.now()
		};
	}

	GatewaySupplementalPackage() {
		return {
			embedded_activities: [],
			id: this.ID,
			voice_states: [], // TODO: for voice chats
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

	@ManyToOne(() => Guild, G => G.Roles, { onDelete: "CASCADE", orphanedRowAction: "delete" })
	InGuild: Guild;

	@ManyToMany(() => Membership, M => M.ToGuild, { orphanedRowAction: "nullify" })
	@JoinTable()
	Members: Membership[];

	@Column({ default: Permissions.CONNECT | Permissions.SPEAK | Permissions.CREATE_INSTANT_INVITE | Permissions.VIEW_CHANNEL | Permissions.SEND_MESSAGES | Permissions.READ_MESSAGE_HISTORY })
	Permissions: Permissions;

	@Column()
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
			tags: {}
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

	@ManyToOne(() => Guild, G => G.Invites)
	InGuild: Guild;

	@Column({ default: InviteType.GUILD })
	Type: InviteType;

	@ManyToOne(() => Channel, C => C.Invites, { eager: true, nullable: true })
	LinkedChannel?: Channel;

	@ManyToOne(() => User, U => U.CreatedInvites, { eager: true })
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
			temporary: false,
			inviter: this.InviteOwner.PackageSmall(),
			channel: null // TODO
		};
	}

	PackagePublic() {
		return {
			code: this.InviteCode,
			guild: this.InGuild.Partial(),
			type: this.Type,
			expires_at: this.Expires ? CreateTimestamp(this.Expires) : null,
			approximate_member_count: 0,
			approximate_presence_count: 0, // TODO
			channel: null // TODO
		};
	}
}

// TODO: Emojis