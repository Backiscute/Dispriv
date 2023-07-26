import { DISCORD_EPOCH } from "./DiscordUtils";

interface SnowflakeOptions {
    Timestamp?: number;
    WorkerID?: number;
    ProcessID?: number;
    Sequence?: number;
}

let SnowflakeSequence = 0;

export function GenerateSnowflake(options: SnowflakeOptions = {}): string {
    const Timestamp = options.Timestamp ?? Date.now();
    const WorkerID = options.WorkerID ?? 1;
    const ProcessID = options.ProcessID ?? 0;
    const Sequence = ++SnowflakeSequence;

    const Snowflake =
        ((BigInt(Timestamp) - BigInt(DISCORD_EPOCH)) << BigInt(22)) |
        (BigInt(WorkerID) << BigInt(17)) |
        (BigInt(ProcessID) << BigInt(12)) |
        BigInt(Sequence);

    return Snowflake.toString();
}

export function GenerateCode(length: number): string {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";
    const charactersLength = characters.length;

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charactersLength);
        code += characters.charAt(randomIndex);
    }

    return code;
}
