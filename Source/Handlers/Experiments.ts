import { existsSync, readFileSync } from "fs";
import { GuildFeatures, GuildHubType } from "../Entities/Guild";
import { User } from "../Entities/User";
import yaml from "yaml";
import { Err, Msg } from "../Modules/Logger";
import chokidar from "chokidar";

export interface IConvertedExperiment {
    Type: "user" | "guild",
    HashableName: string,
    CalculatedHash: number,
    ReadableName: string,
    Treatments: string[],
    Buckets: number[]
}

/* eslint-disable no-unused-vars */
export enum GuildFilterType {
    HAS_FEATURE,
    ID_RANGE,
    MEMBER_COUNT,
    GUILD_IDS,
    HUB_TYPES,
    HAS_VANITY_URL,
    IN_RANGE_BY_HASH
}
/* eslint-enable no-unused-vars */

export interface IExperimentFilter {
    ExperimentHash: number,
    AffectsEveryone: boolean,
    TargetedUsers: string[],
    TargetedGuilds: string[],
    Bucket: number,
    Properties?: {
        RequiredGuildFeatures?: GuildFeatures[],
        IDRanges?: { s: string, e: string }[] // [{ s: "1000000000000", "200000000000000000000" }]
        MembersRequired?: { s: string, e: string }[],
        VanityURLRequired?: boolean,
        Percentage?: { s: number, e: number }
    }
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
        [[Features: 1183251248, FeaturesArray: GuildFeatures[]]] // guild_has_feature
];

export type IDRangeOrMemberCountFilter = [
    FilterTypeHash: typeof IDRange | typeof MemberCount,
    Requirements:
        [[MinID: 3399957344, MinimumRange: number | string], [MaxID: 1238858341, MaximumRange: number | string]] // guild_id_range, guild_member_count_range
];

export type GuildIDsFilter = [
    FilterTypeHash: typeof GuildIDs,
    Requirements:
        [[GuildIDsHash: 3013771838, Guilds: string[]]] // guild_ids
];

export type HubTypesFilter = [
    FilterTypeHash: typeof HubTypes,
    Requirements:
        [[GuildHubTypes: 4148745523, HubTypes: GuildHubType[]]] // guild_hub_types
];

export type HasVanityURLFilter = [
    FilterTypeHash: typeof HasVanityURL,
    Requirements:
        [[VanityURLHash: 188952590, HasVanityURL: boolean]] // guild_has_vanity_url
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

export type GuildExperimentPopulations = [
    Ranges: [
        Bucket: number,
        Rollout: {
            s: number,
            e: number
        }[]
    ][],
    Filters: (HasFeatureFilter | IDRangeOrMemberCountFilter | GuildIDsFilter | HubTypesFilter | HasVanityURLFilter)[]
];

export type GuildExperiment = [
    MurmurHash: number,
    ReadableName: string | null,
    Rev: number,
    Populations: GuildExperimentPopulations[],
    Overrides: [], // NO I HAVE TO DO ALLAT OVER AGAIN NO
    OverridesFormatted: [],
    OnlyEnabledWithExperiment: string | null,
    OnlyEnabledWithExperimentsBucket: number | null,
    AAMode: number
];

export const ExperimentsPath = "./Configs/Experiments.yaml";
export const FiltersPath = "./Configs/ExperimentConfig.yaml";

export let Experiments: IConvertedExperiment[] = [];
export let Filters: IExperimentFilter[] = [];

export function PackageExperiment(Exp: IConvertedExperiment, U?: User | null): UserExperiment | GuildExperiment | null {
    const RelatedFilters = Filters.filter(x => x.ExperimentHash === Exp.CalculatedHash);
    if (Exp.Type === "guild") {
        const Populations: GuildExperimentPopulations[] = [];
        /*
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
        ]
        */
        for (const NFilter of RelatedFilters) {
            const PopulationItem: GuildExperimentPopulations =
            [
                [], // Ranges
                [] // Filters
            ];

            if (NFilter.Properties?.Percentage)
                PopulationItem[0].push([
                    NFilter.Bucket,
                    [
                        {
                            s: NFilter.Properties.Percentage.s * 100,
                            e: NFilter.Properties.Percentage.e * 100
                        }
                    ]
                ]);

            if (NFilter.Properties?.RequiredGuildFeatures)
                PopulationItem[1].push([
                    HasFeature,
                    [
                        [
                            1183251248,
                            NFilter.Properties.RequiredGuildFeatures
                        ]
                    ]
                ]);

            if (NFilter.Properties?.IDRanges)
                for (const FMR of NFilter.Properties.IDRanges)
                    PopulationItem[1].push([
                        IDRange,
                        [
                            [
                                3399957344,
                                FMR.s
                            ],
                            [
                                1238858341,
                                FMR.e
                            ]
                        ]
                    ]);

            if (NFilter.Properties?.MembersRequired)
                for (const FMR of NFilter.Properties.MembersRequired)
                    PopulationItem[1].push([
                        MemberCount,
                        [
                            [
                                3399957344,
                                FMR.s
                            ],
                            [
                                1238858341,
                                FMR.e
                            ]
                        ]
                    ]);
            
            if (NFilter.Properties?.VanityURLRequired)
                PopulationItem[1].push([
                    HasVanityURL,
                    [
                        [
                            188952590,
                            NFilter.Properties.VanityURLRequired
                        ]
                    ]
                ]);

            if (NFilter.TargetedGuilds.length !== 0)
                PopulationItem[1].push([
                    GuildIDs,
                    [
                        [
                            3013771838,
                            NFilter.TargetedGuilds
                        ]
                    ]
                ]);

            Populations.push(PopulationItem);
        }

        return [
            Exp.CalculatedHash,
            Exp.HashableName,
            1,
            Populations,
            [],
            [],
            null,
            null,
            0
        ];
    }

    // TODO: user experimento
    const HighestFilterRelatedToUser = RelatedFilters.filter(x => x.AffectsEveryone || (U && x.TargetedUsers.includes(U.ID)));
    if (HighestFilterRelatedToUser.length === 0)
        return null;

    const F = HighestFilterRelatedToUser[0];

    const UExperiment: UserExperiment =
    [
        Exp.CalculatedHash, // murmurhash3 of the name
        1, // revision
        F.Bucket, // global bucket
        F.Bucket, // override
        0, // internal position (doesnt matter)
        0 // A/A testing (boolean converted to number)
    ];

    return UExperiment;
}

export function ReloadConfigs() {
    if (!existsSync(ExperimentsPath) || !existsSync(FiltersPath))
        return Err("Experiment configs were not found! Please generate them using the database.");

    const TempE = yaml.parse(readFileSync(ExperimentsPath).toString());

    Experiments = Object.keys(TempE).map(x => TempE[x]);
    Filters = yaml.parse(readFileSync(FiltersPath).toString());
}

export function GetUserExperiments(For: User | null) {
    const Arr: (GuildExperiment | UserExperiment | null)[] = [];
    for (const Exp of Experiments.filter(x => x.Type === "user"))
        Arr.push(PackageExperiment(Exp, For));

    // TODO: make this not hacky and actually check for UserExperiment
    return Arr.filter(x => x !== null && x.length === 6);
}

export function GetGuildExperiments() {
    const Arr: (GuildExperiment | UserExperiment | null)[] = [];
    for (const Exp of Experiments.filter(x => x.Type === "guild"))
        Arr.push(PackageExperiment(Exp));

    // TODO: make this not hacky and actually check for UserExperiment
    return Arr.filter(x => x !== null && x.length === 9);
}

ReloadConfigs();

chokidar.watch("./Configs").on("change", () => {
    Msg("Detected config changes! Reloading cache.", "Config Watcher");
    ReloadConfigs();
});