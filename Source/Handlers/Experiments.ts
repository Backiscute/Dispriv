import { readFileSync } from "fs";
import { GuildFeatures, GuildHubType } from "../Entities/Guild";
import { User } from "../Entities/User";

export interface IConvertedExperiment {
    Type: "user" | "guild",
    HashableName: string,
    CalculatedHash: number,
    ReadableName: string,
    Treatments: string[],
    Buckets: number[]
}

export interface IExperimentFilter {
    ExperimentHash: number,
    AffectsEveryone: boolean,
    TargettedUsers: string[],
    TargettedGuilds: string[],
    Bucket: number
}

export const HasFeature = 1604612045;
export const IDRange = 2404720969;
export const MemberCount = 2918402255;
export const GuildIDs = 3013771838;
export const HubTypes = 4148745523;
export const HasVanityURL = 188952590;
export const InRangeByHash = 2294888943;

export type HasFeatureFilter = [
    FilterTypeHash: typeof HasFeature,
    Requirements:
        [Features: 1183251248, FeaturesArray: GuildFeatures[]] // guild_has_feature
];

export type IDRangeOrMemberCountFilter = [
    FilterTypeHash: typeof IDRange | typeof MemberCount,
    Requirements:
        [[MinID: 3399957344, MinimumRange: number | string], [MaxID: 1238858341, MaximumRange: number | string]] // guild_id_range, guild_member_count_range
];

export type GuildIDsFilter = [
    FilterTypeHash: typeof GuildIDs,
    Requirements:
        [GuildIDsHash: 3013771838, Guilds: string[]] // guild_ids
];

export type HubTypesFilter = [
    FilterTypeHash: typeof HubTypes,
    Requirements:
        [GuildHubTypes: 4148745523, HubTypes: GuildHubType[]] // guild_hub_types
];

export type HasVanityURLFilter = [
    FilterTypeHash: typeof HasVanityURL,
    Requirements:
        [VanityURLHash: 188952590, HasVanityURL: boolean] // guild_has_vanity_url
];

export type InRangeByHashFilter = [
    FilterTypeHash: typeof InRangeByHash,
    Requirements:
        [[HashKey: 2690752156, HashedKey: number], [TargetKey: 1982804121, TargetValue: number]] // guild_in_range_by_hash
];

export type UserExperiment = [
    MurmurHash: number,
    Rev: number,
    Bucket: number,
    Override: number,
    Population: number,
    AAMode: number
];

export type GuildExperiment = [
    MurmurHash: number,
    ReadableName: string | null,
    Rev: number,
    Populations: [
        Ranges: [
            Bucket: number,
            Rollout: {
                s: number,
                e: number
            }[]
        ][],
        Filters: (HasFeatureFilter | IDRangeOrMemberCountFilter | GuildIDsFilter | HubTypesFilter | HasVanityURLFilter)[]
    ][],
    Overrides: [], // NO I HAVE TO DO ALLAT OVER AGAIN NO
    OverridesFormatted: [],
    OnlyEnabledWithExperiment: string | null,
    OnlyEnabledWithExperimentsBucket: number | null,
    AAMode: number
];

export const ExperimentsPath = "./Configs/Experiments.yaml";
export const FiltersPath = "./Configs/ExperimentsConfig.yaml";

export let Experiments: IConvertedExperiment[] = [];
export let Filters: IExperimentFilter[] = [];

export function PackageExperiment(Exp: IConvertedExperiment, InContext?: User): UserExperiment | GuildExperiment {
    if (Exp.Type === "guild") {
        const RelatedFilters = Filters.filter(x => x.ExperimentHash === Exp.CalculatedHash);
        return [
            Exp.CalculatedHash,
            Exp.ReadableName,
            1,
            [ // Populations
                [ // ->
                    [ // Ranges
                        [ // ->
                            -1, // Bucket
                            [ // Rollout
                                {
                                    s: 0, // 0% -
                                    e: 10000 // 100%
                                }
                            ]
                        ]
                    ],
                    []
                ],
                [
                    [],
                    []
                ]
            ],
            [],
            [],
            null,
            null,
            0
        ];
    }

    // TODO: user experimento
}

export function ReloadConfigs() {
    Experiments = JSON.parse(readFileSync(ExperimentsPath).toString());
    Filters = JSON.parse(readFileSync(FiltersPath).toString());
}


export function GetExperiments(ForUser: User) {

}

ReloadConfigs();