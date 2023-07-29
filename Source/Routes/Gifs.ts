import { Router } from "express";
import { VerifyAuth } from "../Modules/AuthUtils";
import axios from "axios";
import { Err } from "../Modules/Logger";

const App = Router();

App.get("/search", VerifyAuth(false), async (req, res) => {
    if (!req.query.q)
        return res.status(400).json({
            code: 0,
            message: "Bad query."
        });

    const Response = await axios.get(`https://tenor.googleapis.com/v2/search?q=${req.query.q}&media_format=${req.query.media_format ?? ""}&limit=100&locale=${req.query.locale ?? ""}&key=${process.env.TenorAPIKey}`).then(res => res.data.results).catch((err) => {
        Err(`An error occured while requesting gifs from tenor. Error: ${JSON.stringify(err.response.data)}`);
        return [];
    });

    res.status(200).json(Response.map((Gif: {
        id: string;
        title: string;
        itemurl: string;
        media_formats: {
            mp4: {
                url: string;
                preview: string;
                dims: number[]
            };
            gif: {
                url: string;
            }
        }
    }) => ({
        id: Gif.id,
        title: Gif.title,
        url: Gif.itemurl,
        src: Gif.media_formats.mp4.url,
        gif_src: Gif.media_formats.gif.url,
        width: Gif.media_formats.mp4.dims[0],
        height: Gif.media_formats.mp4.dims[1],
        preview: Gif.media_formats.mp4.preview,
    })));
});

App.get("/trending", VerifyAuth(false), async (req, res) => {
    const MediaFormat = req.query.media_format?.toString() ?? "mp4";
    const Locale = req.query.locale?.toString() ?? "en-US";

    const Response = await axios.get(`https://tenor.googleapis.com/v2/categories?locale=${Locale}&key=${process.env.TenorAPIKey}`).then(res => res.data.tags).catch((err) => {
        Err(`An error occured while requesting trending categories from tenor. Error: ${JSON.stringify(err.response.data)}`);
        return [];
    });

    res.status(200).json({ categories: Response.map((Category: {
        searchterm: string;
        path: string;
        image: string;
        name: string;
    }) => ({
        name: Category.searchterm,
        src: Category.image.replace(".gif", `.${MediaFormat}`).replace("AAAAM", "AAAPo"), // discord cries if we dont change the path
    })), gifs: [] });
});

module.exports = {
    DefaultAPI: "/api/v9/gifs",
    App,
};
