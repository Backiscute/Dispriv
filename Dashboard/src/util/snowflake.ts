export function SnToDate(Snowflake: string) {
  	return new Date(Number((BigInt(Snowflake) >> 22n) + 1420070400000n));
}