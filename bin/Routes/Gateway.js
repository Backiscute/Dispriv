"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const App = (0, express_1.Router)();
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
