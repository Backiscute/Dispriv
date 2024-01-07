import { Guild } from "../Entities/Guild";
import { Membership, User, UserSettings } from "../Entities/User";

export interface HelloPacket {
    heartbeat_interval: number;
    _trace?: [string];
}

export interface SpeedTestCreatePacket {
    paused: boolean;
    region: string;
    rtc_server_id: string;
    stream_key: string;
    stream_server_id: string;
    viewer_ids: string[];
}

export interface SpeedTestServerUpdatePacket {
    endpoint: string;
    guild_id?: string;
    stream_key: string;
    token: string;
}

export interface VoiceServerUpdatePacket {
    endpoint: string;
    guild_id: string;
    token: string;
}

export interface SpeedTestDeletePacket {
    reason: string;
    stream_key: string;
}

export interface ReadyPacket {
    _trace?: [string];
    analytics_token: string;
    api_code_version: number;
    connected_accounts: unknown[];
    consents: { [key: string]: { consented: boolean } };
    country_code: string;
    application?: object;
    experiments: unknown[];
    friend_suggestion_count: number;
    geo_ordered_rtc_regions: string[];
    guild_experiments: unknown[];
    guild_join_requests: unknown[];
    guilds: ReturnType<typeof Guild.prototype.GatewayPackage>[];
    merged_members: ReturnType<typeof Membership.prototype.PackageGateway>[];
    merged_presences?: {
        friends: unknown[];
        guilds: unknown[];
    };
    private_channels: unknown[];
    notification_settings: { flags: number };
    read_state: { entries: unknown[]; partial: boolean; version: number };
    relationships: unknown[];
    resume_gateway_url: string;
    session_id: string;
    session_type: string;
    sessions: unknown[];
    tutorial: { indicators_confirmed: string[]; indicators_suppressed: boolean };
    user: ReturnType<typeof User.prototype.Package>;
    user_guild_settings: { entries: unknown[]; partial: boolean; version: number };
    user_settings?: UserSettings;
    user_settings_proto: unknown;
    users: ReturnType<typeof User.prototype.PackageSmall>[];
    auth_token?: string;
    v: number;
}

export interface ReadySupplementalPacket {
    disclose?: string[];
    guilds: ReturnType<typeof Guild.prototype.GatewaySupplementalPackage>[];
    lazy_private_channels: unknown[];
    merged_members: ReturnType<typeof Membership.prototype.PackageGateway>[];
    merged_presences: {
        friends: unknown[];
        guilds: unknown[];
    };
}
