import { Router } from "express";
import { User } from "../Entities/User";
import { VerifyAuth, VerifyToken } from "../Modules/SnowflakeUtils";

const App = Router();

App.get("/build_overrides", async (req, res) => {
    res.json([]); // TODO
 });

App.post("/create_build_override_link", VerifyAuth, async (req, res) => {
   const BuildOverrideMeta = req.body.meta;
   if (!BuildOverrideMeta) return res.sendStatus(403).send("The maze wasn't meant for you.");

   res.json({"url": "https://dispriv.gg/kys"});
});

module.exports = {
    DefaultAPI: "/__development",
    App
};