import { WebSocketServer } from "ws";
import { Msg } from "../Modules/Logger";
import { RTCConnection } from "../Classes/RTCConnection";
import { SendOp } from "../Modules/WebRTCUtils";
import { RTCCloseCodes, RTCOpCodes } from "../Classes/RTCOpCodes";
import { red } from "colorette";
import { VoiceSession } from "../Classes/VoiceSession";
import bcrypt from "bcrypt";
import { GetUserByID } from "../Modules/AuthUtils";
import crypto from "crypto";

export const VoiceSessions: VoiceSession[] = [];

const Socket = new WebSocketServer({
    port: parseInt(process.env.RTCWSPORT) || 6967,
});

const Connections: RTCConnection[] = [];
Socket.on("connection", (Client) => {
    const RTCClient = new RTCConnection(Client);
    Connections.push(RTCClient);

    Client.on("close", () => {
        const Idx = Connections.findIndex((C) => C.ID === RTCClient.ID);
        if (Idx !== -1)
            Connections.splice(Idx, 1);
    });

    SendOp(RTCClient, RTCOpCodes.HELLO, {v: 7, heartbeat_interval: 13750});

    Msg(`Client ${red(RTCClient.ID)} connected to WebRTC!`, "RTCSocket");
    Client.on("message", async (Data) => {
        const Payload = JSON.parse(Data.toString()); // buffer to json
        if (!Payload) return Client.close(4002, "Failed to decode payload");

        Msg(`Received packet from client ${red(RTCClient.ID)}: ${JSON.stringify(Payload)}`, "RTCSocket");
        switch (Payload.op) {
            case RTCOpCodes.HEARTBEAT:
                return SendOp(RTCClient, RTCOpCodes.HEARTBEAT_ACK, Date.now());
            case RTCOpCodes.REQUEST_VERSIONS:
                return SendOp(RTCClient, RTCOpCodes.REQUEST_VERSIONS, { voice: "0.0.1", rtc_worker: "0.3.42" });
            case RTCOpCodes.IDENTIFY:
                if (!Payload.d.server_id || !Payload.d.user_id || !Payload.d.session_id || !Payload.d.token) {
                    SendOp(RTCClient, RTCCloseCodes.BadPayload, { message: "Bad payload" });
                    return Client.close();
                }
                RTCClient.Account = await GetUserByID(Payload.d.user_id, {
					AvailableDMs: {
						DMRecipients: true
					},
					RelationsFrom: true,
					RelationsRegarding: true,
					Memberships: {
						Owner: false,
						ToGuild: {
							Members: {
								Owner: true,
								Roles: true
							},
							Channels: {
								OwnerCategory: true
							}
						}
					}
				});
                if (!RTCClient.Account || !bcrypt.compareSync(`${Payload.d.server_id}-${RTCClient.Account.ID}-${RTCClient.Account.Password}`, Payload.d.token)) {
                    SendOp(RTCClient, RTCCloseCodes.AuthenticationFailed, "Authentication Failed");
                    return Client.close();
                }
                SendOp(RTCClient, RTCOpCodes.READY, {
                    ssrc: crypto.randomInt(2^48),
                    ip: process.env.OverrideRTC,
                    port: process.env.RTCWSPORT,
                    modes: ["xsalsa20_poly1305"],
                    experiments: [],
                    //TODO: add video streams
                    streams: []
                });
                break;
            default:
                console.log("unknown op"); // TODO FOR VOICE CHANNELS
        }
    });
});