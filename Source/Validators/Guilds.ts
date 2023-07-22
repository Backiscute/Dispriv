import { z } from "zod";

export const CustomEmojiUploadSchema = z.object({
    image: z.string(),
    name: z.string().min(2).max(32)
});