import MurmurHash3 from "murmurhash3js";
import { Message } from "../Entities/Message";
import { Channel } from "../Entities/Channel";
import { FindConnection, HasIntent, SendOp } from "./GatewayUtils";
import { GatewayIntents } from "../Classes/GatewayIntents";
import { OpCodes } from "../Classes/GatewayOpCodes";
import { Guild, Role } from "../Entities/Guild";
import { Membership, User } from "../Entities/User";
import { Permissions } from "../Classes/Flags";

export const DISCORD_EPOCH = 1420070400000;

export function CreateTimestamp(DateToConvert?: Date) { // Creates a timestamp in ISO 8601 format (Discord uses timezone offset +00:00)
    const NewDate = DateToConvert ?? new Date();
    const IsoStringInUTC = NewDate.toISOString().replace("Z", "+00:00");
    return IsoStringInUTC;
}

export function GenerateExperimentHash(Name: string): number {
  const Hash = MurmurHash3.x86.hash32(Name);
  return Hash >>> 0;
}

export async function HasPermission(Usr: Membership, Permission: Permissions) {
	const HR = GetHighestRole(Usr);
	if ((HR.Permissions & Permissions.ADMINISTRATOR) === Permissions.ADMINISTRATOR)
		return true;

	return (HR.Permissions & Permission) === Permission;
}

export function MembershipFromGuild(Usr: User, Server: Guild) {
	return Usr.Memberships.find(x => x.ToGuild.ID === Server.ID);
}

export function GetHighestRoleInArr(R: Role[]) {
	return R.reduce((A, B) => (A.Position > B.Position) ? A : B);
}

export function GetHighestRole(Usr: Membership) {
	return GetHighestRoleInArr(Usr.Roles);
}

export async function SendToSelf(Usr: User, Opcode: OpCodes, Data: unknown = null, s: unknown = null, t: unknown = null) {
	const Conn = FindConnection(Usr.ID);
	if (!Conn) return;

	SendOp(Conn, Opcode, Data, s, t);
}

export async function SendGuildMemberUpdate(Usr: User) {
	const AlreadySentTo: string[] = [];
	
	Usr.Memberships.forEach(R => {
		const SentGuild = R.ToGuild;

		SentGuild.Members.forEach(Recipient => {
			if (AlreadySentTo.includes(Recipient.Owner.ID)) return;

			const Conn = FindConnection(Recipient.Owner.ID);
			if (!Conn) return;
			//if (!HasIntent(Conn.Intents, GatewayIntents.GUILD_MESSAGES)) return;
	
			AlreadySentTo.push(Recipient.Owner.ID);
			SendOp(Conn, OpCodes.DISPATCH, {
				...R.Package(),
				guild_id: SentGuild.ID
			}, 666, "GUILD_MEMBER_UPDATE");
		});
	});
}

export async function SendToConnections(Usr: User, Opcode: OpCodes, Data: unknown = null, s: unknown = null, t: unknown = null) {
	const AlreadySentTo: string[] = [];

	[...Usr.RelationsFrom, ...Usr.RelationsRegarding].forEach(R => {
		const OtherUser = R.From.ID === Usr.ID ? R.Regarding : R.From;
		if (AlreadySentTo.includes(OtherUser.ID)) return;

		const Conn = FindConnection(OtherUser.ID);
		if (!Conn) return;

		AlreadySentTo.push(OtherUser.ID);
		SendOp(Conn, Opcode, Data, s, t);
	});

	Usr.Memberships.forEach(R => {
		const SentGuild = R.ToGuild;
		SentGuild.Members.forEach(Recipient => {
			if (AlreadySentTo.includes(Recipient.Owner.ID)) return;

			const Conn = FindConnection(Recipient.Owner.ID);
			if (!Conn) return;
			//if (!HasIntent(Conn.Intents, GatewayIntents.GUILD_MESSAGES)) return;
	
			AlreadySentTo.push(Recipient.Owner.ID);
			SendOp(Conn, Opcode, Data, s, t);
		});
	});
}

export async function SendToMembers(ServerID: string, Opcode: OpCodes, Data: unknown = null, s: unknown = null, t: unknown = null) {
	const SentGuild = await Guild.findOne({ where: { ID: ServerID }, relations: { Members: true } });

	if (!SentGuild) return;
		
	SentGuild.Members.forEach(Recipient => {
		const Conn = FindConnection(Recipient.Owner.ID);
		if (!Conn) return;
		//if (!HasIntent(Conn.Intents, GatewayIntents.GUILD_MESSAGES)) return;

		SendOp(Conn, Opcode, Data, s, t);
	});
}

export async function SendToDMOrServer(Chnl: Channel, Opcode: OpCodes, Data: unknown = null, s: unknown = null, t: unknown = null) {
	if (Chnl.IsDM) {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		Chnl.DMRecipients!.forEach(Recipient => {
			const Conn = FindConnection(Recipient.ID);

			if (!Conn) return;
			if (!HasIntent(Conn.Intents, GatewayIntents.DIRECT_MESSAGES)) return;

			SendOp(Conn, Opcode, Data, s, t);
		});
	} else {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const SentGuild = await Guild.findOne({ where: { ID: Chnl.OwnerGuild!.ID }, relations: { Roles: false, Invites: false, Channels: false, Members: true } });
		
		if (SentGuild) SentGuild.Members.forEach(Recipient => {
			const Conn = FindConnection(Recipient.Owner.ID);
			if (!Conn) return;
			if (!HasIntent(Conn.Intents, GatewayIntents.GUILD_MESSAGES)) return;

			SendOp(Conn, Opcode, Data, s, t);
		});
	}
}

export async function SendMessage(Msg: Message) {
	SendToDMOrServer(Msg.Channel, OpCodes.DISPATCH, Msg.Package(), 69420, "MESSAGE_CREATE");
}

export function GenerateRandomString(Count = 8, OverrideChars = ""): string {
  let Result = "";
  const Characters = OverrideChars === "" ? "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" : OverrideChars;
  for (let I = 0; I < Count; I++) {
    Result += Characters.charAt(Math.floor(Math.random() * Characters.length));
  }
  return Result;
}