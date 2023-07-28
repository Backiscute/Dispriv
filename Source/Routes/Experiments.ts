import { Router } from "express";
import { v4 } from "uuid";
import { GetGuildExperiments, GetUserExperiments } from "../Handlers/Experiments";

const App = Router();

App.get("/", (req, res) => {
    // cookies needed for custom clients
    res.cookie("_dcfduid", `__dcfduid=${v4()}`, { maxAge: 157680000000, httpOnly: true, secure: true, expires: new Date("Wed, 26-Jul-2028 00:55:21 GMT"), path: "/" });
    res.cookie("_cfruid", `__cfruid=${v4()}`, { path: "/", httpOnly: true, secure: true, sameSite: "none" });
    res.cookie("_sdcfduid", `_sdcfduid=${v4()}`, { maxAge: 157680000000, httpOnly: true, secure: true, expires: new Date("Wed, 26-Jul-2028 00:55:21 GMT"), path: "/" });

    res.json({
        fingerprint: v4(),
        assignments: GetUserExperiments(null),
        guild_experiments: req.query.with_guild_experiments === "true" ? GetGuildExperiments() : undefined
    });
});

module.exports = {
    DefaultAPI: "/api/v9/experiments",
    App,
};