import { Router } from "express";
import { User } from "../Entities/User";
import { VerifyToken } from "../Modules/SnowflakeUtils";
import { DiscordApplication } from "../Entities/Application";
import { Channel } from "../Entities/Channel";
import { Guild } from "../Entities/Guild";

const App = Router();

App.use((req, res, next) => {
	if (req.header("authorization") !== process.env.DASHBOARD_KEY) return res.status(401).json({ code: 0, message: "You are not authorized to use the TEST API." });
	next();
});

App.post("/Server/:ID", async (req, res) => {
    const ServerData = await Guild.findOneBy({
        ID: req.params.ID
    });
    if (!ServerData) return;

    Object.keys(req.body).forEach(K => {
        ServerData[K] = req.body[K];
    });

    await ServerData.save();
    res.send(ServerData);
});

App.post("/UpdateUser/:Username", async (req, res) => {
    const UserData = await User.findOneBy({
        Username: req.params.Username
    });
    if (!UserData) return;

    Object.keys(req.body).forEach(K => {
        UserData[K] = req.body[K];
    });

    await UserData.save();
    res.send(UserData);
});

App.delete("/Channels/:ChannelID", async (req, res) => {
    const ChannelData = await Channel.findOne({
        where: {
            ID: req.params.ChannelID as string
        }
    });

    //if (ChannelData) await Channel.createQueryBuilder().delete().where("ID = :ID", { ID: ChannelData.ID }).execute();

    res.send();
});

App.post("/UpdateApp/:AppID", async (req, res) => {
    const Application = await DiscordApplication.findOneBy({
        ID: req.params.AppID
    });
    if (!Application) return;

    Object.keys(req.body).forEach(K => {
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