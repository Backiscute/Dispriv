import sharp from "sharp";
import { JsonErrorCodes } from "../Classes/JsonOpCodes";
import { FolderMap, PhotoFileTypes, PhotoMap } from "../Classes/Misc";
import { UploadAttachment } from "../Modules/AssetUtils";
import { VerifyAuth } from "../Modules/AuthUtils";
import { Err } from "../Modules/Logger";
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
        Err(`An error occured while saving a file to CDN. ${(err as Error | string).toString()}`);
        res.status(500).json({
            code: 0,
            message: "Internal server error while uploading to CDN"
        });
    }
});

App.get("/attachments/:ChannelID/:AttachmentID/:Filename", async (req, res) => {
    const FilePath = path.join(__dirname, "..", "Assets", "Attachments", `${req.params.ChannelID}-${req.params.AttachmentID}-${req.params.Filename}`);
    if (existsSync(FilePath)) {
        if (["jpeg", "png", "jpg", "webp", "avif"].includes(req.query.format as string) && ["mp4", "ogv", "webm", "avi", "mpeg"].includes(req.params.Filename.split(".")[1])) {
            const ThumbnailPath = path.join(__dirname, "..", "Assets", "Attachments", `${req.params.ChannelID}-${req.params.AttachmentID}-${req.params.Filename.split(".")[0]}.jpeg`);
            if (req.query.format === "jpg") req.query.format = "jpeg";
            if (existsSync(ThumbnailPath)) {
                const FileInterpreter = sharp(ThumbnailPath)[req.query.format as "png" | "jpeg" | "webp" | "avif"]();
                if (/^\d{2,4}$/.test(req.query.width as string) && /^\d{2,4}$/.test(req.query.height as string)) FileInterpreter.resize(parseInt(req.query.width as string), parseInt(req.query.height as string));
                res.setHeader("Content-Type", PhotoMap[req.query.format  as "png" | "jpeg" | "webp" | "avif"]).send(await FileInterpreter.toBuffer());
            } else res.status(404).json({
                code: JsonErrorCodes.UPLOADED_FILE_NOT_FOUND,
                message: "File not found."
            });
        } else res.sendFile(FilePath);
    } else res.status(404).json({
        code: JsonErrorCodes.UPLOADED_FILE_NOT_FOUND,
        message: "File not found."
    });
});
App.get(["/:Folder/:Filename", "/:Folder/\\d+/:Subfolder/*/:Filename", "/:Folder/\\d+/:Subfolder/\\d+/\\d+/:Filename", "/:Folder/\\d+/:Filename"], async (req, res) => {
    if (!/^[a-z0-9.-]+$/g.test(req.params.Filename)) return res.status(403).json({ code: 0, message: "nuh uh" });
    const FilenameSplit = req.params.Filename.split("."), FilenameRaw = FilenameSplit[0], FileExtension = FilenameSplit[1];
    const FilePath = path.join(__dirname, "..", "Assets", FolderMap[req.params.Folder as keyof typeof FolderMap], req.params.Subfolder ? FolderMap[req.params.Subfolder as keyof typeof FolderMap] : "", FilenameRaw);

    if (!existsSync(FilePath)) return res.status(404).send();
    else {
        if ((PhotoFileTypes as unknown as string[]).includes(FileExtension)) {
            if (FileExtension === "webp") res.status(200).sendFile(FilePath);
            else res.status(200).send(await sharp(FilePath)[FileExtension as typeof PhotoFileTypes[number]]().toBuffer());
        }
        else res.status(200).sendFile(FilePath);
    };
});

module.exports = {
    DefaultAPI: "/cdn",
    App,
};
