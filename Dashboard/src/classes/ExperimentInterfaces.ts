import { GuildFeatures } from "@/components/GuildCard";

export interface IRawExperiment {
    type: "user" | "guild",
    title: string,
    description: string[],
    buckets: number[]
}

export interface IConvertedExperiment {
    Type: "user" | "guild",
    HashableName: string,
    CalculatedHash: number,
    ReadableName: string,
    Treatments: string[],
    Buckets: number[]
}

export const HasFeature = 1604612045;
export const IDRange = 2404720969;
export const MemberCount = 2918402255;
export const GuildIDs = 3013771838;
export const HubTypes = 4148745523;
export const HasVanityURL = 188952590;
export const InRangeByHash = 2294888943;

export enum GuildFilterType {
    USER, // for user
    HAS_FEATURE,
    ID_RANGE,
    MEMBER_COUNT,
    GUILD_IDS,
    HUB_TYPES,
    HAS_VANITY_URL,
    IN_RANGE_BY_HASH
}

export interface IExperimentFilter {
    ExperimentHash: number,
    AffectsEveryone: boolean,
    TargetedUsers: string[],
    TargetedGuilds: string[],
    Bucket: number,
    Properties?: {
        Percentage?: { s: number, e: number },
        RequiredGuildFeatures?: GuildFeatures[],
        IDRanges?: { s: string, e: string }[] // [{ s: "1000000000000", "200000000000000000000" }]
        MembersRequired?: { s: string, e: string }[],
        VanityURLRequired?: boolean
    }
}
