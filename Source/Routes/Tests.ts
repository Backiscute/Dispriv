import { Router } from "express";
import { User } from "../Entities/User";
import { VerifyToken } from "../Modules/AuthUtils";
import { DiscordApplication } from "../Entities/Application";
import { Channel } from "../Entities/Channel";
import { Guild } from "../Entities/Guild";
import { Badge } from "../Entities/Badge";

const App = Router();

App.use((req, res, next) => {
	if (req.header("authorization") !== process.env.DASHBOARD_KEY) return res.status(401).json({ code: 0, message: "You are not authorized to use the TEST API." });
	next();
});

App.patch("/Server/:ID", async (req, res) => {
    const ServerData = await Guild.findOneBy({
        ID: req.params.ID
    });
    if (!ServerData) return;

    Object.keys(req.body).forEach(K => {
        //@ts-expect-error test endpoint, checks not needed
        ServerData[K] = req.body[K];
    });

    await ServerData.save();
	//SendToMembers(ServerData.ID, OpCodes.DISPATCH, ServerData.GatewayPackage(null), 6969, "GUILD_UPDATE");
    res.send(ServerData);
});

App.post("/Badge", async (req, res) => {
	if (typeof req.body.ID !== "string" || typeof req.body.Name !== "string" || typeof req.body.IconID !== "string") return res.status(400).json({
		errorMessage: "One or more fields missing: ID, Name, IconID",
		success: false
	});

	const CreatedBadge = await Badge.create({
		ID: req.body.ID,
		DisplayName: req.body.Name,
		IconID: req.body.IconID
	}).save();

	res.json({
		errorMessage: null,
		success: true,
		data: CreatedBadge.Package()
	});
});

App.patch("/Channel/:ID", async (req, res) => {
    const ChannelData = await Channel.findOneBy({
        ID: req.params.ID
    });
    if (!ChannelData) return;

    Object.keys(req.body).forEach(K => {
        //@ts-expect-error test endpoint, checks not needed
        ChannelData[K] = req.body[K];
    });

    await ChannelData.save();
    res.send(ChannelData);
});

App.patch("/UserBadges/:Username/:Discriminator", async (req, res) => {
	const UserData = await User.findOneBy({
        Username: req.params.Username,
		Discriminator: req.params.Discriminator
    });
    if (!UserData) return;

	const Badges: Badge[] = [];
	for (const BadgeID of req.body) {
		const BadgeFound = await Badge.findOne({ where: { ID: BadgeID } });
		if (!BadgeFound) continue;

		Badges.push(BadgeFound);
	}

	// i have no clue how this works i found it on google
	Badges.sort((A, B) => A.ID.localeCompare(B.ID, "en", { sensitivity: "base" }));

	UserData.Badges = Badges;
	await UserData.save();

	res.json({
		errorMessage: null,
		success: true,
		data: Badges.map(B => B.Package())
	});
});

App.patch("/User/:Username/:Discriminator", async (req, res) => {
    const UserData = await User.findOneBy({
        Username: req.params.Username,
		Discriminator: req.params.Discriminator
    });
    if (!UserData) return;

    Object.keys(req.body).forEach(K => {
        //@ts-expect-error test endpoint, checks not needed
        UserData[K] = req.body[K];
    });

    await UserData.save();
    res.send(UserData);
});

/*App.delete("/Channels/:ChannelID", async (req, res) => {
    const ChannelData = await Channel.findOne({
        where: {
            ID: req.params.ChannelID as string
        }
    });

    if (ChannelData) await Channel.createQueryBuilder().delete().where("ID = :ID", { ID: ChannelData.ID }).execute();

    res.send();
});*/

App.post("/UpdateApp/:AppID", async (req, res) => {
    const Application = await DiscordApplication.findOneBy({
        ID: req.params.AppID
    });
    if (!Application) return;

    Object.keys(req.body).forEach(K => {
        //@ts-expect-error test endpoint, checks not needed
        Application[K] = req.body[K];
    });

    await Application.save();
    res.send(Application);
});

App.post("/verifytoken", async (req, res) => {
    const Test = await VerifyToken(req.body.token);
    res.json({ passed: Test });
});

module.exports = {
    DefaultAPI: "/api/tests",
    App
};