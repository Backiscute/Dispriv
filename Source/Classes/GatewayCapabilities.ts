/* eslint-disable no-unused-vars */
export enum GatewayCapabilities {
    LAZY_USER_NOTES = 1 << 0,
    NO_AFFINE_USER_IDS = 1 << 1,
    VERSIONED_READ_STATES = 1 << 2,
    VERSIONED_USER_GUILD_SETTINGS = 1 << 3,
    DEDUPE_USER_OBJECTS = 1 << 4,
    PRIORITIZED_READY_PAYLOAD = 1 << 5,
    MULTIPLE_GUILD_EXPERIMENT_POPULATIONS = 1 << 6,
    NON_CHANNEL_READ_STATES = 1 << 7,
    AUTH_TOKEN_REFRESH = 1 << 8,
    USER_SETTINGS_PROTO = 1 << 9,
    CLIENT_STATE_V2 = 1 << 10,
    PASSIVE_GUILD_UPDATE = 1 << 11,
    UNKNOWN = 1 << 12,
}

// https://discord-userdoccers.vercel.app/topics/gateway#list-of-capabilities
