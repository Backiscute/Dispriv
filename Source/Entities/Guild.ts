import { BaseEntity, Column, Entity, ManyToMany, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { User } from "./User";
import { Channel } from "./Channel";

export const enum GuildFeatures {
    COMMUNITY = "COMMUNITY",
    PREVIEW_ENABLED = "PREVIEW_ENABLED",
    ROLE_ICONS = "ROLE_ICONS",
    TEXT_IN_VOICE_ENABLED = "TEXT_IN_VOICE_ENABLED",
    WELCOME_SCREEN_ENABLED = "WELCOME_SCREEN_ENABLED",
    MEMBER_PROFILES = "MEMBER_PROFILES",
    NEW_THREAD_PERMISSIONS = "NEW_THREAD_PERMISSIONS",
    PRIVATE_THREADS = "PRIVATE_THREADS",
    BANNER = "BANNER",
    DISCOVERABLE = "DISCOVERABLE",
    SEVEN_DAY_THREAD_ARCHIVE = "SEVEN_DAY_THREAD_ARCHIVE",
    SOUNDBOARD = "SOUNDBOARD",
    THREADS_ENABLED = "THREADS_ENABLED",
    ANIMATED_ICON = "ANIMATED_ICON",
    ENABLED_DISCOVERABLE_BEFORE = "ENABLED_DISCOVERABLE_BEFORE",
    THREE_DAY_THREAD_ARCHIVE = "THREE_DAY_THREAD_ARCHIVE",
    NEWS = "NEWS",
    VANITY_URL = "VANITY_URL",
    ANIMATED_BANNER = "ANIMATED_BANNER",
    GUILD_WEB_PAGE_VANITY_URL = "GUILD_WEB_PAGE_VANITY_URL",
    COMMUNITY_EXP_MEDIUM = "COMMUNITY_EXP_MEDIUM",
    INVITE_SPLASH = "INVITE_SPLASH",
    MEMBER_VERIFICATION_GATE_ENABLED = "MEMBER_VERIFICATION_GATE_ENABLED",
    RAID_ALERTS_ENABLED = "RAID_ALERTS_ENABLED",
    GUILD_ONBOARDING_HAS_PROMPTS = "GUILD_ONBOARDING_HAS_PROMPTS",
    AUTOMOD_TRIGGER_USER_PROFILE = "AUTOMOD_TRIGGER_USER_PROFILE",
    GUILD_ONBOARDING = "GUILD_ONBOARDING",
    COMMUNITY_EXP_LARGE_GATED = "COMMUNITY_EXP_LARGE_GATED",
    GUILD_SERVER_GUIDE = "GUILD_SERVER_GUIDE",
    GUILD_ONBOARDING_EVER_ENABLED = "GUILD_ONBOARDING_EVER_ENABLED",
    CREATOR_MONETIZABLE_RESTRICTED = "CREATOR_MONETIZABLE_RESTRICTED",
    AUTO_MODERATION = "AUTO_MODERATION"
}

@Entity()
export class Guild extends BaseEntity {
    @PrimaryColumn()
    ID: string;

    @Column()
    Name: string;

    @ManyToOne(() => User, U => U.OwnedGuilds)
    Owner: User;

    @Column({ nullable: true })
    VanityInviteURL?: string;

    @Column({ default: false })
    ClassifiedAsNSFW: boolean;

    @Column({ nullable: true })
    Description?: string;

    @Column({ type: "simple-array" })
    Features: GuildFeatures[];

    @Column({ default: 1000 })
    MaximumMembers: number;

    @ManyToMany(() => User, U => U.Guilds)
    Members: User[];

    @OneToMany(() => Channel, C => C.OwnerGuild, { eager: true })
    Channels: Channel[];
}

// TODO: Emojis