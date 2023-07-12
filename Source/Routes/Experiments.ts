import { Router } from "express";
import { v4 } from "uuid";
import { GetGuildExperiments, GetUserExperiments } from "../Handlers/Experiments";

const App = Router();

App.get("/", (req, res) => {
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