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

export interface IExperimentFilter {
    ExperimentHash: number,
    TargettedUsers: string[],
    TargettedGuilds: string[],
    Bucket: number
}