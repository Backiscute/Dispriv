import { Router } from "express";
import { GenerateSnowflake, GetUserByRequest, VerifyAuth } from "../Modules/SnowflakeUtils";
import { Invite } from "../Entities/Guild";
import { Membership } from "../Entities/User";

const App = Router();

App.get("/:InviteCode/", VerifyAuth, async (req, res) => {
    const RequestedInvite = await Invite.findOne({ where: { InviteCode: req.params.InviteCode }, relations: { InviteOwner: true, InGuild: { Members: true } } });
    if (!RequestedInvite) return res.status(404).json({"message": "Unknown Invite", "code": 10006});

    res.json(RequestedInvite.PackagePublic());
});

App.post("/:InviteCode/", VerifyAuth, async (req, res) => {
    const RequestedInvite = await Invite.findOne({ where: { InviteCode: req.params.InviteCode }, relations: { InviteOwner: true, InGuild: { Members: true } } });
    if (!RequestedInvite) return res.status(404).json({"message": "Unknown Invite", "code": 10006});

    const Guild = RequestedInvite.InGuild;
    const MyUser = await GetUserByRequest(req, { Memberships: { Owner: false, ToGuild: true } });

    if (MyUser.Memberships.find(x => x.ToGuild.ID === Guild.ID)) return res.json(RequestedInvite.Package());

    await Membership.create({
		ID: GenerateSnowflake(),
		Owner: MyUser,
		ToGuild: Guild,
		CreatedAt: new Date(),
		Roles: [ Guild.DefaultRole() ]
	}).save();

    await Guild.reload();

    res.json(RequestedInvite.PackagePublic());
});

module.exports = {
    DefaultAPI: "/api/v9/invites",
    App
};