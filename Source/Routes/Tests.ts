import { Router } from "express";
import { User } from "../Entities/User";
import { VerifyToken } from "../Modules/SnowflakeUtils";
import { Application } from "../Handlers/Server";
import { DiscordApplication } from "../Entities/Application";

const App = Router();

// a
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

App.post("/UpdateApp/:AppID", async (req, res) => {
    const Application = await DiscordApplication.findOneBy({
        id: req.params.AppID
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