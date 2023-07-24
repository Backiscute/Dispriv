import { z } from "zod";

export const CustomEmojiUploadSchema = z.object({
    image: z.string(),
    name: z.string().min(2).max(32)
});

export const BoostServerSchema = z.object({
    user_premium_guild_subscription_slot_ids: z.array(z.string())
});