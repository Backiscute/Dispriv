import { Router } from "express";

const App = Router();

App.get("/gateway", (req, res) => {
    // unless overriden - send this url
    res.json({
        url: process.env.OverrideWS || "ws://127.0.0.1:6968"
    });
});

module.exports = {
    DefaultAPI: "/api/v9",
    App
};