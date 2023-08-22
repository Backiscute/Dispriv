/* eslint-disable @typescript-eslint/no-explicit-any */
import { GatewayConnection } from "../Classes/GatewayConnection";
import { GatewayCloseCodes, OpCodes } from "../Classes/GatewayOpCodes";
import { SpeedTestDeletePacket } from "../Classes/GatewayPackets";
import { CloseConnection, SendOp } from "../Modules/GatewayUtils";

export async function HandleOpcode(UnpackedData: any, GatewayClient: GatewayConnection) {
    if (!GatewayClient.Account)
        return CloseConnection(GatewayClient, GatewayCloseCodes.NotAuthenticated, "Not authenticated");
    SendOp<SpeedTestDeletePacket>(
        GatewayClient,
        OpCodes.DISPATCH,
        { reason: "user_requested", stream_key: "test:" + GatewayClient.Account.ID },
        null,
        "SPEED_TEST_DELETE",
    );
}