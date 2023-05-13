import MurmurHash3 from "murmurhash3js";

export function CreateTimestamp(DateToConvert?: Date) { // Creates a timestamp in ISO 8601 format (Discord uses timezone offset +00:00)
    const NewDate = DateToConvert ?? new Date();
    const IsoStringInUTC = NewDate.toISOString().replace("Z", "+00:00");
    return IsoStringInUTC;
}

export function GenerateExperimentHash(Name: string): number {
  const Hash = MurmurHash3.x86.hash32(Name);
  return Hash >>> 0;
}