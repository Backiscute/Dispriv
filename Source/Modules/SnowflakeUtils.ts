import * as crypto from "crypto";
import { User } from "../Entities/User";
import { Msg } from "./Logger";


const DISCORD_EPOCH = 1420070400000;

interface SnowflakeOptions {
  Timestamp?: number;
  WorkerID?: number;
  ProcessID?: number;
  Sequence?: number;
}

export function GenerateSnowflake(options: SnowflakeOptions = {}): string {
    const Timestamp = options.Timestamp ?? Date.now();
    const WorkerID = options.WorkerID ?? 1;
    const ProcessID = options.ProcessID ?? 0;
    const Sequence = options.Sequence ?? 0;

    const Snowflake =
        ((BigInt(Timestamp) - BigInt(DISCORD_EPOCH)) << BigInt(22)) |
        (BigInt(WorkerID) << BigInt(17)) |
        (BigInt(ProcessID) << BigInt(12)) |
        BigInt(Sequence);

    return Snowflake.toString();
}

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

export async function GetUserByToken(token: string, relations?: object) : Promise<User> {
    const ValidToken = await VerifyToken(token);
    if (!ValidToken) return null;

    const UserID = GetTokenUserId(token);

    const TUser = await User.findOne({ where: { ID: UserID }, relations: relations });
    return TUser;
}

export async function GetUserByRequest(req, relations?: object) : Promise<User> {
    let Token = req.headers.authorization;
    if (Token.startsWith("Bearer ")) Token = Token.substring(7);

    const ValidToken = await VerifyToken(Token);
    if (!ValidToken) return null;

    const UserID = GetTokenUserId(Token);

    console.log({ where: { ID: UserID }, relations: relations });
    const TUser = await User.findOne({ where: { ID: UserID }, relations: relations });
    return TUser;
}

export function VerifyAuth(req, res, next) {
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