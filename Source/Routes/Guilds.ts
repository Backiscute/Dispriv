import { Router } from "express";
import { GenerateSnowflake, GetUserByRequest, VerifyAuth } from "../Modules/SnowflakeUtils";
import { Guild, GuildFeatures, Role } from "../Entities/Guild";
import { Membership } from "../Entities/User";
import { FindConnection, SendOp } from "../Modules/GatewayUtils";
import { OpCodes } from "../Classes/OpCodes";
import { Permissions } from "../Classes/Flags";
import { Channel, ChannelType } from "../Entities/Channel";
import { GetHighestRole, HasPermission, SendToMembers, SendToSelf } from "../Modules/DiscordUtils";
import { Remove, Upload, ValidBaseURL } from "../Modules/AssetUtils";

const App = Router();

App.post("/:GuildID/delete", VerifyAuth, async (req, res) => {
	const MyUser = await GetUserByRequest(req, { OwnedGuilds: true });
	if (!MyUser.OwnedGuilds.map(G => G.ID).includes(req.params.GuildID))
		return res.status(400).json({ code: 0, message: "You don't own that guild." });

	const G = MyUser.OwnedGuilds.find(G => G.ID === req.params.GuildID);
	//console.log(G);

	await Guild.query("PRAGMA foreign_keys=OFF");
	await Guild.remove(G);
	await Guild.query("PRAGMA foreign_keys=ON");

	res.status(204).send();
});

App.patch("/:GuildID/roles/:RoleID", VerifyAuth, async (req, res) => {
	const MyUser = await GetUserByRequest(req, { Memberships: { ToGuild: true } });
	if (!MyUser.Memberships.map(G => G.ToGuild.ID).includes(req.params.GuildID))
		return res.status(400).json({ code: 0, message: "You aren't participating in that guild." });
		
	const Mmbr = MyUser.Memberships.find(G => G.ToGuild.ID === req.params.GuildID);
	const G = Mmbr.ToGuild;

	if (!HasPermission(Mmbr, Permissions.MANAGE_ROLES))
		return res.status(403).json({ code: 10013, message: "Missing Access" });

	const Rl = await Role.findOne({ where: { InGuild: { ID: G.ID }, ID: req.params.RoleID }, relations: { InGuild: true } });

	if (GetHighestRole(Mmbr).Position <= Rl.Position && G.Owner.ID !== MyUser.ID)
		return res.status(403).json({ code: 10013, message: "Missing Access" });

	for (const PropKey of Object.keys(req.body)) {
		const Value = req.body[PropKey];
		switch (PropKey) {
			case "name":
				Rl.Name = Value;
				continue;
			case "permissions":
				Rl.Permissions = Number.parseInt(Value);
				continue;
			case "color":
				Rl.Color = Value;
				continue;
			case "hoist":
				Rl.ShownOnMemberlist = Value;
				continue;
			case "mentionable":
				Rl.AnyoneCanMention = Value;
				continue;
			case "unicode_emoji":
				Rl.UnicodeEmoji = Value;
				continue;
		}
	}

	await Rl.save();

	res.json(Rl.Package());

	SendToMembers(G.ID, OpCodes.DISPATCH, {
		guild_id: G.ID,
		role: Rl.Package()
	}, 1337, "GUILD_ROLE_UPDATE");
});

App.patch("/:GuildID/channels", VerifyAuth, async (req, res) => {
	const MyUser = await GetUserByRequest(req, { Memberships: { ToGuild: true } });
	if (!MyUser.Memberships.map(G => G.ToGuild.ID).includes(req.params.GuildID))
		return res.status(400).json({ code: 0, message: "You aren't participating in that guild." });
		
	const Mmbr = MyUser.Memberships.find(G => G.ToGuild.ID === req.params.GuildID);
	const G = Mmbr.ToGuild;

	if (!HasPermission(Mmbr, Permissions.MANAGE_CHANNELS))
		return res.status(403).json({ code: 10013, message: "Missing Access" });

	if (!Array.isArray(req.body))
		return res.status(400).json({ code: 0, message: "Invalid payload" });

	for await (const Chnl of req.body) {
		if (typeof Chnl.id !== "string" || typeof Chnl.position !== "number")
			continue;

		const ChnlEntry = await Channel.findOne({ where: { OwnerGuild: { ID: G.ID }, ID: Chnl.id }, relations: { OwnerGuild: true, OwnerCategory: true } });
		ChnlEntry.GuildPosition = Chnl.position;

		if (typeof Chnl.parent_id === "string") {
			const Parent = await Channel.findOne({ where: { OwnerGuild: { ID: G.ID }, ID: Chnl.parent_id, Type: ChannelType.GUILD_CATEGORY } });
			if (Parent)
				ChnlEntry.OwnerCategory = Parent;
		} else if (Chnl.parent_id === null)
			ChnlEntry.OwnerCategory = null;

		await ChnlEntry.save();

		SendToMembers(G.ID, OpCodes.DISPATCH, ChnlEntry.GuildPackage(), 420, "CHANNEL_UPDATE");
	}

	res.sendStatus(204);
});

App.post("/:GuildID/channels", VerifyAuth, async (req, res) => {
	const MyUser = await GetUserByRequest(req, { Memberships: { ToGuild: true } });
	if (!MyUser.Memberships.map(G => G.ToGuild.ID).includes(req.params.GuildID))
		return res.status(400).json({ code: 0, message: "You aren't participating in that guild." });
		
	const Mmbr = MyUser.Memberships.find(G => G.ToGuild.ID === req.params.GuildID);
	const G = Mmbr.ToGuild;

	if (!HasPermission(Mmbr, Permissions.MANAGE_CHANNELS))
		return res.status(403).json({ code: 10013, message: "Missing Access" });

	if (!G.Features.includes(GuildFeatures.VERIFIED) &&
		!G.Features.includes(GuildFeatures.PARTNERED) &&
		req.body.type !== ChannelType.GUILD_CATEGORY &&
		req.body.type !== ChannelType.GUILD_ANNOUNCEMENT &&
		req.body.type !== ChannelType.GUILD_TEXT &&
		req.body.type !== ChannelType.GUILD_VOICE)
		return res.status(403).json({ code: 10013, message: "Missing Access" });

	const Chnl = await Channel.create({
		ID: GenerateSnowflake(),
		Type: req.body.type as ChannelType,
		DisplayName: req.body.name,
		OwnerGuild: G
	});

	if (typeof req.body.parent_id === "string") {
		const Parent = await Channel.findOne({ where: { OwnerGuild: { ID: G.ID }, ID: req.body.parent_id, Type: ChannelType.GUILD_CATEGORY } });
		if (Parent)
			Chnl.OwnerCategory = Parent;
	}

	await Chnl.save();

	res.status(201).json(Chnl.GuildPackage());

	SendToMembers(G.ID, OpCodes.DISPATCH, Chnl.GuildPackage(), 69, "CHANNEL_CREATE");
});

App.get("/:GuildID/vanity-url", VerifyAuth, async (req, res) => {
	const MyUser = await GetUserByRequest(req, { Memberships: { ToGuild: true } });
	if (!MyUser.Memberships.map(G => G.ToGuild.ID).includes(req.params.GuildID))
		return res.status(400).json({ code: 0, message: "You aren't participating in that guild." });

	const G = MyUser.Memberships.find(G => G.ToGuild.ID === req.params.GuildID);
	res.json({
		code: G.ToGuild.VanityInviteURL,
		uses: 0
	});
});

App.patch("/:GuildID/vanity-url", VerifyAuth, async (req, res) => {
	const MyUser = await GetUserByRequest(req, { Memberships: { ToGuild: true } });
	if (!MyUser.Memberships.map(G => G.ToGuild.ID).includes(req.params.GuildID))
		return res.status(400).json({ code: 0, message: "You aren't participating in that guild." });

	// TODO: permission check

	if (typeof req.body.code !== "string")
		return res.status(400).json({ code: 0, message: "Invalid request" });
	
	const G = MyUser.Memberships.find(G => G.ToGuild.ID === req.params.GuildID);
	if (req.body.code === "")
	{
		G.ToGuild.VanityInviteURL = null;
		await G.ToGuild.save();

		res.json({
			code: "",
			uses: 0
		});
		return;
	}
		
	const ExistingInviteGuild = await Guild.findOne({ where: { VanityInviteURL: req.body.code } });
	if (ExistingInviteGuild)
		return res.status(400).json({ code: 0, message: "Invite link already taken" });
		
	G.ToGuild.VanityInviteURL = req.body.code;
	await G.ToGuild.save();

	res.json({
		code: req.body.code,
		uses: 0
	});
});

App.patch("/:GuildID", VerifyAuth, async (req, res) => {
	const MyUser = await GetUserByRequest(req, { Memberships: { ToGuild: { Channels: { OwnerCategory: true, OwnerGuild: true } } } });
	if (!MyUser.Memberships.map(G => G.ToGuild.ID).includes(req.params.GuildID))
		return res.status(400).json({ code: 0, message: "You aren't participating in that guild." });
		
	const Mmbr = MyUser.Memberships.find(G => G.ToGuild.ID === req.params.GuildID);
	const G = Mmbr.ToGuild;

	if (!HasPermission(Mmbr, Permissions.MANAGE_GUILD))
		return res.status(403).json({ code: 10013, message: "Missing Access" });

	for (const PropKey of Object.keys(req.body)) {
		const Value = req.body[PropKey];
		switch (PropKey) {
			case "name":
				G.Name = Value;
				continue;
			case "description":
				G.Description = Value;
				continue;
			case "icon":
				if (G.IconID !== null && G.IconID !== Value)
				{
					await Remove(G.IconID);
					G.IconID = null;
				}

				if (!ValidBaseURL(Value))
					continue;

				G.IconID = await Upload(Value);
				continue;
		}
	}

	await G.save();

	res.json(G.Package(MyUser));

	SendToMembers(G.ID, OpCodes.DISPATCH, G.Package(MyUser), 1337, "GUILD_UPDATE");
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

	res.json(CreatedGuild.Package(MyUser));
	SendToSelf(MyUser, OpCodes.DISPATCH, CreatedGuild.GatewayPackageEvent(MyUser), 24, "GUILD_CREATE");
});

module.exports = {
    DefaultAPI: "/api/v9/guilds",
    App
};