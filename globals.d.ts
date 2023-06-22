declare global {
    namespace NodeJS {
        interface ProcessEnv {
            PORT: string;
            WSPORT: string;
            RTCWSPORT: string;
            DASHBOARD_KEY: string;
            OverrideRTC: string;
            OverrideWS: string;
            TenorAPIKey: string;
        }
    }
}

export {};
