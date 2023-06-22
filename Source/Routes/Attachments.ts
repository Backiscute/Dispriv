import { Router } from "express";
import { FindAttachment } from "../Modules/AssetUtils";
import fs from "fs";

const App = Router();

App.delete("/:Filename", (req, res) => {
    const Attachment = FindAttachment(req.params.Filename);
    if (Attachment) fs.rmSync(Attachment);
    res.sendStatus(200);
});

module.exports = {
    DefaultAPI: "/api/v9/attachments",
    App,
};
