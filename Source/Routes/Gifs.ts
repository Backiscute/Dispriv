import { Router } from "express";
import { VerifyAuth } from "../Modules/AuthUtils";
import axios from "axios";
import { Error } from "../Modules/Logger";

const App = Router();

App.get("/search", VerifyAuth, async (req, res) => {
    if (!req.query.q)
        return res.status(400).json({
            code: 0,
            message: "Bad query."
        });

    const Response = await axios.get(`https://tenor.googleapis.com/v2/search?q=${req.query.q}&media_format=${req.query.media_format ?? ""}&limit=100&locale=${req.query.locale ?? ""}&key=${process.env.TenorAPIKey}`).then(res => res.data.results).catch((err) => {
        Error(`An error occured while requesting gifs from tenor. Error: ${JSON.stringify(err.response.data)}`);
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

module.exports = {
    DefaultAPI: "/api/v9/gifs",
    App,
};
