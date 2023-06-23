import { green, gray, red, magenta } from "colorette";
import WebSocket, { WebSocketServer } from "ws";

const Socket = new WebSocketServer({
    port: 6970,
    path: "/api/tests/ws",
});

export const LoggingClients: WebSocket[] = [];

Socket.on("connection", (WS) => {
    LoggingClients.push(WS);
});

function LoggingSendToClients(data: string) {
    LoggingClients.forEach((Client) => {
        Client.send(data);
    });
}

const DebugEnabled = true;

export function Msg(Content: string, Prefix = "Discord") {
    console.log(`${gray(new Date().toISOString())} [${green(Prefix)}] ${Content}`);
    LoggingSendToClients(`${new Date().toISOString()} [${Prefix}] ${Content}`);
}

export function Error(Content: string) {
    console.log(`${gray(new Date().toISOString())} [${red("ERROR")}] ${Content}`);
    LoggingSendToClients(`${new Date().toISOString()} [ERROR] ${Content}`);
}

export function Debug(Content: string, Prefix = "Discord Debug") {
    if (!DebugEnabled) return;
    console.log(`${gray(new Date().toISOString())} [${magenta("DEBUG | ") + magenta(Prefix)}] ${Content}`);
    LoggingSendToClients(`${new Date().toISOString()} [DEBUG | ${Prefix}] ${Content}`);
}
