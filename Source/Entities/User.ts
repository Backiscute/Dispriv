/* eslint-disable */
import { BaseEntity, Entity, PrimaryColumn, Column, ManyToOne, OneToMany, ManyToMany, JoinTable, OneToOne } from 'typeorm';
import { UserFlags } from "../Classes/Flags";
import { Message } from "./Message";
import { Relation } from './FriendUser';
import { Application } from '../Handlers/Server';
import { DiscordApplication } from './Application';
import { Channel } from './Channel';
import { Guild, Role } from './Guild';
import { CreateTimestamp } from '../Modules/DiscordUtils';

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

	@OneToOne(() => DiscordApplication, DA => DA.Bot, { nullable: true })
	BotApplication?: DiscordApplication;

	@Column({ default: UserFlags.VERIFIED_EMAIL })
	Flags: UserFlags;

	@ManyToMany(() => Channel, C => C.DMRecipients)
	@JoinTable()
	AvailableDMs: Channel[];

	@OneToMany(() => Message, M => M.Author)
	@JoinTable()
	MessagesByUser: Message[];

	@OneToMany(() => Relation, Rel => Rel.From)
	@JoinTable()
	RelationsFrom: Relation[];

	@OneToMany(() => Relation, Rel => Rel.Regarding)
	@JoinTable()
	RelationsRegarding: Relation[];

	@OneToMany(() => DiscordApplication, Rel => Rel.Owner)
	@JoinTable()
	Applications: DiscordApplication[];

	@OneToMany(() => Guild, G => G.Owner)
	@JoinTable()
	OwnedGuilds: Guild[];

	@OneToMany(() => Membership, M => M.Owner)
	@JoinTable()
	Memberships: Membership[];

	@Column({ default: false })
	TutorialSuppressed: boolean;

	@Column({ type: "simple-array" })
	TutorialReadIndicators: string[];

	HasFlag(Flag: UserFlags) {
		return (this.Flags & Flag) === Flag;
	}

	Package() {
		return {
			accent_color: null,
			avatar: null,
			avatar_decoration: null,
			banner: null,
			banner_color: null,
			bio: this.Bio,
			desktop: true,
			discriminator: this.Discriminator,
			display_name: this.Username,
			email: this.Email,
			flags: 0,
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
			verified: true,
			bot: this.Bot
		}
	}

	PackagePublic() {
		return {
			accent_color: null,
			avatar: null,
			avatar_decoration: null,
			banner: null,
			banner_color: null,
			bio: this.Bio,
			discriminator: this.Discriminator,
			display_name: this.Username,
			flags: 1 << 1, // 1 << 0 = Nitro Classic, 1 << 1 = Nitro, 1 << 2 = Guild Boost, 1 << 3 = Nitro Basic
			global_name: this.Username,
			id: this.ID,
			public_flags: this.Flags,
			username: this.Username,
			bot: this.Bot
		}
	}

	PackageSmall() {
		return {
			avatar: null,
			avatar_decoration: null,
			bot: this.Bot,
			discriminator: this.Discriminator,
			display_name: this.Username,
			global_name: this.Username,
			id: this.ID,
			public_flags: this.Flags,
			username: this.Username
		};
	}

	Gateway(MemberOf: Membership) {
		return {
			avatar: null,
			communication_disabled_until: null,
			deaf: MemberOf.Deafened,
			flags: 0,
			joined_at: MemberOf.CreatedAt,
			mute: MemberOf.Muted,
			nick: null,
			pending: false,
			premium_since: null,
			roles: MemberOf.Roles.map(R => R.ID),
			user: this.PackageSmall()
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
		}
	}
}

@Entity()
export class Membership extends BaseEntity {
	@PrimaryColumn()
	ID: string;

	@Column()
	CreatedAt: Date;

	@Column({ nullable: true })
	BoostingSince?: Date;

	@Column({ default: false })
	Muted: boolean;

	@Column({ default: false })
	Deafened: boolean;

	@ManyToOne(() => User, U => U.Memberships, { eager: true })
	@JoinTable()
	Owner: User;

	@Column({ nullable: true })
	GuildNickname?: string;

	@ManyToOne(() => Guild, G => G.Members)
	@JoinTable()
	ToGuild: Guild;

	@ManyToMany(() => Role, R => R.Members)
	@JoinTable()
	Roles: Role[];

	Package(IncludeUser: boolean = true/*, ChannelContext: Channel*/) {
		return {
			user: IncludeUser ? this.Owner.Partial() : undefined,
			nick: this.GuildNickname,
			roles: this.Roles ? this.Roles.map(R => R.ID) : [],
			joined_at: CreateTimestamp(this.CreatedAt),
			deaf: this.Deafened,
			mute: this.Muted,
			premium_since: this.BoostingSince ? CreateTimestamp(this.BoostingSince) : undefined,
			pending: false,
			/*permissions: ChannelContext.CalculatePermissions(this.Roles[0])*/
		}
	}
}