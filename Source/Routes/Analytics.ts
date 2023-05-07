import { Router } from "express";
import { User } from "../Entities/User";
import { VerifyToken } from "../Modules/SnowflakeUtils";

const App = Router();

// analytics
App.post("/science", async (req, res) => {
    res.sendStatus(204);
});

module.exports = {
    DefaultAPI: "/api/v9",
    App
};