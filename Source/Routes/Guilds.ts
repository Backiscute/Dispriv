import { Router } from "express";
import { GenerateSnowflake, GetUserByRequest, VerifyAuth } from "../Modules/SnowflakeUtils";
import { Guild, GuildFeatures, Role } from "../Entities/Guild";
import { Membership } from "../Entities/User";
import { FindConnection, SendOp } from "../Modules/GatewayUtils";
import { OpCodes } from "../Classes/OpCodes";
import { Permissions } from "../Classes/Flags";
import { Channel } from "../Entities/Channel";

const App = Router();

App.post("/:GuildID/delete", VerifyAuth, async (req, res) => {
	const MyUser = await GetUserByRequest(req, { OwnedGuilds: true });
	if (!MyUser.OwnedGuilds.map(G => G.ID).includes(req.params.GuildID))
		return res.status(400).json({ code: 0, message: "You don't own that guild." });

	const G = MyUser.OwnedGuilds.find(G => G.ID === req.params.GuildID);
	console.log(G);

	await Guild.query("PRAGMA foreign_keys=OFF");
	await Guild.remove(G);
	await Guild.query("PRAGMA foreign_keys=ON");

	res.status(204).send();
});

App.post("/", VerifyAuth, async (req, res) => {
	if (!req.body.name) return;
	const MyUser = await GetUserByRequest(req, { Memberships: { Owner: false, ToGuild: true } });

	if (MyUser.Memberships.length >= 100) return res.status(400).json({ code: 0, message: "You're in too many guilds!" });

	const GuildID = GenerateSnowflake();
	
	let CreatedGuild = await Guild.create({
		ID: GuildID,
		Name: req.body.name,
		Owner: MyUser,
		Features: [
			GuildFeatures.NEWS,
			GuildFeatures.VANITY_URL,
			GuildFeatures.COMMERCE
		]
	}).save();
	
	const EveryoneRole = await Role.create({
		ID: GuildID,
		Name: "@everyone",
		Color: 0,
		Position: 0,
		Permissions: Permissions.SEND_MESSAGES,
		AnyoneCanMention: false,
		InGuild: CreatedGuild
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
		Roles: [ EveryoneRole ]
	}).save();

	await CreatedGuild.reload();

	CreatedGuild = await Guild.findOne({
		where: {
			ID: GuildID
		},
		relations: {
			Members: true,
			Channels: {
				OwnerGuild: true
			}
		}
	});

	const Conn = FindConnection(MyUser.ID);
	if (!Conn) return res.json(CreatedGuild.Package(MyUser));

	SendOp(Conn, OpCodes.DISPATCH, CreatedGuild.GatewayPackageEvent(MyUser), 24, "GUILD_CREATE");
	res.json(CreatedGuild.Package(MyUser));
});

module.exports = {
    DefaultAPI: "/api/v9/guilds",
    App
};