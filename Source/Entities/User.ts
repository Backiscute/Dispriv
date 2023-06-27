import {
    BaseEntity,
    Entity,
    PrimaryColumn,
    Column,
    ManyToOne,
    OneToMany,
    ManyToMany,
    JoinTable,
    OneToOne,
} from "typeorm";
import { UserFlags } from "../Classes/Flags";
import { Message } from "./Message";
import { Relation } from "./FriendUser";
import { DiscordApplication } from "./Application";
import { Channel } from "./Channel";
import { Guild, Invite, Role } from "./Guild";
import { CreateTimestamp, GetHighestRoleInArr } from "../Modules/DiscordUtils";
import { Presence } from "../Classes/Presence";
import { Badge } from "./Badge";
import { OAuth2App } from "./OAuth2";
import { Gift } from "./Gift";

@Entity()
export class User extends BaseEntity {
    @PrimaryColumn()
        ID: string;

    @Column({ length: 32 })
        Username: string;

    @Column({ length: 4 })
        Discriminator: string;

    @Column()
        Email: string;

    @Column()
        Password: string;

    @Column({ length: 200 })
        Bio: string;

    @Column()
        DateOfBirth: Date;

    @Column({ nullable: true })
        AvatarID?: string;

    @Column({ nullable: true })
        BannerID?: string;

    @Column({ nullable: true })
        AvatarDecoration?: string;

    @Column({ nullable: true })
        BannerColor?: string;

    @Column({ default: 3 })
        AvailableSuperreactions: number;

    @Column({ default: false })
        Bot: boolean;

    @ManyToMany(() => Badge, (B) => B.UsersOwningThis, { orphanedRowAction: "nullify", eager: true })
    @JoinTable()
        Badges: Badge[];
    @OneToMany(() => OAuth2App, (O) => O.AuthorizedUsers, { orphanedRowAction: "nullify", eager: true })
    @JoinTable()
        AuthorizedApps: OAuth2App[];

    @OneToOne(() => DiscordApplication, (DA) => DA.Bot, { nullable: true, onDelete: "CASCADE" })
        BotApplication?: DiscordApplication;

    @Column({ default: UserFlags.VERIFIED_EMAIL })
        Flags: UserFlags;

    @Column({ default: Presence.OFFLINE })
        Presence: Presence;

    @ManyToMany(() => Channel, (C) => C.DMRecipients)
    @JoinTable()
        AvailableDMs: Channel[];

    @OneToMany(() => Message, (M) => M.Author, { orphanedRowAction: "delete" })
    @JoinTable()
        MessagesByUser: Message[];

    @OneToMany(() => Relation, (Rel) => Rel.From, { orphanedRowAction: "delete" })
    @JoinTable()
        RelationsFrom: Relation[];

    @OneToMany(() => Relation, (Rel) => Rel.Regarding, { orphanedRowAction: "delete" })
    @JoinTable()
        RelationsRegarding: Relation[];

    @OneToMany(() => DiscordApplication, (Rel) => Rel.Owner, { orphanedRowAction: "delete" })
    @JoinTable()
        Applications: DiscordApplication[];

    @OneToMany(() => Guild, (G) => G.Owner, { orphanedRowAction: "delete" })
    @JoinTable()
        OwnedGuilds: Guild[];

    @OneToMany(() => Invite, (I) => I.InviteOwner)
    @JoinTable()
        CreatedInvites: Invite[];

    @OneToMany(() => Membership, (M) => M.Owner, { orphanedRowAction: "delete" })
    @JoinTable()
        Memberships: Membership[];

    @Column({ default: false })
        TutorialSuppressed: boolean;

    @Column({ type: "simple-array" })
        TutorialReadIndicators: string[];

    @Column({ type: "simple-array" })
        SettingsProto: string[] = ["CgIYAWIJCgcKBWVuLVVT"];

    @OneToMany(() => Gift, (G) => G.User)
        Gifts: Gift[];
    
    @Column({ type: "simple-array", nullable: true })
        ThemeColors: number[] = [];

    HasFlag(Flag: UserFlags) {
        return (this.Flags & Flag) === Flag;
    }

    Package() {
        return {
            accent_color: null,
            avatar: this.AvatarID,
            avatar_decoration: null,
            desktop: true,
            discriminator: this.Discriminator,
            display_name: this.Username,
            email: this.Email,
            flags: this.Flags,
            global_name: this.Username,
            id: this.ID,
            mfa_enabled: true,
            mobile: true,
            nsfw_allowed: true,
            phone: "phone number priv when",
            premium: true,
            premium_type: 2,
            premium_usage_flags: 0,
            public_flags: this.Flags,
            purchased_flags: 3,
            username: this.Username,
            system: this.HasFlag(UserFlags.SYSTEM),
            verified: true,
            bot: this.Bot,
            theme_colors: this.ThemeColors
        };
    }

    PackagePublic() {
        return {
            accent_color: null,
            avatar: this.AvatarID,
            avatar_decoration: null,
            banner: this.BannerID,
            banner_color: null,
            bio: this.Bio,
            discriminator: this.Discriminator,
            display_name: this.Username,
            flags: this.Flags, // 1 << 0 = Nitro Classic, 1 << 1 = Nitro, 1 << 2 = Guild Boost, 1 << 3 = Nitro Basic
            global_name: this.Username,
            id: this.ID,
            system: this.HasFlag(UserFlags.SYSTEM),
            public_flags: this.Flags,
            username: this.Username,
            bot: this.Bot
        };
    }

    PackageSmall() {
        return {
            avatar: this.AvatarID,
            avatar_decoration: null,
            bot: this.Bot,
            discriminator: this.Discriminator,
            display_name: this.Username,
            global_name: this.Username,
            id: this.ID,
            system: this.HasFlag(UserFlags.SYSTEM),
            public_flags: this.Flags,
            username: this.Username
        };
    }

    Gateway(MemberOf: Membership) {
        return {
            avatar: MemberOf.AvatarID ?? this.AvatarID,
            banner: MemberOf.BannerID ?? this.BannerID,
            bio: MemberOf.Bio,
            communication_disabled_until: null,
            deaf: MemberOf.Deafened,
            flags: 0,
            joined_at: MemberOf.CreatedAt,
            mute: MemberOf.Muted,
            nick: null,
            pending: false,
            premium_since: null,
            roles: MemberOf.Roles.map((R) => R.ID),
            user: this.PackageSmall(),
        };
    }

    Partial() {
        return {
            id: this.ID,
            username: this.Username,
            discriminator: this.Discriminator,
            avatar: this.AvatarID,
            avatar_decoration: this.AvatarDecoration,
            bot: this.Bot,
            system: this.HasFlag(UserFlags.SYSTEM),
            banner: this.BannerID,
            accent_color: 0,
            public_flags: this.Flags
        };
    }

    PartialVoice() {
        return {
            avatar: this.AvatarID,
            avatar_decoration: this.AvatarDecoration,
            bot: this.Bot,
            discriminator: this.Discriminator,
            display_name: null,
            global_name: null,
            id: this.ID,
            public_flags: this.Flags,
            username: this.Username
        };
    }
}

@Entity()
export class Membership extends BaseEntity {
    @PrimaryColumn()
        ID: string;

    @Column({ nullable: true })
        AvatarID?: string;

    @Column({ nullable: true })
        BannerID?: string;

    @Column({ length: 200, nullable: true })
        Bio: string = "";

    @Column()
        CreatedAt: Date;

    @Column({ nullable: true })
        BoostingSince?: Date;

    @Column({ default: false })
        Muted: boolean;

    @Column({ default: false })
        Deafened: boolean;

    @ManyToOne(() => User, (U) => U.Memberships, { eager: true, onDelete: "CASCADE", orphanedRowAction: "delete" })
    @JoinTable()
        Owner: User;

    @Column({ nullable: true })
        GuildNickname?: string;

    @Column({ type: "simple-array", nullable: true })
        ThemeColors: number[] = [];
        
    @ManyToOne(() => Guild, (G) => G.Members, { onDelete: "CASCADE", orphanedRowAction: "delete" })
    @JoinTable()
        ToGuild: Guild;

    @ManyToMany(() => Role, (R) => R.Members, { eager: true, onDelete: "CASCADE", orphanedRowAction: "delete" })
    @JoinTable()
        Roles: Role[];

    Package(IncludeUser: boolean = true /*, ChannelContext: Channel*/) {
        return {
            user: IncludeUser ? this.Owner.Partial() : undefined,
            avatar: this.AvatarID,
            banner: this.BannerID,
            bio: this.Bio,
            nick: this.GuildNickname,
            roles: this.Roles ? this.Roles.map((R) => R.ID) : [],
            joined_at: CreateTimestamp(this.CreatedAt),
            deaf: this.Deafened,
            mute: this.Muted,
            premium_since: this.BoostingSince ? CreateTimestamp(this.BoostingSince) : undefined,
            pending: false,
            permissions: GetHighestRoleInArr(this.Roles).Permissions.toString(),
            theme_colors: this.ThemeColors
        };
    }

    PackageGatewayVoice() {
        return {
            avatar: this.AvatarID,
            communication_disabled_until: null,
            deaf: this.Deafened,
            flags: 0,
            joined_at: CreateTimestamp(this.CreatedAt),
            mute: this.Muted,
            nick: this.GuildNickname,
            pending: false,
            premium_since: this.BoostingSince ? CreateTimestamp(this.BoostingSince) : null,
            roles: this.Roles ? this.Roles.map((R) => R.ID) : [],
            user: this.Owner.PartialVoice(),
        };
    }

    PackageGateway() {
        return [
            {
                avatar: this.AvatarID,
                banner: this.BannerID,
                bio: this.Bio,
                nick: this.GuildNickname,
                roles: this.Roles ? this.Roles.map((R) => R.ID) : [],
                joined_at: CreateTimestamp(this.CreatedAt),
                deaf: this.Deafened,
                mute: this.Muted,
                premium_since: this.BoostingSince ? CreateTimestamp(this.BoostingSince) : undefined,
                pending: false,
                communication_disabled_until: null,
                user_id: this.Owner.ID,
            },
        ];
    }
}
