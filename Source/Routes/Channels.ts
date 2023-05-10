/* eslint-disable no-case-declarations */
import { Router } from "express";
import { GenerateSnowflake, GetUserByRequest, VerifyAuth } from "../Modules/SnowflakeUtils";
import { Channel, ChannelType } from "../Entities/Channel";
import { Message, MessageType } from "../Entities/Message";
import { FindConnection, HasIntent, SendOp } from "../Modules/GatewayUtils";
import { GatewayIntents } from "../Classes/GatewayIntents";
import { OpCodes } from "../Classes/OpCodes";
import { Relation, RelationType } from "../Entities/FriendUser";

const App = Router();

App.get("/:ChannelID/messages", VerifyAuth, async (req, res) => {
    const MyUser = await GetUserByRequest(req);
    const RequestedChannel = await Channel.findOne({ where: { ID: req.params.ChannelID }, relations: { DMRecipients: true, Messages: { ReplyingTo: { Channel: { Messages: false }, Author: true }, Channel: { Messages: false } } } });

    if (!RequestedChannel) return res.status(400).json({ code: 10013, message: "Unknown Channel" });
    if (RequestedChannel.IsDM() && !RequestedChannel.CheckDMAccess(MyUser)) return res.status(400).json({ code: 0, message: "No access" });

    res.json(RequestedChannel.Messages.map(M => M.Package()).reverse());
});

App.delete("/:ChannelID", VerifyAuth, (req, res) => {
    // TODO: leaving groups
    res.send();
});

App.patch("/:ChannelID", VerifyAuth, async (req, res) => {
    const MyUser = await GetUserByRequest(req);
    const RequestedChannel = await Channel.findOne({ where: { ID: req.params.ChannelID }, relations: { DMRecipients: true, Messages: { Channel: { Messages: false } } } });

    if (!RequestedChannel) return res.status(400).json({ code: 10013, message: "Unknown Channel" });
    if (RequestedChannel.IsDM() && !RequestedChannel.CheckDMAccess(MyUser)) return res.status(400).json({ code: 0, message: "No access" });

    (Object.keys(req.body).forEach(async Key => {
        switch (Key) {
            case "name":
                if (req.body[Key].length > 64) break;

                RequestedChannel.DisplayName = req.body[Key];
                const ChannelNameChangedMessage = await Message.create({
                    ID: GenerateSnowflake(),
                    Author: MyUser,
                    Type: MessageType.CHANNEL_NAME_CHANGE,
                    Content: RequestedChannel.DisplayName,
                    CreationDate: new Date(),
                    Channel: RequestedChannel
                }).save();

                const PMessage = ChannelNameChangedMessage.Package();
                RequestedChannel.DMRecipients.forEach(Recipient => {
                    const Conn = FindConnection(Recipient.ID);
                    //console.log(Conn);
                    if (!Conn) return;
                    if (!HasIntent(Conn.Intents, RequestedChannel.IsDM() ? GatewayIntents.DIRECT_MESSAGES : GatewayIntents.GUILD_MESSAGES)) return;

                    SendOp(Conn, OpCodes.DISPATCH, PMessage, 14, "MESSAGE_CREATE");
                });
                break;
        }
    }));

    RequestedChannel.DMRecipients.forEach(Recipient => {
        const RCMessage = RequestedChannel.SmallDMPackage(Recipient);
        const Conn = FindConnection(Recipient.ID);
        //console.log(Conn);
        if (!Conn) return;
        if (!HasIntent(Conn.Intents, RequestedChannel.IsDM() ? GatewayIntents.DIRECT_MESSAGES : GatewayIntents.GUILD_MESSAGES)) return;

        SendOp(Conn, OpCodes.DISPATCH, RCMessage, 41, "CHANNEL_UPDATE");
    });

    await RequestedChannel.save();

    res.json(RequestedChannel.SmallDMPackage(MyUser));
});

App.post("/:ChannelID/messages", VerifyAuth, async (req, res) => {
    const MyUser = await GetUserByRequest(req, { RelationsFrom: true, RelationsRegarding: true });
    const RequestedChannel = await Channel.findOne({ where: { ID: req.params.ChannelID }, relations: { DMRecipients: true } });

    if (!RequestedChannel) return res.status(400).json({ code: 10013, message: "Unknown Channel" });
    if (RequestedChannel.IsDM() && !RequestedChannel.CheckDMAccess(MyUser)) return res.status(400).json({ code: 0, message: "No access" });
    // TODO: Add permission check

    if (typeof req.body.content !== "string" || req.body.content.length > 2000) return res.status(400).json({ code: 0, message: "Message too long" });
    
    if (RequestedChannel.Type === ChannelType.DM) {
        const OtherUser = RequestedChannel.AllRecipientsExceptYou(MyUser)[0];
        const RelationshipBetweenUsers = [ ...MyUser.RelationsFrom, ...MyUser.RelationsRegarding ].find(R => R.From.ID === OtherUser.ID || R.Regarding.ID === OtherUser.ID);

        // TODO: add mutual guilds check
        if (!RelationshipBetweenUsers || RelationshipBetweenUsers?.Type !== RelationType.FRIEND) return res.status(400).json({ code: 0, message: "Cannot DM non-friends" });
    }

    let MessageReplyingTo: Message;
    if (typeof req.body.message_reference === "object"
     && typeof req.body.message_reference.channel_id === "string"
     && typeof req.body.message_reference.message_id === "string") {
        const ChannelReference = await Channel.findOne({
            where: {
                ID: req.body.message_reference.channel_id
            },
            relations: {
                Messages: {
                    Channel: {
                        Messages: false
                    }
                }
            }
        });

        if (!ChannelReference) return res.status(400).json({ code: 10013, message: "Unknown Channel" });
        const MessageReference = ChannelReference.Messages.find(M => M.ID === req.body.message_reference.message_id);

        if (!MessageReference) return res.status(400).json({ code: 10013, message: "Unknown Channel" });
        MessageReplyingTo = MessageReference;
    }

    const CreatedMessage = await Message.create({
        ID: GenerateSnowflake(),
        Author: MyUser,
        Type: MessageType.DEFAULT,
        Content: req.body.content,
        CreationDate: new Date(),
        Channel: RequestedChannel
    });

    if (MessageReplyingTo)
    {
        CreatedMessage.ReplyingTo = MessageReplyingTo;
        CreatedMessage.Type = MessageType.REPLY;
    }

    await CreatedMessage.save();

    const PMessage = CreatedMessage.Package();
    RequestedChannel.DMRecipients.forEach(Recipient => {
        const Conn = FindConnection(Recipient.ID);
        //console.log(Conn);
        if (!Conn) return;
        if (!HasIntent(Conn.Intents, RequestedChannel.IsDM() ? GatewayIntents.DIRECT_MESSAGES : GatewayIntents.GUILD_MESSAGES)) return;

        SendOp(Conn, OpCodes.DISPATCH, PMessage, 14, "MESSAGE_CREATE");
    });

    res.json({
        ...PMessage,
        nonce: req.body.nonce ?? undefined,
        components: [],
        edited_timestamp: null,
    });
});

module.exports = {
    DefaultAPI: "/api/v9/channels",
    App
};