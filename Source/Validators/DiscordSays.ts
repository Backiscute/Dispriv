import { z } from "zod";

export const TokenSchema = z.object({
    code: z.string()
});