import chalk from "chalk";

const DebugEnabled = true;

export function Msg(Content: string, Prefix = "Discord") {
    console.log(`${chalk.gray(new Date().toISOString())} [${chalk.green(Prefix)}] ${Content}`);
}

export function Error(Content: string) {
    console.log(`${chalk.gray(new Date().toISOString())} [${chalk.red("ERROR")}] ${Content}`);
}

export function Debug(Content: string, Prefix = "Discord Debug") {
    if (!DebugEnabled) return;
    console.log(`${chalk.gray(new Date().toISOString())} [${chalk.magenta("DEBUG | ") + chalk.magenta(Prefix)}] ${Content}`);
}
