import { Router } from "express";
import { GenerateSnowflake, GetUserByRequest, VerifyAuth } from "../Modules/SnowflakeUtils";
import { Guild, Invite, InviteType } from "../Entities/Guild";
import { Membership } from "../Entities/User";
import { FindConnection, SendOp } from "../Modules/GatewayUtils";
import { OpCodes } from "../Classes/OpCodes";

const App = Router();

App.get("/:InviteCode", VerifyAuth, async (req, res) => {
    const RequestedInvite = await Invite.findOne({ where: { InviteCode: req.params.InviteCode }, relations: { InGuild: { Members: true } } });
    if (!RequestedInvite)
	{
		const VanityGuild = await Guild.findOne({ where: { VanityInviteURL: req.params.InviteCode }, relations: { Members: true } });
		if (!VanityGuild)
			return res.status(404).json({"message": "Unknown Invite", "code": 10006});

		return res.json({
			code: VanityGuild.VanityInviteURL,
			guild: VanityGuild.Partial(),
			type: "GUILD",
			expires_at: null,
			aproximate_member_count: 0,
			aproximate_presence_count: 0,
			channel: null
		});
	}

    res.json(RequestedInvite.PackagePublic());
});

App.post("/:InviteCode", VerifyAuth, async (req, res) => {
    const RequestedInvite = await Invite.findOne({ where: { InviteCode: req.params.InviteCode }, relations: { InGuild: { Members: true, Channels: true } } });
	const MyUser = await GetUserByRequest(req, { Memberships: { Owner: false, ToGuild: true } });
    
	if (!RequestedInvite)
	{
		const VanityGuild = await Guild.findOne({ where: { VanityInviteURL: req.params.InviteCode }, relations: { Members: true, Channels: true } });
		if (!VanityGuild)
			return res.status(404).json({"message": "Unknown Invite", "code": 10006});

		if (MyUser.Memberships.find(x => x.ToGuild.ID === VanityGuild.ID))
			return res.json({
				code: VanityGuild.VanityInviteURL,
				guild: VanityGuild.Partial(),
				type: InviteType.GUILD,
				expires_at: null,
				approximate_member_count: 0,
				approximate_presence_count: 0,
				channel: null
			});

		await Membership.create({
			ID: GenerateSnowflake(),
			Owner: MyUser,
			ToGuild: VanityGuild,
			CreatedAt: new Date(),
			Roles: [ VanityGuild.DefaultRole() ]
		}).save();

		res.json({
			code: VanityGuild.VanityInviteURL,
			guild: VanityGuild.Partial(),
			type: InviteType.GUILD,
			expires_at: null,
			approximate_member_count: 0,
			approximate_presence_count: 0,
			channel: null
		});
		
		const Conn = FindConnection(MyUser.ID);
		if (!Conn) return;

		SendOp(Conn, OpCodes.DISPATCH, VanityGuild.GatewayPackage(MyUser), 24, "GUILD_CREATE");
		return;
	}

    const TargetGuild = RequestedInvite.InGuild;

    if (MyUser.Memberships.find(x => x.ToGuild.ID === TargetGuild.ID))
		return res.json(RequestedInvite.Package());

    await Membership.create({
		ID: GenerateSnowflake(),
		Owner: MyUser,
		ToGuild: TargetGuild,
		CreatedAt: new Date(),
		Roles: [ TargetGuild.DefaultRole() ]
	}).save();

    res.json(RequestedInvite.PackagePublic());

	const Conn = FindConnection(MyUser.ID);
	if (!Conn) return;

	SendOp(Conn, OpCodes.DISPATCH, TargetGuild.GatewayPackage(MyUser), 24, "GUILD_CREATE");
});

module.exports = {
    DefaultAPI: "/api/v9/invites",
    App
};