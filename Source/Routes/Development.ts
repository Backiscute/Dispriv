import { Router } from "express";
import { User } from "../Entities/User";
import { GetUserByRequest, VerifyAuth, VerifyToken } from "../Modules/SnowflakeUtils";
import { UserFlags } from "../Classes/Flags";

const App = Router();

App.get("/build_overrides", async (req, res) => {
    res.json({"DisprivTestOverride": {"id": "DisprivBuildOverride-1", "type": "branch"}}); // TODO
 });

App.post("/create_build_override_link", VerifyAuth, async (req, res) => {
   const BuildOverrideMeta = req.body.meta;
   if (!BuildOverrideMeta) return res.sendStatus(403).send("The maze wasn't meant for you.");

   const User = await GetUserByRequest(req);

    if (!User.HasFlag(UserFlags.STAFF)) return res.sendStatus(403).send("The maze wasn't meant for you.");

   res.json({"url": "https://dispriv.gg/kys"});
});

module.exports = {
    DefaultAPI: "/__development",
    App
};