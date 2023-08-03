import { z } from "zod";

export const TOTPAuthSchema = z.object({
    code: z.string(),
    ticket: z.string()
});