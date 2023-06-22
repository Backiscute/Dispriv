import { Router } from "express";
import { GetOAppByOAuthReq, GetUserByRequest, VerifyAuth, VerifyOAuthReq } from "../Modules/AuthUtils";
import { DiscordApplication } from "../Entities/Application";
import { OAuth2App } from "../Entities/OAuth2";
import { GenerateSnowflake } from "../Modules/SnowflakeUtils";
import bcrypt from "bcrypt";
import { JsonErrorCodes } from "../Classes/JsonOpCodes";

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

    const MyUser = await GetUserByRequest(req, { AuthorizedApps: { Application: true }});

    res.json({
        application: Application.PackagePublic(),
        authorized: MyUser?.AuthorizedApps.find((OA) => OA.Application.ID == Application.ID) !== undefined,
        redirect_uri: "http://127.0.0.1", // hardcoded for testing (unhardcode thanks)
        user: MyUser?.PackagePublic(),
    });
});

// {"location": "http://127.0.0.1?code=yourmother"}

App.post("/authorize", VerifyAuth, async (req, res) => {
    const Authorize = req.body.authorize;
    const ClientID = req.query.client_id;
    const ResponseType = req.query.response_type;
    const Scope = req.query.scope;

    if (!ClientID || !ResponseType || !Scope || !Authorize) return res.status(400).json({ message: "Missing query", code: 0 });

    const Application = await DiscordApplication.findOne({ where: { ID: ClientID.toString() } });

    if (!Application) return res.status(404).json({ message: "Invalid ClientID", code: 0 });

    const MyUser = await GetUserByRequest(req, { AuthorizedApps: { Application: true }});
    const Scopes = Scope.toString().split(" ");

    if (!MyUser) return res.status(404).json({ message: "User not found", code: 0 });
    
    switch (ResponseType)
    {
        case "code":
        {
            if (MyUser.AuthorizedApps.find((OA) => OA.Application.ID == Application.ID) !== undefined)
            {
                const OAuth2 = MyUser.AuthorizedApps.find((OA) => OA.Application.ID == Application.ID);

                if (!OAuth2) return;

                return res.json({ location: "http://127.0.0.1?code=" + MyUser.ID + "-" + bcrypt.hashSync(`${OAuth2.ID}-${MyUser.ID}`, 10) });
            }

            // TODO: check invalid scopes
            console.log(Scopes);
            const OAuth2 = OAuth2App.create({
                ID: GenerateSnowflake(),
                Application: Application,
                Scopes: Scopes,
                AuthorizedUsers: MyUser
            });

            await OAuth2.save();
            Application.OAuth2Clients?.unshift(OAuth2); // shit code fr
            await Application.save();

            res.json({ location: "http://127.0.0.1?code=" + MyUser.ID + "-" + bcrypt.hashSync(`${OAuth2.ID}-${MyUser.ID}`, 10) });
            break;
        } 
        default:
            return res.status(400).json({ message: "Dispriv doesn't support that response type yet!", code: 0 });
    }
    
});

App.get("/@me", VerifyOAuthReq, async (req, res) => {
    const OApp = await GetOAppByOAuthReq(req);
    
    res.json(OApp?.Package(true));
});

App.get("/tokens", VerifyAuth, async (req, res) => {
    const MyUser = await GetUserByRequest(req, { AuthorizedApps: { Application: true } });
    res.json(MyUser?.AuthorizedApps.map((I) => I.Package()));
});

App.delete("/tokens/:OAuthID", VerifyAuth, async (req, res) => {
    const MyUser = await GetUserByRequest(req, { AuthorizedApps: { Application: true } });
    const OAuthApp = MyUser?.AuthorizedApps.find((A) => A.ID == req.params.OAuthID);

    if (OAuthApp === undefined) return res.status(400).json({ message: "Invalid OAuth", code: JsonErrorCodes.InvalidOAuthToken });

    await OAuthApp.remove();

    res.sendStatus(204);
});

module.exports = {
    DefaultAPI: "/api/v9/oauth2",
    App,
};
