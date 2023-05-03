"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Debug = exports.Error = exports.Msg = void 0;
require("colors");
const DebugEnabled = true;
function Msg(Content, Prefix = "Discord") {
    console.log(`${new Date().toISOString().gray} [${Prefix.green}] ${Content}`);
}
exports.Msg = Msg;
function Error(Content) {
    console.log(`${new Date().toISOString().gray} [${"ERROR".red}] ${Content}`);
}
exports.Error = Error;
function Debug(Content, Prefix = "Discord Debug") {
    if (!DebugEnabled)
        return;
    console.log(`${new Date().toISOString().gray} [${"DEBUG | ".magenta + Prefix.magenta}] ${Content}`);
}
exports.Debug = Debug;
