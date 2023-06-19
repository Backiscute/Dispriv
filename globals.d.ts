declare global {
    namespace NodeJS {
        interface ProcessEnv {
            PORT: string;
            WSPORT: string;
            RTCWSPORT: string;
            DASHBOARD_KEY: string;
        }
    }
}

export {};
