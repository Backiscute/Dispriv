import { Router } from "express";

const App = Router();

App.get("/gateway", (req, res) => {
    // unless overriden - send this url
    res.json({
        url: process.env.OverrideWS || "ws://localhost:6968"
    });
});

module.exports = {
    DefaultAPI: "/api/*",
    App
};