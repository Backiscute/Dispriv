import { z } from "zod";
import { EmbedType } from "../Entities/Message";

export const embedTypeSchema = z.nativeEnum(EmbedType);

export const embedImageSchema = z.object({
    url: z.string().optional(),
    proxy_url: z.string().optional(),
    height: z.number().optional(),
    width: z.number().optional()
});

export const MessageSendSchema = z.object({
    content: z.string().max(2000).default(""),
    nonce: z.string().optional(),
    flags: z.number().optional(),
    tts: z.boolean().optional(),
    channel_id: z.string().optional(),
    type: z.number().optional(),
    sticker_ids: z.array(z.unknown()).optional(),
    embeds: z.array(
        z.object({
            title: z.string().optional(),
            type: embedTypeSchema.optional(),
            description: z.string().optional(),
            url: z.string().optional(),
            timestamp: z.string().transform(string => new Date(string)).optional(),
            color: z.number().optional(),
            footer: z
                .object({
                    text: z.string(),
                    icon_url: z.string().optional(),
                    proxy_icon_url: z.string().optional()
                })
                .optional(),
            image: embedImageSchema.optional(),
            thumbnail: embedImageSchema.optional(),
            video: embedImageSchema.optional(),
            provider: z
                .object({
                    name: z.string().optional(),
                    url: z.string().optional()
                })
                .optional(),
            author: z
                .object({
                    name: z.string().optional(),
                    url: z.string().optional(),
                    icon_url: z.string().optional(),
                    proxy_icon_url: z.string().optional()
                })
                .optional(),
            fields: z
                .array(
                    z.object({
                        name: z.string(),
                        value: z.string(),
                        inline: z.boolean().optional()
                    })
                )
                .optional()
        }) // embed object
    ).optional(),
    attachments: z.array(
        z.object({
            id: z.string(),
            filename: z.string(),
            uploaded_filename: z.string(),
        })
    ).optional(),
});

export const WebhookCreateSchema = z.object({
    name: z.string().min(1).max(80),
    avatar: z.string().optional()
});

export const VCEffectSchema = z.object({
    animation_id: z.number().max(20),
    animation_type: z.number().min(0).max(1),
    emoji_id: z.string().nullable(),
    emoji_name: z.string() // no zod emoji check because custom emojis use strings
});