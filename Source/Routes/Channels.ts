import { Router } from "express";
import { GetUserByRequest, VerifyAuth } from "../Modules/SnowflakeUtils";
import { Channel, ChannelType } from "../Entities/Channel";

const App = Router();

App.get("/:ChannelID/messages", VerifyAuth, async (req, res) => {
    const MyUser = await GetUserByRequest(req);
    console.log(MyUser);
    const RequestedChannel = await Channel.findOne({ where: { ID: req.params.ChannelID }, relations: { Messages: { Channel: false } } });
    console.log(RequestedChannel);
    if (!RequestedChannel) return res.status(400).json({ code: 10013, message: "Unknown Channel" });
    if ((RequestedChannel.Type === ChannelType.DM || RequestedChannel.Type === ChannelType.GROUP_DM) && !RequestedChannel.CheckDMAccess(MyUser)) return res.status(400).json({ code: 0, message: "No access" });

    res.json(RequestedChannel.Messages.map(M => M.Package()));
});

module.exports = {
    DefaultAPI: "/api/v9/channels",
    App
};