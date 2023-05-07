import * as express from "express";
import * as env from "dotenv";

import * as fs from "fs";
import { Msg } from "../Modules/Logger";
import { GenerateSnowflake, GenerateToken } from "../Modules/SnowflakeUtils";

env.config();

export const Application = express.default();
Application.disable("etag");
Application.disable("x-powered-by");

Application.use(express.json());

const Files = fs.readdirSync("./bin/Routes");

const Snowflake = GenerateSnowflake({
    Timestamp: Date.now(),
    WorkerID: 1,
    ProcessID: 0,
    Sequence: 0,
});

console.log(Snowflake);
console.log(GenerateToken(Snowflake, Date.now(), "test"));

(async () => {
    for (let I = 0; I < Files.length; I++) {
        const V = Files[I];
    
        if (!V.endsWith(".js")) return;
    
        const Contents = await import(`../Routes/${V}`);
        Application.use(Contents.default.DefaultAPI || "/", Contents.default.App);
    
        Msg(`Loaded file ${V.italic}!`);
    }
    
    Application.listen(process.env.PORT, () => Msg(`Application now listening on port ${process.env.PORT.green}`));
})();

Application.use(function(req,res){
    res.status(404).json({"message": "404: Not Found", "code": 0});
});