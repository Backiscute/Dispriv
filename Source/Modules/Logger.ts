import "colors";

const DebugEnabled = true;

export function Msg(Content: string, Prefix = "Discord") {
    console.log(`${new Date().toISOString().gray} [${Prefix.green}] ${Content}`);
}

export function Error(Content: string) {
    console.log(`${new Date().toISOString().gray} [${"ERROR".red}] ${Content}`);
}

export function Debug(Content: string, Prefix = "Discord Debug") {
    if (!DebugEnabled) return;
    console.log(`${new Date().toISOString().gray} [${"DEBUG | ".magenta + Prefix.magenta}] ${Content}`);
}