export enum RTCOpCodes {
    IDENTIFY = 0,
    SELECT_PROTOCOL = 1,
    READY = 2,
    HEARTBEAT = 3,
    SESSION_DESCRIPTION = 4,
    SPEAKING = 5,
    HEARTBEAT_ACK = 6,
    RESUME = 7,
    HELLO = 8,
    RESUMED = 9,
    CLIENT_DISCONNECT = 13,
    REQUEST_VERSIONS = 16
}

export enum RTCCloseCodes {
    UnknownOpcode = 4001,
    FailedToDecodePayload,
    NotAuthenticated,
    AuthenticationFailed,
    AlreadyAuthenticated,
    SessionNoLongerValid,
    SessionTimeout = 4009,
    ServerNotFound = 4011,
    UnknownProtocol,
    Disconnected = 4014,
    VoiceServerCrashed,
    UnknownEncryptionMode,
    BadPayload
}