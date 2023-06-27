import { API_HOST } from "@/util/constants";
import { useEffect, useState } from "react";

export const enum UserFlags {
    STAFF = 1 << 0,
    PARTNER = 1 << 1,
    HYPESQUAD = 1 << 2,

    BUG_HUNTER_LEVEL_1 = 1 << 3,

    MFA_SMS = 1 << 4,
    PREMIUM_PROMO_DISMISSED = 1 << 5,

    HYPESQUAD_BRAVERY = 1 << 6,
    HYPESQUAD_BRILLIANCE = 1 << 7,
    HYPESQUAD_BALANCE = 1 << 8,

    EARLY_NITRO_BADGE = 1 << 9,
    IS_TEAM = 1 << 10,

    INTERNAL_APPLICATION = 1 << 11,
    SYSTEM = 1 << 12,
    HAS_UNREAD_URGENT_MESSAGES = 1 << 13,

    BUG_HUNTER_LEVEL_2 = 1 << 14,

    UNDERAGE_DELETED = 1 << 15,

    VERIFIED_BOT = 1 << 16,
    VERIFIED_DEVELOPER = 1 << 17,
    CERTIFIED_MODERATOR = 1 << 18,

    BOT_HTTP_INTERACTIONS = 1 << 19,
    SPAMMER = 1 << 20,
    DISABLE_NITRO = 1 << 21,

    ACTIVE_DEVELOPER = 1 << 22,

    // 22 ... 33 unknown

    HIGH_GLOBAL_RATELIMIT = 1 << 33,

    DELETED = 1 << 34,
    DISABLED_FOR_SUSPICIOUS_ACTIVITY = 1 << 35,
    SELF_DELETED = 1 << 36,
    PREMIUM_DISCRIMINATOR = 1 << 37,

    USED_DESKTOP_CLIENT = 1 << 38,
    USED_WEB_CLIENT = 1 << 39,
    USED_MOBILE_CLIENT = 1 << 40,

    DISABLED = 1 << 41,

    VERIFIED_EMAIL = 1 << 43,
    QUARANTINED = 1 << 44,

    STAFF_COLLABORATOR = 1 << 50,
    STAFF_RESTRICTED_COLLABORATOR = 1 << 51,
}

export interface IUser {
	accent_color: string | null,
	avatar: string | null,
	avatar_decoration: string | null,
	desktop: boolean,
	discriminator: string,
	display_name: string,
	email: string,
	flags: UserFlags,
	global_name: string,
	id: string,
	mfa_enabled: boolean,
	mobile: boolean,
	nsfw_allowed: boolean,
	phone: string,
	premium: boolean,
	premium_type: number,
	premium_usage_flags: number,
	public_flags: UserFlags,
	purchased_flags: number,
	username: string,
	system: boolean,
	verified: boolean,
	bot: boolean,
	theme_colors: number[]
}

export default function UserCard(props: { user: IUser }) {
	const [userPfp, setUserPfp] = useState<string>();

	useEffect(() => {
		if ((props.user.flags & UserFlags.SYSTEM) === UserFlags.SYSTEM)
			return setUserPfp("https://cdn.discordapp.com/embed/avatars/0.png");

		if (props.user.avatar !== null)
			return setUserPfp(`${API_HOST}/cdn/avatars/${props.user.avatar}.png`);

		if (props.user.discriminator !== "0" && props.user.discriminator !== "0000")
			return setUserPfp(`https://cdn.discordapp.com/embed/avatars/${Number(props.user.discriminator) % 5}.png`);
			
		setUserPfp(`https://cdn.discordapp.com/embed/avatars/${(BigInt(props.user.id) >> 22n) % 6n}.png`);
	}, []);

	return (<div className="data-box">
		<img src={userPfp} style={{ verticalAlign: "middle" }} className="profile-picture"></img>
		<h2 style={{ padding: "0px 0px 0px 10px", margin: "0px 5px 12px 0px", display: "inline", verticalAlign: "middle" }}>
			{props.user.username}#{props.user.discriminator}
		</h2>
		<span style={{ color: "var(--discord-text-muted)", fontSize: 16, verticalAlign: "middle" }}>
			({props.user.id})
		</span>
	</div>);
}