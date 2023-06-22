import axios from "axios";
import { Embed, EmbedType } from "../Entities/Message";
import { CheerioAPI, load } from "cheerio";
import probe from "probe-image-size";
import { Error } from "./Logger";

export default async function(url: string): Promise<Embed | undefined> {
    if (/((media4\.)?giphy\.com|((c|media)\.)?tenor\.com)/.test(url)) return await HandleImage(url);
    else if (/(www\.)?twitter\.com\/(\w+)\/status\/(\d+)/.test(url)) {
        /*const Matches = (url.match(/twitter\.com\/(\w+)\/status\/(\d+)/) ?? []);
        const TweetID = Matches[2];
        if (!TweetID) return;
        const Response = await Request(`https://api.twitter.com/2/tweets/${TweetID}?expansions=author_id,attachments.media_keys&media.fields=url,width,height&tweet.fields=created_at,public_metrics&user.fields=profile_image_url`, false, process.env.TwitterToken);
        if (!Response) return;
        const Tweet = Response.data, Author = Tweet.includes.users[0], Media = Tweet.includes.media?.filter((x: { type: string }) => x.type == "photo");

        return {
            type: EmbedType.rich,
            url,
            description: Tweet.data.text,
            author: {
                url: `https://twitter.com/${Author.username}`,
                name: `${Author.name} (@${Author.username})`,
                proxy_icon_url: Author.profile_image_url,
                icon_url: Author.profile_image_url,
            },
            timestamp: new Date(Tweet.data.created_at),
            fields: [
                {
                    inline: true,
                    name: "Likes",
                    value: Tweet.data.public_metrics.metrics.like_count.toString(),
                },
                {
                    inline: true,
                    name: "Retweet",
                    value: Tweet.data.public_metrics.metrics.retweet_count.toString(),
                },
            ],
            color: 1942002,
            footer: {
                text: "Twitter",
                proxy_icon_url: "https://abs.twimg.com/icons/apple-touch-icon-192x192.png",
                icon_url: "https://abs.twimg.com/icons/apple-touch-icon-192x192.png",
            },
            image: Media ? {
                width: Media[0].width,
                height: Media[0].height,
                url: Media[0].url,
                proxy_url: Media[0].url,
            } : undefined
        };*/
        return {
            type: EmbedType.rich,
            url,
            title: "Twitter embeds are not supported.",
            description: "You can still visit the tweet manually.",
            color: 1942002,
            footer: {
                text: "Twitter",
                proxy_icon_url: "https://abs.twimg.com/icons/apple-touch-icon-192x192.png",
                icon_url: "https://abs.twimg.com/icons/apple-touch-icon-192x192.png",
            }
        };
    } else if (/(www\.)?(youtube\.com|youtu\.be)/.test(url)) {
        const Response = await Request(url);
        if (!Response) return;
        const Metadata = GetMetadata(Response.data);

        return {
            video: {
                width: Metadata.width,
                height: Metadata.height,
                url: Metadata.youtube_embed,
            },
            url,
            type: EmbedType.video,
            title: Metadata.title,
            thumbnail: {
                width: Metadata.width,
                height: Metadata.height,
                url: Metadata.image,
                proxy_url: Metadata.image
            },
            provider: {
                url: "https://www.youtube.com",
                name: "YouTube",
            },
            description: Metadata.description,
            color: 16711680,
            author: {
                name: Metadata.author,
                url: Metadata.youtube_author_url
            },
        };
    }
    else {
        const Response = await Request(url);
        if (!Response) return;

        if (Response.headers["content-type"].includes("image")) return await HandleImage(url);
        else {
            const Metadata = GetMetadata(Response.data);
            const Image = Metadata.image ?? Metadata.image_fallback;
    
            if (!Image && !Metadata.title && !Metadata.description) return;
    
            if (Image && (!Metadata.height || !Metadata.width)) {
                const ImageMetadata = await probe(Image);
                Metadata.width = ImageMetadata.width;
                Metadata.height = ImageMetadata.height;
            }
    
            return {
                url,
                type: EmbedType.link,
                title: Metadata.title,
                color: Metadata.color,
                thumbnail: {
                    width: Metadata.width,
                    height: Metadata.height,
                    url: Image,
                    proxy_url: Image,
                },
                description: Metadata.description,
            };
        }
    }
}

async function Request(url: string, Head = false, BearerToken?: string) {
    try {
        return await axios[Head ? "head" : "get"](url, {
            headers: {
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0",
                Authorization: BearerToken ? `Bearer ${BearerToken}` : undefined
            },
            maxContentLength: 1024 * 1024 * 5
        });
    } catch (err) {
        Error(`An error occured while requesting embed info. Error: ${JSON.stringify((err as { response: { data: unknown } }).response.data)}`);
        return undefined;
    }
}

async function HandleImage(url: string): Promise<Embed | undefined> {
    const Response = await Request(url, true);
    if (!Response) return;
    
    if (Response.headers["content-type"].includes("image")) {
        const ImageMetadata = await probe(url);

        return {
            url,
            type: EmbedType.image,
            thumbnail: {
                width: ImageMetadata.width,
                height: ImageMetadata.height,
                url,
                proxy_url: url,
            }
        };
    }
    else {
        const Response = await Request(url);
        if (!Response) return;
        const Metadata = GetMetadata(Response.data);
        const Image = Metadata.image ?? Metadata.image_fallback;

        if (!Image || !Metadata.height || !Metadata.width) return;
    
        return {
            url,
            type: EmbedType.image,
            thumbnail: {
                width: Metadata.width,
                height: Metadata.height,
                url,
                proxy_url: Image,
            }
        };
    }
}


function GetMeta($: CheerioAPI, name: string) {
    let elem = $(`meta[property="${name}"]`);
    if (!elem.length) elem = $(`meta[name="${name}"]`);
    return elem.attr("content") || elem.text();
}

function GetMetadata(text: string) {
    const $ = load(text);

    return {
        title: GetMeta($, "og:title") || $("title").first().text(),
        color: ResolveColor(GetMeta($, "theme-color")),
        provider_name: GetMeta($, "og:site_name"),
        author: GetMeta($, "article:author") ? GetMeta($, "article:author") : $("span[itemprop=author] > link[itemprop=name]").attr("content"),
        description: GetMeta($, "og:description") || GetMeta($, "description"),
        image: GetMeta($, "og:image") || GetMeta($, "twitter:image"),
        image_fallback: $("image").attr("src"),
        video_fallback: $("video").attr("src"),
        width: parseInt(GetMeta($, "og:image:width") || "0"),
        height: parseInt(GetMeta($, "og:image:height") || "0"),
        url: GetMeta($, "og:url"),
        youtube_embed: GetMeta($, "og:video:secure_url"),
        youtube_author_url: $("span[itemprop=author] > link[itemprop=url]").attr("href"),
    };
};

function ResolveColor(color: string | number[] | number) {
    if (typeof color === "string") {
        if (color === "Random") return Math.floor(Math.random() * (0xffffff + 1));
        if (color === "Default") return 0;
        if (/^#?[\da-f]{6}$/i.test(color)) return parseInt(color.replace("#", ""), 16);
    } else if (Array.isArray(color)) color = (color[0] << 16) + (color[1] << 8) + color[2];

    if (color as number < 0 || color  as number > 0xffffff) return;
    if (typeof color !== "number" || Number.isNaN(color)) return;

    return color;
}