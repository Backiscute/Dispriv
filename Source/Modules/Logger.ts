import { green, gray, red, magenta } from "colorette";

const DebugEnabled = true;

export function Msg(Content: string, Prefix = "Discord") {
    console.log(`${gray(new Date().toISOString())} [${green(Prefix)}] ${Content}`);
}

export function Error(Content: string) {
    console.log(`${gray(new Date().toISOString())} [${red("ERROR")}] ${Content}`);
}

export function Debug(Content: string, Prefix = "Discord Debug") {
    if (!DebugEnabled) return;
    console.log(`${gray(new Date().toISOString())} [${magenta("DEBUG | ") + magenta(Prefix)}] ${Content}`);
}
