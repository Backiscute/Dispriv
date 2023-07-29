import { Router } from "express";
import { GetOAppByOAuthReq, GetUserByRequest, VerifyAuth, VerifyOAuthReq } from "../Modules/AuthUtils";
import { DiscordApplication } from "../Entities/Application";
import { OAuth2App } from "../Entities/OAuth2";
import { GenerateSnowflake } from "../Modules/SnowflakeUtils";
import bcrypt from "bcrypt";
import { JsonErrorCodes } from "../Classes/JsonOpCodes";
import { HasPermission, SendToMembers } from "../Modules/DiscordUtils";
import { Permissions } from "../Classes/Flags";
import { Membership } from "../Entities/User";
import { Role } from "../Entities/Guild";
import { OpCodes } from "../Classes/GatewayOpCodes";

const App = Router();

App.get("/applications/:AppID/rpc", VerifyAuth(), async (req, res) => {
    const ApplicationID = req.params.AppID;

    const Application = await DiscordApplication.findOne({ where: { ID: ApplicationID } });

    if (!Application) return res.status(404).json({ message: "Application not found", code: 0 });

    res.json(Application.PackagePublic()); // should be enough
});

App.get("/authorize", VerifyAuth(), async (req, res) => {
    const ClientID = req.query.client_id;
    const ResponseType = req.query.response_type || "bot";
    const Scope = req.query.scope;

    if (!ClientID || !ResponseType || !Scope) return res.status(400).json({ message: "Missing query", code: 0 });

    const Application = await DiscordApplication.findOne({ where: { ID: ClientID.toString() }, relations: { Bot: true } });

    if (!Application) return res.status(404).json({ message: "Invalid ClientID", code: 0 });
    if (!Application.Bot && ResponseType == "bot") return res.status(404).json({ message: "Invalid Bot", code: 0 });

    const MyUser = await GetUserByRequest(req, { AuthorizedApps: { Application: { Bot: true } }, Memberships: { ToGuild: true }});

    // get only guilds with MANAGE_GUILD perms
    const Guilds = MyUser?.Memberships.filter((M) => HasPermission(M, Permissions.MANAGE_GUILD)).map((M) => M.ToGuild.PackageOAuth2(M));

    res.json({
        application: Application.PackagePublic(),
        authorized: MyUser?.AuthorizedApps.find((OA) => OA.Application.ID == Application.ID) !== undefined,
        redirect_uri: ResponseType == "code" ? "http://127.0.0.1" : undefined, // hardcoded for testing (unhardcode thanks)
        bot: ResponseType == "bot" ? Application.Bot?.PackagePublic() : undefined,
        user: MyUser?.PackagePublic(),
        guilds: ResponseType == "bot" ? Guilds : undefined,
    });
});

// {"location": "http://127.0.0.1?code=yourmother"}

App.post("/authorize", VerifyAuth(), async (req, res) => {
    const ClientID = req.query.client_id;
    const ResponseType = req.query.response_type || "bot";
    const Scope = req.query.scope;

    if (!ClientID || !ResponseType || !Scope) return res.status(400).json({ message: "Missing query", code: 0 });

    const Application = await DiscordApplication.findOne({ where: { ID: ClientID.toString() }, relations: { Bot: true } });

    if (!Application) return res.status(404).json({ message: "Invalid ClientID", code: 0 });

    const MyUser = await GetUserByRequest(req, { AuthorizedApps: { Application: true }, Memberships: { ToGuild: { Channels: { OwnerGuild: true }}, Roles: true } });
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
        case "bot":
        {
            if (!Scopes.includes("bot")) return res.sendStatus(404);

            const ReqPermissions = req.body.permissions;
            const GuildID = req.body.guild_id;

            if (!ReqPermissions || !GuildID) return res.status(400).json({ message: "Invalid Form Body", code: JsonErrorCodes.INVALID_FORM_BODY_OR_CONTENT_TYPE });

            const UserMembership = MyUser.Memberships.find((x) => x.ToGuild.ID == GuildID);

            if (!UserMembership) return res.status(400).json({ message: "User is not participating in guild", code: 0 });

            if (!HasPermission(UserMembership, Permissions.MANAGE_GUILD)) return res.status(400).json({ message: "Missing Access", code: JsonErrorCodes.MISSING_ACCESS });
            if (!HasPermission(UserMembership, ReqPermissions)) return res.status(400).json({ message: "Missing Access", code: JsonErrorCodes.MISSING_ACCESS });

            if (UserMembership.ToGuild.Roles.find((R) => R.BotID == Application.Bot?.ID)) return res.status(400).json({ message: "Bot already in guild", code: 0 });

            const ManagedRole = await Role.create({
                ID: GenerateSnowflake(),
                Name: Application.DisplayName,
                Color: 0,
                Managed: true,
                BotID: Application.Bot?.ID,
                Permissions: ReqPermissions,
                InGuild: UserMembership.ToGuild,
            });

            await ManagedRole.save();

            SendToMembers(
                UserMembership.ToGuild.ID,
                OpCodes.DISPATCH,
                {
                    guild_id: UserMembership.ToGuild.ID,
                    role: ManagedRole.Package(),
                },
                1337,
                "GUILD_ROLE_UPDATE",
            );

            const BotMembership = await Membership.create({
                ID: GenerateSnowflake(),
                ToGuild: UserMembership.ToGuild,
                Owner: Application.Bot,
                Roles: [UserMembership.ToGuild.DefaultRole, ManagedRole],
                CreatedAt: new Date()
            });

            await BotMembership.save();

            res.json({ authorized: true });

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

App.get("/tokens", VerifyAuth(), async (req, res) => {
    const MyUser = await GetUserByRequest(req, { AuthorizedApps: { Application: true } });
    res.json(MyUser?.AuthorizedApps.map((I) => I.Package()));
});

App.delete("/tokens/:OAuthID", VerifyAuth(), async (req, res) => {
    const MyUser = await GetUserByRequest(req, { AuthorizedApps: { Application: true } });
    const OAuthApp = MyUser?.AuthorizedApps.find((A) => A.ID == req.params.OAuthID);

    if (OAuthApp === undefined) return res.status(400).json({ message: "Invalid OAuth", code: JsonErrorCodes.INVALID_OAUTH2_ACCESS_TOKEN });

    await OAuthApp.remove();

    res.sendStatus(204);
});

module.exports = {
    DefaultAPI: "/api/v9/oauth2",
    App,
};
