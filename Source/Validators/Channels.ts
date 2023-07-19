import { z } from "zod";

export const MessageSendSchema = z.object({
    content: z.string().max(2000),
    nonce: z.string(),
    flags: z.number().optional(),
    tts: z.boolean().optional(),
    channel_id: z.string().optional(),
    type: z.number().optional(),
    sticker_ids: z.array(z.unknown()).optional(),
    attachments: z.array(
        z.object({
            id: z.string(),
            filename: z.string(),
            uploaded_filename: z.string(),
        })
    ).optional(),
});

export const VCEffectSchema = z.object({
    animation_id: z.number().max(20),
    animation_type: z.number().min(0).max(1),
    emoji_id: z.string().nullable(),
    emoji_name: z.string() // no zod emoji check because custom emojis use strings
});