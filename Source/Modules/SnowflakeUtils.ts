import { DISCORD_EPOCH } from "./DiscordUtils";

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
