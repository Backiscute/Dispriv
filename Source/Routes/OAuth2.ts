import { Router } from "express";
import { GetUserByRequest, VerifyAuth } from "../Modules/AuthUtils";
import { Guild } from "../Entities/Guild";
import { DiscordApplication } from "../Entities/Application";

const App = Router();

App.get("/applications/:AppID/rpc", VerifyAuth, async (req, res) => {
	const ApplicationID = req.params.AppID;

    const Application = await DiscordApplication.findOne({ where: { ID: ApplicationID } });

    if (!Application) return res.status(404).json({ message: "Application not found", code: 0 });

    res.json(Application.PackagePublic()); // should be enough
});

App.get("/authorize", VerifyAuth, async (req, res) => {
	const ClientID = req.query.client_id;
    const ResponseType = req.query.response_type;
    const Scope = req.query.scope;

    if (!ClientID || !ResponseType || !Scope) return res.status(400).json({ message: "Missing query", code: 0 });

    const Application = await DiscordApplication.findOne({ where: { ID: ClientID.toString() } });

    if (!Application) return res.status(404).json({ message: "Invalid ClientID", code: 0 });
 
});

module.exports = {
	DefaultAPI: "/api/v9/oauth2",
	App,
};