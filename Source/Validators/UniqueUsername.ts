import { z } from "zod";

export const UsernameAvailableUnAuthedSchema = z.object({
    username: z.string().min(2).max(32)
});