import { VerifyAuth } from "../Modules/AuthUtils";
import { Router } from "express";
import { existsSync } from "fs";
import path from "path";
import multer from "multer";

const App = Router();
const Multer = multer({
    dest: path.join(__dirname, "..", "Assets", "Attachments")
});

App.put("/upload/:ChannelId/:Filename", (req, res, next) => {
    req.headers.authorization = req.query.auth as string;
    next();
}, VerifyAuth, Multer.array("files"), async (req, res) => {
    console.log(req.files, req.body);
    res.status(500);
});

App.get(["/*/*/:FileName", "/*/:FileName"], (req, res) => {
    if (!/^[a-z0-9.-]+$/g.test(req.params.FileName)) return res.status(403).json({ code: 0, message: "nuh uh" });

    if (!existsSync(path.join(__dirname, "..", "Assets", req.params.FileName))) return res.status(404).send();

    res.status(200).sendFile(path.join(__dirname, "..", "Assets", req.params.FileName));
});

module.exports = {
    DefaultAPI: "/cdn",
    App,
};
