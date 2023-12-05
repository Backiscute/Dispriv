import axios from "axios";
import { Embed, EmbedType } from "../Entities/Message";
import { CheerioAPI, load } from "cheerio";
import probe from "probe-image-size";
import { Err } from "./Logger";

export default async function (url: string): Promise<Embed | undefined> {
    if (/((media\d+\.)?giphy\.com|((c|media)\.)?tenor\.com)/.test(url)) return await HandleGif(url);
    else if (/(www\.)?((vx)?twitter\.com|(fixv)?x\.com)\/(\w+)\/status\/(\d+)/.test(url)) {
        const Matches = (url.match(/((vx)?twitter\.com|(fixv)?x\.com)\/(\w+)\/status\/(\d+)/) ?? []);
        const TweetID = Matches[2];
        if (!TweetID) return;
        const Response = await Request(`https://api.vxtwitter.com/Twitter/status/${TweetID}`);
        if (!Response) return;
        const Tweet = Response.data, Videos = Tweet.media_extended.filter((m: { type: string }) => m.type === "video"), Images = Tweet.media_extended.filter((m: { type: string }) => m.type === "image");
        
        const BaseEmbed = {
            url: Tweet.tweetURL,
            description: Tweet.text,
            author: {
                url: `https://twitter.com/${Tweet.user_name}`,
                name: `${Tweet.user_screen_name} (@${Tweet.user_name})`,
                proxy_icon_url: Tweet.user_profile_image_url,
                icon_url: Tweet.user_profile_image_url,
            },
            timestamp: new Date(Tweet.date_epoch * 1000),
            fields: [
                {
                    inline: true,
                    name: "Likes",
                    value: Tweet.likes.toString(),
                },
                {
                    inline: true,
                    name: "Retweet",
                    value: Tweet.retweets.toString(),
                },
                {
                    inline: true,
                    name: "Replies",
                    value: Tweet.replies.toString(),
                }
            ],
            color: 1942002,
            footer: {
                text: "Twitter",
                proxy_icon_url: "https://abs.twimg.com/icons/apple-touch-icon-192x192.png",
                icon_url: "https://abs.twimg.com/icons/apple-touch-icon-192x192.png",
            },
        };

        if (
            (Videos.length !== 0 && Images.length !== 0) ||
            (Videos.length === 0 && Images.length !== 0)
        ) {
            const images = [...Videos.map((v: { thumbnail_url: string }) => v.thumbnail_url), ...Images.map((i: { url: string }) => i.url)];
            const imageURL = `https://vxtwitter.com/rendercombined.jpg?imgs=${images.join(",")}`;
            const imageMetadata = await probe(imageURL);

            return {
                ...BaseEmbed,
                type: EmbedType.rich,
                image: {
                    height: imageMetadata.height,
                    width: imageMetadata.width,
                    url: imageURL,
                    proxy_url: imageURL
                }
            };
        } else if (Videos.length !== 0 && Images === 0) {
            const video = Videos[0];
            const thumbnailMetadata = await probe(video.thumbnail_url);

            return {
                ...BaseEmbed,
                type: EmbedType.video,
                thumbnail: {
                    height: thumbnailMetadata.height,
                    width: thumbnailMetadata.width,
                    url: video.thumbnail_url,
                    proxy_url: video.thumbnail_url
                },
                video: {
                    height: video.size.height,
                    width: video.size.width,
                    url: video.url,
                    proxy_url: video.url
                }
            };
        } else return { ...BaseEmbed, type: EmbedType.rich };
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
                proxy_url: Metadata.image,
            },
            provider: {
                url: "https://www.youtube.com",
                name: "YouTube",
            },
            description: Metadata.description,
            color: 16711680,
            author: {
                name: Metadata.author,
                url: Metadata.youtube_author_url,
            },
        };
    } else {
        const Response = await Request(url);
        if (!Response) return;

        if (Response.headers["content-type"].includes("image")) return await HandleImage(url);
        else {
            const Metadata = GetMetadata(Response.data);
            const Image = Metadata.image ?? Metadata.image_fallback;

            if (!Image && !Metadata.title && !Metadata.description) return;

            if (Image && (!Metadata.height || !Metadata.width)) {
                try {
                    const ImageMetadata = await probe(Image);
                    Metadata.width = ImageMetadata.width;
                    Metadata.height = ImageMetadata.height;
                } catch (e) {
                    if (!Metadata.title && !Metadata.description) return;
                }
            }

            return {
                url,
                type: EmbedType.link,
                title: Metadata.title,
                color: Metadata.color,
                thumbnail: Image ? {
                    width: Metadata.width,
                    height: Metadata.height,
                    url: Image,
                    proxy_url: Image,
                } : undefined,
                description: Metadata.description,
            };
        }
    }
}

async function Request(url: string, Head = false, BearerToken?: string) {
    try {
        const headers: { [key: string]: string | undefined } = {
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0",
            Authorization: BearerToken ? `Bearer ${BearerToken}` : undefined,
        };

        if (process.env.ProxyAuthorization) headers[process.env.ProxyAuthorization.split(":")[0]] = process.env.ProxyAuthorization.split(":")[1];

        return await axios[Head ? "head" : "get"](process.env.ProxyURL ? `${process.env.ProxyURL}${process.env.ProxyURL.endsWith("/") ? "" : "/"}${encodeURIComponent(url)}` : url, {
            headers,
            maxContentLength: 1024 * 1024 * 5,
        });
    } catch (err) {
        Err(`An error occured while requesting embed info. Error: ${JSON.stringify((err as { response: { data: unknown } }).response.data)}`);
        return undefined;
    }
}

async function HandleGif(url: string): Promise<Embed | undefined> {
    const GifID = url.match(/((media4\.)?giphy\.com\/gifs\/|((c|media)\.)?tenor\.com\/view\/)([^/?&]+)/)?.at(-1)?.split("-").at(-1), Provider = /(media4\.)?giphy\.com/.test(url) ? "giphy" : "tenor";
    if (!GifID) return;

    let Gif: {
        Thumbnail: {
            url: string;
            width: number;
            height: number;
        },
        Author?: {
            url: string;
            name: string;
            iconUrl: string;
        },
        url: string;
        Video: {
            url: string;
            width: number;
            height: number;
        }
    } | undefined;

    if (Provider === "giphy") {
        const Response = await Request(`https://api.giphy.com/v1/gifs/${GifID}?api_key=${process.env.GiphyAPIKey}`);
        if (!Response) return;
        const GifData = Response.data.data;
        Gif = {
            Thumbnail: {
                url: GifData.images.preview_gif.url,
                width: GifData.images.preview_gif.width,
                height: GifData.images.preview_gif.height,
            },
            Author: {
                name: GifData.user.display_name,
                url: GifData.user.profile_url,
                iconUrl: GifData.user.avatar_url
            },
            url: GifData.url,
            Video: {
                url: GifData.images.original.mp4,
                width: parseInt(GifData.images.original.width),
                height: parseInt(GifData.images.original.height),
            }
        };
    } else {
        const Response = await Request(`https://tenor.googleapis.com/v2/posts?ids=${GifID}&key=${process.env.TenorAPIKey}`);
        if (!Response || !Array.isArray(Response.data.results)) return;
        const GifData = Response.data.results[0];

        Gif = {
            Thumbnail: {
                url: GifData.media_formats.gifpreview.url,
                width: GifData.media_formats.gifpreview.dims[0],
                height: GifData.media_formats.gifpreview.dims[1]
            },
            url: GifData.itemurl,
            Video: {
                url: GifData.media_formats.mp4.url,
                width: GifData.media_formats.mp4.dims[0],
                height: GifData.media_formats.mp4.dims[1],
            }
        };
    }

    return {
        type: EmbedType.gifv,
        provider: Provider === "giphy" ? {
            name: "Giphy",
            url: "https://giphy.com"
        } : {
            name: "Tenor",
            url: "https://tenor.co"
        },
        author: Gif.Author ? {
            name: Gif.Author.name,
            url: Gif.Author.url,
            icon_url: Gif.Author.iconUrl,
            proxy_icon_url: Gif.Author.iconUrl
        } : undefined,
        thumbnail: {
            url: Gif.Thumbnail.url,
            proxy_url: Gif.Thumbnail.url,
            width: Gif.Thumbnail.width,
            height: Gif.Thumbnail.height
        },
        url: Gif.url,
        video: {
            url: Gif.Video.url,
            proxy_url: Gif.Video.url,
            width: Gif.Video.width,
            height: Gif.Video.height
        }
    };
}

async function HandleImage(url: string): Promise<Embed | undefined> {
    const Response = await Request(url, true);
    if (!Response) return;

    if (Response.headers["content-type"].includes("image")) {
        try {
            const ImageMetadata = await probe(url);

            return {
                url,
                type: EmbedType.image,
                thumbnail: {
                    width: ImageMetadata.width,
                    height: ImageMetadata.height,
                    url,
                    proxy_url: url,
                },
            };
        } catch (err) {
            Err(`An error occured while probing image. Error: ${JSON.stringify((err as { response: { data: unknown } }).response.data)}`);
            return undefined;
        }
    } else {
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
            },
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
        author: GetMeta($, "article:author")
            ? GetMeta($, "article:author")
            : $("span[itemprop=author] > link[itemprop=name]").attr("content"),
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
}

function ResolveColor(color: string | number[] | number) {
    if (typeof color === "string") {
        if (color === "Random") return Math.floor(Math.random() * (0xffffff + 1));
        if (color === "Default") return 0;
        if (/^#?[\da-f]{6}$/i.test(color)) return parseInt(color.replace("#", ""), 16);
    } else if (Array.isArray(color)) color = (color[0] << 16) + (color[1] << 8) + color[2];

    if ((color as number) < 0 || (color as number) > 0xffffff) return;
    if (typeof color !== "number" || Number.isNaN(color)) return;

    return color;
}