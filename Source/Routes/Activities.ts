import { Router } from "express";
import { GetUserByRequest, VerifyAuth } from "../Modules/SnowflakeUtils";

const App = Router();

App.get("/:ApplicationID/test-mode", VerifyAuth, async (req, res) => { // enables app test mode in discord client (generally used for testing embedded apps)
    const AppID = req.params.ApplicationID;
    const UserData = await GetUserByRequest(req, { Applications: true });
    const Application = UserData.Applications.find((R) => R.id === AppID);
    if (!Application) return res.status(403).json({"message": "403: No access bozo", "code": 0});
    res.sendStatus(204);
});

App.get("/shelf", async (req, res) => { // embedded games library (game activities)
    const GuildID = req.query.guild_id;
    if (!GuildID) return res.status(404).json({"message": "Missing query", "code": 0});
    res.json([]);
});

module.exports = {
    DefaultAPI: "/api/v9/activities",
    App
};