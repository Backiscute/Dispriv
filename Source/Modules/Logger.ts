import { TestSendToClients } from "../Handlers/TestWebsocket";
import { green, gray, red, magenta } from "colorette";

const DebugEnabled = true;

export function Msg(Content: string, Prefix = "Discord") {
    console.log(`${gray(new Date().toISOString())} [${green(Prefix)}] ${Content}`);
    TestSendToClients(`${new Date().toISOString()} [${Prefix}] ${Content}`, "log");
}

export function Err(Content: string) {
    console.log(`${gray(new Date().toISOString())} [${red("ERROR")}] ${Content}`);
    TestSendToClients(`${new Date().toISOString()} [ERROR] ${Content}`, "log");
}

export function Debug(Content: string, Prefix = "Discord Debug") {
    if (!DebugEnabled) return;
    console.log(`${gray(new Date().toISOString())} [${magenta("DEBUG | ") + magenta(Prefix)}] ${Content}`);
    TestSendToClients(`${new Date().toISOString()} [DEBUG | ${Prefix}] ${Content}`, "log");
}
