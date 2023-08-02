import { z } from "zod";

const DiscordEmbedFooter = z.object({
    text: z.string().max(2048),
    icon_url: z.string().url().optional(),
    proxy_icon_url: z.string().url().optional(),
});

const DiscordEmbedImage = z.object({
    url: z.string().url(),
    proxy_url: z.string().url(),
    height: z.number().int(),
    width: z.number().int(),
});

const DiscordEmbedThumbnail = DiscordEmbedImage;

const DiscordEmbedVideo = z.object({
    url: z.string().url(),
    height: z.number().int(),
    width: z.number().int(),
});

const DiscordEmbedProvider = z.object({
    name: z.string().max(256).optional(),
    url: z.string().url().optional(),
});

const DiscordEmbedAuthor = z.object({
    name: z.string().max(256).optional(),
    url: z.string().url().optional(),
    icon_url: z.string().url().optional(),
    proxy_icon_url: z.string().url().optional(),
});

const DiscordEmbedField = z.object({
    name: z.string().max(256),
    value: z.string().max(1024),
    inline: z.boolean().optional(),
});

const DiscordEmbed = z.object({
    title: z.string().max(256).optional(),
    type: z.string().max(32).optional(),
    description: z.string().max(2048).optional(),
    url: z.string().url().optional(),
    timestamp: z.string().regex(/^([+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([.,]\d+(?!:))?)?(\17[0-5]\d([.,]\d+)?)?([zZ]|([+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/).optional(),
    color: z.number().int().min(0).max(16777215).optional(),
    footer: DiscordEmbedFooter.optional(),
    image: DiscordEmbedImage.optional(),
    thumbnail: DiscordEmbedThumbnail.optional(),
    video: DiscordEmbedVideo.optional(),
    provider: DiscordEmbedProvider.optional(),
    author: DiscordEmbedAuthor.optional(),
    fields: z.array(DiscordEmbedField).max(25).optional(),
});

export default DiscordEmbed;
