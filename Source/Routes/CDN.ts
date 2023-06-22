import { JsonErrorCodes } from "../Classes/JsonOpCodes";
import { UploadAttachment } from "../Modules/AssetUtils";
import { VerifyAuth } from "../Modules/AuthUtils";
import { Error } from "../Modules/Logger";
import { Router, raw } from "express";
import { existsSync } from "fs";
import path from "path";

const App = Router();

App.put("/upload/:Filename", raw({
    type: () => true,
    limit: "25mb",
}), (req, res, next) => {
    req.headers.authorization = req.query.auth as string;
    next();
}, VerifyAuth, async (req, res) => {
    try {
        UploadAttachment(req.body as Buffer, req.headers["content-type"] as string, req.params.Filename);
        res.sendStatus(200);
    } catch (err) {
        Error(`An error occured while saving a file to CDN. ${(err as Error | string).toString()}`);
        res.status(500).json({
            code: 0,
            message: "Internal server error while uploading to CDN"
        });
    }
});

App.get("/attachments/:ChannelID/:AttachmentID/:Filename", async (req, res) => {
    const FilePath = path.join(__dirname, "..", "Assets", "Attachments", `${req.params.ChannelID}-${req.params.AttachmentID}-${req.params.Filename}`);
    if (existsSync(FilePath)) {
        if (["jpeg", "png", "jpg"].includes(req.query.format as string) && ["mp4", "ogv", "webm", "avi", "mpeg"].includes(req.params.Filename.split(".")[1])) {
            const ThumbnailPath = path.join(__dirname, "..", "Assets", "Attachments", `${req.params.ChannelID}-${req.params.AttachmentID}-${req.params.Filename.split(".")[0]}.${req.query.format}`);
            if (existsSync(ThumbnailPath)) res.sendFile(ThumbnailPath);
            else {
                if (existsSync(ThumbnailPath.replace(`.${req.query.format}`, ".jpeg"))) res.sendFile(ThumbnailPath.replace(`.${req.query.format}`, ".jpeg"));
                else if (existsSync(ThumbnailPath.replace(`.${req.query.format}`, ".jpg"))) res.sendFile(ThumbnailPath.replace(`.${req.query.format}`, ".jpg"));
                else if (existsSync(ThumbnailPath.replace(`.${req.query.format}`, ".png"))) res.sendFile(ThumbnailPath.replace(`.${req.query.format}`, ".png"));
                else setTimeout(() => res.sendFile(ThumbnailPath), 6000);
            }
        } else res.sendFile(FilePath);
    } else res.status(404).json({
        code: JsonErrorCodes.FileNotFound,
        message: "File not found."
    });
});
App.get(["/*/*/:Filename", "/*/:Filename"], (req, res) => {
    if (!/^[a-z0-9.-]+$/g.test(req.params.Filename)) return res.status(403).json({ code: 0, message: "nuh uh" });

    if (!existsSync(path.join(__dirname, "..", "Assets", req.params.Filename))) return res.status(404).send();

    res.status(200).sendFile(path.join(__dirname, "..", "Assets", req.params.Filename));
});

module.exports = {
    DefaultAPI: "/cdn",
    App,
};
