import { Router } from "express";
import { VerifyAuth } from "../Modules/AuthUtils";

const App = Router();

App.get("/", VerifyAuth, async (req, res) => {
    res.json([]); // TODO
});

module.exports = {
    DefaultAPI: "/api/v9/teams",
    App,
};
