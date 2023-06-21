import udp from "dgram";
import { Msg } from "../Modules/Logger";
import chalk from "chalk";

const Server = udp.createSocket("udp4");

Server.on("message", (msg, info) => {
    Server.send("", info.port, info.address);
    Msg(
        `Received packet from client ${chalk.red(info.address)}:${chalk.red(info.port)}: ${msg.toString("hex")}`,
        "RTCMediaServer"
    );
});

Server.on("listening", () => {
    const Address = Server.address();
    Msg(`Server is listening on ${chalk.red(Address.address)}:${chalk.red(Address.port)}`, "RTCMediaServer");
});

Server.bind(50008);
