import { Router } from "express";
import { User } from "../Entities/User";
import { VerifyAuth, VerifyToken } from "../Modules/SnowflakeUtils";

const App = Router();

App.get("/", VerifyAuth, async (req, res) => {
    res.json([]); // TODO
});

module.exports = {
    DefaultAPI: "/api/*/applications",
    App
};