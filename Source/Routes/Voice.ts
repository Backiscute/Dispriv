import { Router } from "express";

const App = Router();

App.get("/regions", (req, res) => {
    res.json({ id: "dispriv", name: "Dispriv Voice", custom: false, deprecated: false, optimal: true });
});

module.exports = {
    DefaultAPI: "/api/v9/voice",
    App
};