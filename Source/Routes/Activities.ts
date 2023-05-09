import { Router } from "express";
import { GetUserByRequest, VerifyAuth } from "../Modules/SnowflakeUtils";

const App = Router();

App.get("/:ApplicationID/test-mode", VerifyAuth, async (req, res) => { // enables app test mode in discord client (generally used for testing embedded apps)
    const AppID = req.params.ApplicationID;
    const UserData = await GetUserByRequest(req, { Applications: true });
    const Application = UserData.Applications.find((R) => R.ID === AppID);
    if (!Application) return res.status(403).json({"message": "403: No access bozo", "code": 0});
    res.sendStatus(204);
});


module.exports = {
    DefaultAPI: "/api/v9/activities",
    App
};