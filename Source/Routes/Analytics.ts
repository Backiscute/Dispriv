import { Router } from "express";

const App = Router();

// analytics
App.post("/science", async (req, res) => {
    res.sendStatus(204);
});

module.exports = {
    DefaultAPI: "/api/v9",
    App
};