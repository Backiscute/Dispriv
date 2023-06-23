import { req } from "@/util/apiFuncs";
import { useState } from "react";

export enum GuildFeatures {
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

export interface IServer {
    id: string;
    name: string;
    icon: string | undefined;
    splash: string | undefined;
    discovery_splash: string | undefined;
    owner: boolean;
    owner_id: string;
    permissions: string;
    afk_channel_id: string;
    afk_timeout: number;
    widget_enabled: boolean;
    widget_channel_id: null;
    verification_level: number;
    default_message_notifications: number;
    explicit_content_filter: number;
    roles: {
        id: string;
        name: string;
        description: string | undefined;
        color: number;
        flags: number;
        hoist: boolean;
        icon: string | undefined;
        unicode_emoji: string | undefined;
        position: number;
        permissions: string;
        managed: boolean;
        mentionable: boolean;
        tags: {};
    }[];
    emojis: never[];
    features: GuildFeatures[];
    mfa_level: number;
    joined_at: string;
    large: boolean;
    unavailable: boolean;
    member_count: number;
    channels: {
        bitrate: number | undefined;
        user_limit: number | undefined;
        video_quality_mode: number | undefined;
        rtc_region: string | undefined;
        id: string;
        type: any;
        guild_id: string | undefined;
        parent_id: string | null;
        position: number;
        permission_overwrites: never[];
        name: string;
        nsfw: boolean;
        last_message_id: string | null;
        flags: number;
        topic: string | null;
        rate_limit_per_user: number;
    }[];
    threads: never[];
    max_members: number;
    vanity_url: string | undefined;
    description: string | undefined;
    banner: string | undefined;
    premium_tier: number;
    premium_subscription_count: number;
    preferred_locale: string;
    nsfw_level: number;
}

export default function GuildCard(props: { server: IServer }) {
    const [server, setServer] = useState<IServer>(props.server);
    return (
        <div>
            <div className="guild-card">
                <h3 style={{ padding: 0, margin: "0px 0px 12px 0px" }}>
                    {server.name} [{server.id}]
                </h3>
                <div>
                    {Object.keys(GuildFeatures).map((feature) => (
                        <div key={feature}>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                }}
                            >
                                <input
                                    style={{
                                        marginTop: "5px",
                                        marginBottom: "5px",
                                        marginRight: "8px",
                                        width: "13px",
                                        height: "13px"
                                    }}
                                    type="checkbox"
                                    key={feature}
                                    defaultChecked={server.features.includes(
                                        feature as GuildFeatures
                                    )}
                                    onClick={async (e) => {
                                        e.preventDefault();
                                        const res = await req(
                                            `/server/${server.id}/features`,
                                            "PATCH",
                                            {
                                                features:
                                                    server.features.includes(
                                                        feature as GuildFeatures
                                                    )
                                                        ? server.features.filter(
                                                            (f) =>
                                                                f !== feature
                                                        )
                                                        : [
                                                            ...server.features,
                                                            feature,
                                                        ],
                                            }
                                        );
                                        setServer(res);
                                        (e.target as HTMLInputElement).checked =
                                            !(e.target as HTMLInputElement)
                                                .checked;
                                    }}
                                />
                                {feature
                                    .split("_")
                                    .map(
                                        (word) =>
                                            word[0].toUpperCase() +
                                            word.slice(1).toLowerCase()
                                    )
                                    .join(" ")}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
