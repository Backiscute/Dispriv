import { IUser as IPackagedUser } from "@/components/UserCard";

export interface User {
    ID: string;
    Username: string;
    Discriminator: string;
    Email: string;
    Password: string;
    Bio: string;
    DateOfBirth: Date;
    AvatarID?: string;
    BannerID?: string;
    AvatarDecoration?: string;
    BannerColor?: string;
    AvailableSuperreactions: number;
    Bot: boolean;
    Badges: any[];
    AuthorizedApps: any[];
    BotApplication?: any;
    Flags: any;
    Presence: any;
    AvailableDMs: any[];
    MessagesByUser: any[];
    RelationsFrom: any[];
    RelationsRegarding: any[];
    Applications: any[];
    OwnedGuilds: any[];
    CreatedInvites: any[];
    Memberships: any[];
    TutorialSuppressed: boolean;
    TutorialReadIndicators: string[];
    SettingsProto: string;
}

export interface GatewayConnection {
    ID: string;
    UserToken: string;
    SocketClient: WebSocket;
    UseZlib: boolean;
    Encoding: "etf" | "json";
    Account?: User;
	PackagedAccount?: IPackagedUser;
    Intents: number;
}

export interface WebsocketPacket {
    connections: GatewayConnection[];
    action: "add" | "remove";
}

