import { Router } from "express";
import { GenerateSnowflake, GetUserByRequest, VerifyAuth } from "../Modules/SnowflakeUtils";
import { Guild, GuildFeatures, Role } from "../Entities/Guild";
import { Membership } from "../Entities/User";
import { FindConnection, SendOp } from "../Modules/GatewayUtils";
import { OpCodes } from "../Classes/OpCodes";
import { Permissions } from "../Classes/Flags";
import { Channel } from "../Entities/Channel";

const App = Router();

App.post("/", VerifyAuth, async (req, res) => {
	if (!req.body.name) return;
	const MyUser = await GetUserByRequest(req, { Memberships: { Owner: false, ToGuild: true } });

	if (MyUser.Memberships.length >= 100) return res.status(400).json({ code: 0, message: "You're in too many guilds!" });

	const GuildID = GenerateSnowflake();

	const DefaultRole = await Role.create({
		ID: GuildID,
		Name: "@everyone",
		Color: 0,
		Position: 0,
		Permissions: Permissions.SEND_MESSAGES,
		AnyoneCanMention: false
	}).save();

	const CreatedGuild = await Guild.create({
		ID: GuildID,
		Name: req.body.name,
		Owner: MyUser,
		Features: [
			GuildFeatures.NEWS,
			GuildFeatures.VANITY_URL,
			GuildFeatures.COMMERCE
		],
		Roles: [DefaultRole]
	}).save();

	await Channel.create({
		ID: GenerateSnowflake(),
		DisplayName: "general",
		OwnerGuild: CreatedGuild
	}).save();

	await Membership.create({
		ID: CreatedGuild.ID,
		Owner: MyUser,
		ToGuild: CreatedGuild,
		CreatedAt: new Date(),
		Roles: [DefaultRole]
	}).save();

	await CreatedGuild.reload();

	const Conn = FindConnection(MyUser.ID);
	if (!Conn) return res.json(CreatedGuild.Package(MyUser));

	SendOp(Conn, OpCodes.DISPATCH, CreatedGuild.GatewayPackageEvent(MyUser), 24, "GUILD_CREATE");
	res.json(CreatedGuild.Package(MyUser));
});

module.exports = {
    DefaultAPI: "/api/v9/guilds",
    App
};