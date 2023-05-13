import { Router } from "express";
import { GenerateSnowflake, GetUserByRequest, VerifyAuth } from "../Modules/SnowflakeUtils";
import { Guild, GuildFeatures } from "../Entities/Guild";
import { Membership } from "../Entities/User";
import { FindConnection, SendOp } from "../Modules/GatewayUtils";
import { OpCodes } from "../Classes/OpCodes";

const App = Router();

App.post("/", VerifyAuth, async (req, res) => {
	if (!req.body.name) return;
	const MyUser = await GetUserByRequest(req, { Memberships: { Owner: false } });

	if (MyUser.Memberships.length >= 100) return res.status(400).json({ code: 0, message: "You're in too many guilds!" });

	const CreatedGuild = await Guild.create({
		ID: GenerateSnowflake(),
		Name: req.body.name,
		Owner: MyUser,
		Features: [
			GuildFeatures.NEWS,
			GuildFeatures.VANITY_URL,
			GuildFeatures.COMMERCE
		]
	}).save();

	const OwnersMembership = await Membership.create({
		ID: CreatedGuild.ID,
		Owner: MyUser,
		ToGuild: CreatedGuild,
		CreatedAt: new Date()
	}).save();

	const Conn = FindConnection(MyUser.ID);
	if (!Conn) return res.json(CreatedGuild.Package(MyUser));

	SendOp(Conn, OpCodes.DISPATCH, CreatedGuild.GatewayPackageEvent(MyUser), 69, "GUILD_CREATE");
	res.json(CreatedGuild.Package(MyUser));
});

module.exports = {
    DefaultAPI: "/api/v9/guilds",
    App
};