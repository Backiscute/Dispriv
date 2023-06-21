import { Router } from "express";

const App = Router();

App.get("/gateway", (req, res) => {
    // unless overriden - send this url
    res.json({
        url: process.env.OverrideWS || "ws://127.0.0.1:6968",
    });
});

App.get("/gateway/bot", (req, res) => {
    // unless overriden - send this url
    res.json({
        url: process.env.OverrideWS || "ws://127.0.0.1:6968",
        session_start_limit: {
            max_concurrency: 1,
            remaining: 1000,
            reset_after: 0,
            total: 1000,
        },
        shards: 1,
    });
});

module.exports = {
    DefaultAPI: "/api/v9",
    App,
};
