/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { GatewayConnection } from "../Classes/GatewayConnection";
import { GatewayCloseCodes, OpCodes } from "../Classes/GatewayOpCodes";
import { SpeedTestCreatePacket, SpeedTestServerUpdatePacket } from "../Classes/GatewayPackets";
import { CloseConnection, SendOp } from "../Modules/GatewayUtils";

export async function HandleOpcode(UnpackedData: any, GatewayClient: GatewayConnection) {
    if (!GatewayClient.Account!)
        return CloseConnection(GatewayClient, GatewayCloseCodes.NotAuthenticated, "Not authenticated");
    SendOp<SpeedTestCreatePacket>(
        GatewayClient,
        OpCodes.DISPATCH,
        {
            paused: false,
            region: "us-south",
            rtc_server_id: "1",
            stream_key: "test:" + GatewayClient.Account!.ID,
            stream_server_id: "1",
            viewer_ids: [],
        },
        null,
        "SPEED_TEST_CREATE",
    );
    SendOp<SpeedTestServerUpdatePacket>(
        GatewayClient,
        OpCodes.DISPATCH,
        {
            endpoint: "127.0.0.1:" + process.env.RTCWSPORT || "6967",
            guild_id: undefined,
            stream_key: "test:" + GatewayClient.Account!.ID,
            token: GatewayClient.UserToken,
        },
        null,
        "SPEED_TEST_SERVER_UPDATE",
    );
}