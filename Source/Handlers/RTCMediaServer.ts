import udp from "dgram";
import { Msg } from "../Modules/Logger";
import { red, green } from "colorette";

const Server = udp.createSocket("udp4");

Server.on("message", (msg, info) => {
    Server.send("", info.port, info.address);
    Msg(`Received packet from client ${red(info.address)}:${red(info.port)}: ${msg.toString("hex")}`, "RTCMediaServer");
});

Server.on("listening", () => {
    const Address = Server.address();
    Msg(`Voice server now listening on ${green(Address.port)}`, "RTCMediaServer");
});

Server.bind(50008);
