import MurmurHash3 from "murmurhash3js";
import { Message } from "../Entities/Message";
import { Channel } from "../Entities/Channel";
import { FindConnection, HasIntent, SendOp } from "./GatewayUtils";
import { GatewayIntents } from "../Classes/GatewayIntents";
import { OpCodes } from "../Classes/OpCodes";
import { Guild, Role } from "../Entities/Guild";
import { Membership, User } from "../Entities/User";
import { Permissions } from "../Classes/Flags";

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
	return (GetHighestRole(Usr).Permissions & Permission) === Permission;
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

export async function SendToMembers(ServerID: string, Opcode: OpCodes, Data = null, s = null, t = null) {
	const SentGuild = await Guild.findOne({ where: { ID: ServerID }, relations: { Members: true } });

	if (!SentGuild) return;
		
	SentGuild.Members.forEach(Recipient => {
		const Conn = FindConnection(Recipient.Owner.ID);
		if (!Conn) return;
		//if (!HasIntent(Conn.Intents, GatewayIntents.GUILD_MESSAGES)) return;

		SendOp(Conn, Opcode, Data, s, t);
	});
}

export async function SendMessage(Msg: Message) {
	const PMessage = Msg.Package();

	if (Msg.Channel.IsDM()) {
		Msg.Channel.DMRecipients.forEach(Recipient => {
			const Conn = FindConnection(Recipient.ID);
			//console.log(Conn);
			if (!Conn) return;
			if (!HasIntent(Conn.Intents, GatewayIntents.DIRECT_MESSAGES)) return;

			SendOp(Conn, OpCodes.DISPATCH, PMessage, 14, "MESSAGE_CREATE");
		});
	} else {
		const SentGuild = await Guild.findOne({ where: { ID: Msg.Channel.OwnerGuild.ID }, relations: { Members: true } });
		
		SentGuild.Members.forEach(Recipient => {
			const Conn = FindConnection(Recipient.Owner.ID);
			if (!Conn) return;
			if (!HasIntent(Conn.Intents, GatewayIntents.GUILD_MESSAGES)) return;

			SendOp(Conn, OpCodes.DISPATCH, PMessage, 14, "MESSAGE_CREATE");
		});
	}
}

export function GenerateInviteCode(): string {
  let Result = "";
  const Characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  for (let I = 0; I < 8; I++) {
    Result += Characters.charAt(Math.floor(Math.random() * Characters.length));
  }
  return Result;
}