import * as crypto from "crypto";
import { User } from "../Entities/User";
import { DISCORD_EPOCH } from "./DiscordUtils";
import { NextFunction, Request, Response } from "express";

export function GenerateToken(Snowflake: string, Timestamp: number, HashedPassword: string): string {
    const EncodedId = Buffer.from(Snowflake).toString("base64url");
    const EncodedTimestamp = Buffer.from((Timestamp - DISCORD_EPOCH).toString()).toString("base64url");
    const Content = `${EncodedId}.${EncodedTimestamp}`;
    const Signature = crypto.createHmac("sha256", HashedPassword).update(Content).digest("base64url");
    return `${Content}.${Signature}`;
}

export function GetTokenTimestamp(token: string): number {
    const Parts = token.split(".");
    if (Parts.length !== 3) {
        throw new Error("Invalid token format");
    }
    const EncodedTimestamp = Parts[1];
    const Timestamp = parseInt(Buffer.from(EncodedTimestamp, "base64url").toString()) + DISCORD_EPOCH;
    return Timestamp;
}

export function GetTokenUserId(token: string): string {
    const Parts = token.split(".");
    if (Parts.length !== 3) {
        throw new Error("Invalid token format");
    }
    const EncodedId = Parts[0];
    const Id = Buffer.from(EncodedId, "base64url").toString();
    return Id;
}

export async function VerifyToken(token: string) : Promise<boolean> {
    const Parts = token.split(".");
    if (Parts.length !== 3) return false;

    const UserID = GetTokenUserId(token);

    const EncodedId = Parts[0];
    const EncodedTimestamp = Parts[1];

    const TUser = await User.findOneBy({ ID: UserID });
    if (!TUser) return false;

    const UserHashedPassword = TUser.Password;
    
    const Content = `${EncodedId}.${EncodedTimestamp}`;
    const Signature = crypto.createHmac("sha256", UserHashedPassword).update(Content).digest("base64url");

    return Parts[2] === Signature;
}

export async function GetUserByID(ID: string, relations?: object) {
    const TUser = await User.findOne({ where: { ID }, relations: relations });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return TUser!;
}

export async function GetUserByToken(token: string, relations?: object) {
    const ValidToken = await VerifyToken(token);
    if (!ValidToken) return undefined;

    const UserID = GetTokenUserId(token);

    const TUser = await User.findOne({ where: { ID: UserID }, relations: relations });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return TUser!;
}

export async function GetUserByRequest(req: Request, relations?: object) {
    let Token = req.headers.authorization ?? "";
    if (Token.startsWith("Bearer ")) Token = Token.substring(7);

    const ValidToken = await VerifyToken(Token);
    if (!ValidToken) return null;

    const UserID = GetTokenUserId(Token);

    if (relations  === undefined) relations = {}; // to prevent crashes

    //console.log({ where: { ID: UserID }, relations: relations });
    const TUser = await User.findOne({ where: { ID: UserID }, relations: relations });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return TUser!;
}

export function VerifyAuth(req: Request, res: Response, next: NextFunction) {
    let Auth = req.headers.authorization;
    if (!Auth) return res.status(401).json({"code": 0, "message": "401: Unauthorized"});

    if (Auth.startsWith("Bearer ")) Auth = Auth.substring(7);

    VerifyToken(Auth).then(Valid => {
        if (!Valid) return res.status(401).json({"code": 0, "message": "401: Unauthorized"});
        next();
    }).catch(() => {
        return res.status(401).json({"code": 0, "message": "401: Unauthorized"});
    });
}