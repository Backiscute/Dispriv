import { Guild } from "../Entities/Guild";
import { User } from "../Entities/User";
import { UserFlags } from "./Flags";

/* idrk how to use typeorm so this'll have to do */
const SampleUser = new User();
const UserType = SampleUser.Package();

const SampleGuild = new Guild();
const GuildType = SampleGuild.GatewayPackage(SampleUser);

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
    guild_id: string;
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
    connected_accounts: any[];
    consents: { [key: string]: { consented: boolean } };
    country_code: string;
    experiments: any[];
    friend_suggestion_count: number;
    geo_ordered_rtc_regions: string[];
    guild_experiments: any[];
    guild_join_requests: any[];
    guilds: (typeof GuildType)[]; // todo: type
    merged_members: {
        avatar: any;
        nick: string;
        roles: string[];
        joined_at: string;
        deaf: boolean;
        mute: boolean;
        premium_since: string;
        pending: boolean;
        communication_disabled_until: any;
        user_id: string;
    }[][];
    private_channels: any[];
    read_state: { entries: any[]; partial: boolean; version: number };
    relationships: any[];
    resume_gateway_url: string;
    session_id: string;
    session_type: string;
    sessions: any[];
    tutorial: { indicators_confirmed: string[]; indicators_suppressed: boolean };
    user: typeof UserType;
    user_guild_settings: { entries: any[]; partial: boolean; version: number };
    user_settings_proto: any;
    users: {
        avatar: string;
        avatar_decoration: any;
        bot: boolean;
        discriminator: string;
        display_name: string;
        global_name: string;
        id: string;
        public_flags: UserFlags;
        username: string;
    }[];
    v: number;
}

export interface ReadySupplementalPacket {
    disclose?: string[];
    guilds: {
        embedded_activities: any[];
        id: string;
        voice_states: {
            channel_id: string;
            deaf: boolean;
            mute: boolean;
            request_to_speak_timestamp: string;
            self_deaf: boolean;
            self_mute: boolean;
            self_video: boolean;
            session_id: string;
            suppress: boolean;
            user_id: string;
        }[];
    }[];
    lazy_private_channels: any[];
    merged_members: {
        avatar: any;
        nick: string;
        roles: string[];
        joined_at: string;
        deaf: boolean;
        mute: boolean;
        premium_since: string;
        pending: boolean;
        communication_disabled_until: any;
        user_id: string;
    }[][];
    merged_presences: {
        friends: any[];
        guilds: any[];
    };
}
