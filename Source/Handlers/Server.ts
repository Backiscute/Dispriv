import * as express from "express";
import * as env from "dotenv";

import * as fs from "fs";
import { Msg } from "../Modules/Logger";
env.config();

export const Application = express.default();
Application.disable("etag");
Application.disable("x-powered-by");

Application.use(express.json({
	limit: "5mb"
}));

const Files = fs.readdirSync("./bin/Routes");

(async () => {
    for (let I = 0; I < Files.length; I++) {
        const V = Files[I];
    
        if (!V.endsWith(".js")) continue;
    
        const Contents = await import(`../Routes/${V}`);
        if (!Contents.default.App) continue;
        Application.use(Contents.default.DefaultAPI || "/", Contents.default.App);
    
        Msg(`Loaded file ${V.italic}!`);
    }
    
    Application.use((req, res) => res.status(404).json({"message": "404: Not Found", "code": 0}));

    Application.listen(process.env.PORT, () => Msg(`Application now listening on port ${process.env.PORT.green}`));
})();
