"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Application = void 0;
const express = __importStar(require("express"));
const env = __importStar(require("dotenv"));
const fs = __importStar(require("fs"));
const Logger_1 = require("../Modules/Logger");
const SnowflakeUtils_1 = require("../Modules/SnowflakeUtils");
env.config();
exports.Application = express.default();
exports.Application.disable("etag");
exports.Application.disable("x-powered-by");
exports.Application.use(express.json());
const Files = fs.readdirSync("./bin/Routes");
const Snowflake = (0, SnowflakeUtils_1.GenerateSnowflake)({
    Timestamp: Date.now(),
    WorkerID: 1,
    ProcessID: 0,
    Sequence: 0,
});
console.log(Snowflake);
console.log((0, SnowflakeUtils_1.GenerateToken)(Snowflake, Date.now(), "test"));
(async () => {
    for (let I = 0; I < Files.length; I++) {
        const V = Files[I];
        if (!V.endsWith(".js"))
            return;
        const Contents = await import(`../Routes/${V}`);
        exports.Application.use(Contents.default.DefaultAPI || "/", Contents.default.App);
        (0, Logger_1.Msg)(`Loaded file ${V.italic}!`);
    }
    exports.Application.listen(process.env.PORT, () => (0, Logger_1.Msg)(`Application now listening on port ${process.env.PORT.green}`));
})();
exports.Application.use(function (req, res) {
    res.status(404).json({ "message": "404: Not Found", "code": 0 });
});
