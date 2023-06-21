/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-case-declarations */
import { Router } from "express";
import { GetUserByRequest, VerifyAuth } from "../Modules/AuthUtils";
import { GenerateSnowflake } from "../Modules/SnowflakeUtils";
import { Channel, ChannelType } from "../Entities/Channel";
import { Message, MessageType } from "../Entities/Message";
import { OpCodes } from "../Classes/GatewayOpCodes";
import { RelationType } from "../Entities/FriendUser";
import { Invite } from "../Entities/Guild";
import {
    GenerateRandomString,
    HasPermission,
    MembershipFromGuild,
    SendMessage,
    SendToDMOrServer,
    SendToMembers,
} from "../Modules/DiscordUtils";
import { Permissions } from "../Classes/Flags";
import { Presence } from "../Classes/Presence";
import { FindConnection, HasIntent, SendOp } from "../Modules/GatewayUtils";
import { GatewayIntents } from "../Classes/GatewayIntents";
import { Msg } from "../Modules/Logger";
import { JsonErrorCodes } from "../Classes/JsonOpCodes";

const App = Router();

App.patch("/*/messages/:MessageID", async (req, res) => {
    res.status(403).send();
});

App.delete("/:ChannelID/messages/:MessageID", async (req, res) => {
    const MyUser = (await GetUserByRequest(req, { Memberships: { ToGuild: true } }))!;
    console.log("user");

    const RequestedMessage = await Message.findOne({
        where: {
            ID: req.params.MessageID,
        },
        relations: {
            Author: false,
            Channel: {
                OwnerGuild: true,
            },
        },
    });

    if (!RequestedMessage)
        return res.status(400).json({ code: JsonErrorCodes.UnknownMessage, message: "Unknown Message" });

    if (
        (RequestedMessage.Channel.IsDM &&
            (MyUser.ID !== RequestedMessage.Author.ID || !RequestedMessage.Channel.CheckDMAccess(MyUser))) ||
        (!RequestedMessage.Channel.IsDM &&
            MyUser.ID !== RequestedMessage.Author.ID &&
            !HasPermission(
                MembershipFromGuild(MyUser, RequestedMessage.Channel.OwnerGuild!)!,
                Permissions.MANAGE_MESSAGES,
            ))
    )
        return res.status(403).json({ code: JsonErrorCodes.GeneralError, message: "Missing Access" });

    await SendToDMOrServer(RequestedMessage.Channel, OpCodes.DISPATCH, {
        id: RequestedMessage.ID,
        channel_id: RequestedMessage.Channel.ID,
        guild_id: RequestedMessage.Channel.IsDM ? undefined : RequestedMessage.Channel.OwnerGuild!.ID,
    });

    await Message.delete({ ID: RequestedMessage.ID });
    res.sendStatus(204);
});

App.get("/:ChannelID/messages", VerifyAuth, async (req, res) => {
    const MyUser = (await GetUserByRequest(req, { Memberships: { ToGuild: true } }))!;
    const RequestedChannel = await Channel.findOne({
        where: { ID: req.params.ChannelID },
        relations: {
            OwnerGuild: true,
            DMRecipients: true,
            Messages: { ReplyingTo: { Channel: { Messages: false }, Author: true }, Channel: { Messages: false } },
        },
    });

    if (!RequestedChannel) return res.status(400).json({ code: 10013, message: "Unknown Channel" });
    if (RequestedChannel.IsDM && !RequestedChannel.CheckDMAccess(MyUser))
        return res.status(400).json({ code: 0, message: "No access" });

    if (!RequestedChannel.IsDM) {
        const Server = RequestedChannel.OwnerGuild!;
        const Mmbr = MembershipFromGuild(MyUser, Server)!;

        if (!HasPermission(Mmbr, Permissions.READ_MESSAGE_HISTORY)) return res.json([]);
    }

    res.json(RequestedChannel.Messages.map((M) => M.Package()).reverse());
});

App.get("/:ChannelID", VerifyAuth, async (req, res) => {
    const MyUser = (await GetUserByRequest(req, { Memberships: { ToGuild: true } }))!;
    const RequestedChannel = await Channel.findOne({
        where: { ID: req.params.ChannelID },
        relations: {
            OwnerGuild: true,
            DMRecipients: true,
            Messages: { ReplyingTo: { Channel: { Messages: false }, Author: true }, Channel: { Messages: false } },
        },
    });

    if (!RequestedChannel) return res.status(400).json({ code: 10013, message: "Unknown Channel" });

    if (RequestedChannel.IsDM) {
        if (!RequestedChannel.CheckDMAccess(MyUser)) return res.status(400).json({ code: 0, message: "No access" });

        return res.json(RequestedChannel.SmallDMPackage(MyUser));
    }

    if (!HasPermission(MembershipFromGuild(MyUser, RequestedChannel.OwnerGuild!)!, Permissions.VIEW_CHANNEL))
        return res.status(400).json({ code: 0, message: "No access" });

    res.json(RequestedChannel.GuildPackage());
});

App.delete("/:ChannelID", VerifyAuth, async (req, res) => {
    const MyUser = (await GetUserByRequest(req, { Memberships: { ToGuild: true } }))!;
    const RequestedChannel = await Channel.findOne({
        where: { ID: req.params.ChannelID },
        relations: {
            OwnerGuild: true,
            DMRecipients: true,
            Messages: { ReplyingTo: { Channel: { Messages: false }, Author: true }, Channel: { Messages: false } },
        },
    });

    if (!RequestedChannel) return res.status(400).json({ code: 10013, message: "Unknown Channel" });
    if (RequestedChannel.IsDM && !RequestedChannel.CheckDMAccess(MyUser))
        return res.status(400).json({ code: 0, message: "No access" });
    if (
        !RequestedChannel.IsDM &&
        !HasPermission(MembershipFromGuild(MyUser, RequestedChannel.OwnerGuild!)!, Permissions.MANAGE_CHANNELS)
    )
        return res.status(400).json({ code: 0, message: "No access" });

    res.send();
    if (!RequestedChannel.IsDM)
        await SendToMembers(
            RequestedChannel.OwnerGuild!.ID,
            OpCodes.DISPATCH,
            RequestedChannel.GuildPackage(),
            1,
            "CHANNEL_DELETE",
        );

    await Channel.delete({ ID: RequestedChannel.ID });
});

App.patch("/:ChannelID", VerifyAuth, async (req, res) => {
    const MyUser = (await GetUserByRequest(req, { Memberships: { ToGuild: true } }))!;
    const RequestedChannel = await Channel.findOne({
        where: { ID: req.params.ChannelID },
        relations: {
            OwnerCategory: true,
            OwnerGuild: true,
            DMRecipients: true,
            Messages: { Channel: { Messages: false } },
        },
    });

    if (!RequestedChannel) return res.status(400).json({ code: 10013, message: "Unknown Channel" });
    if (RequestedChannel.IsDM && !RequestedChannel.CheckDMAccess(MyUser))
        return res.status(403).json({ code: 0, message: "Missing Access" });
    if (
        !RequestedChannel.IsDM &&
        !HasPermission(MembershipFromGuild(MyUser, RequestedChannel.OwnerGuild!)!, Permissions.MANAGE_CHANNELS)
    )
        return res.status(403).json({ code: 0, message: "Missing Access" });

    for await (const Key of Object.keys(req.body)) {
        const Value = req.body[Key];
        switch (Key) {
            case "name":
                if (typeof Value !== "string") break;
                if (Value.length > 64) break;

                RequestedChannel.DisplayName = Value;
                if (RequestedChannel.IsDM) {
                    const ChannelNameChangedMessage = await Message.create({
                        ID: GenerateSnowflake(),
                        Author: MyUser,
                        Type: MessageType.CHANNEL_NAME_CHANGE,
                        Content: RequestedChannel.DisplayName,
                        CreationDate: new Date(),
                        Channel: RequestedChannel,
                    });

                    Message.insert(ChannelNameChangedMessage);

                    await SendMessage(ChannelNameChangedMessage);
                }

                break;
            case "topic":
                if (typeof Value !== "string") break;
                if (Value.length > 1024) break;

                RequestedChannel.Topic = Value;
                break;
        }
    }

    SendToDMOrServer(
        RequestedChannel,
        OpCodes.DISPATCH,
        RequestedChannel.IsDM ? RequestedChannel.GatewayDMPackage(MyUser) : RequestedChannel.GuildPackage(),
        23423,
        "CHANNEL_UPDATE",
    );
    await RequestedChannel.save();

    res.json(RequestedChannel.SmallDMPackage(MyUser));
});

App.post("/:ChannelID/typing", VerifyAuth, async (req, res) => {
    const MyUser = (await GetUserByRequest(req, { RelationsFrom: true, RelationsRegarding: true }))!;
    const ChannelID = req.url.split("/")[1];
    const RequestedChannel = await Channel.findOne({
        where: { ID: ChannelID },
        relations: { DMRecipients: true, OwnerGuild: { Members: true } },
    });

    if (!RequestedChannel) return res.status(400).json({ code: 10013, message: "Unknown Channel" });
    if (RequestedChannel.IsDM && !RequestedChannel.CheckDMAccess(MyUser))
        return res.status(400).json({ code: 0, message: "No access" });

    if (RequestedChannel.IsDM) {
        RequestedChannel.AllRecipientsExceptYou(MyUser)?.forEach((Recipient) => {
            const Conn = FindConnection(Recipient.ID);
            //console.log(Conn);
            if (!Conn) return;
            if (
                !HasIntent(
                    Conn.Intents,
                    RequestedChannel.IsDM ? GatewayIntents.DIRECT_MESSAGE_TYPING : GatewayIntents.GUILD_MESSAGE_TYPING,
                )
            )
                return;

            if (RequestedChannel.IsDM)
                SendOp(
                    Conn,
                    OpCodes.DISPATCH,
                    { channel_id: RequestedChannel.ID, timestamp: Date.now(), user_id: MyUser.ID },
                    null,
                    "TYPING_START",
                );
            // TODO: when guilds are added, add typing start for guilds
        });
        return res.sendStatus(204);
    } else {
        const Members = RequestedChannel.OwnerGuild?.Members;
        if (!Members) return res.sendStatus(204);
        const Filtered = Members.map((M) => M.Owner).filter(
            (M) => M.ID !== MyUser.ID && M.Presence !== Presence.OFFLINE,
        );
        if (!Filtered) return res.sendStatus(204);
        Filtered.forEach((M) => {
            const Conn = FindConnection(M.ID);
            if (!Conn) return;
            // TODO: permission check
            if (
                !HasIntent(
                    Conn.Intents,
                    RequestedChannel.IsDM ? GatewayIntents.DIRECT_MESSAGE_TYPING : GatewayIntents.GUILD_MESSAGE_TYPING,
                )
            )
                return;
            Msg("User typing", "Channels");
            SendOp(
                Conn,
                OpCodes.DISPATCH,
                { channel_id: RequestedChannel.ID, timestamp: Date.now(), user_id: MyUser.ID },
                null,
                "TYPING_START",
            );
        });
        res.sendStatus(204);
    }
});

App.get("/:ChannelID/call", VerifyAuth, async (req, res) => {
    const MyUser = (await GetUserByRequest(req, { RelationsFrom: true, RelationsRegarding: true }))!;
    const RequestedChannel = await Channel.findOne({
        where: { ID: req.params.ChannelID },
        relations: { DMRecipients: true },
    });

    if (!RequestedChannel) return res.status(400).json({ code: 10013, message: "Unknown Channel" });
    if (!RequestedChannel.IsDM) return res.status(400).json({ code: 0, message: "No access" });
    if (!RequestedChannel.CheckDMAccess(MyUser)) return res.status(400).json({ code: 0, message: "No access" });

    res.json({ ringable: true });
});

App.post("/:ChannelID/call/ring", VerifyAuth, async (req, res) => {
    const MyUser = (await GetUserByRequest(req, { RelationsFrom: true, RelationsRegarding: true }))!;
    const RequestedChannel = await Channel.findOne({
        where: { ID: req.params.ChannelID },
        relations: { DMRecipients: true },
    });

    if (!RequestedChannel) return res.status(400).json({ code: 10013, message: "Unknown Channel" });
    if (!RequestedChannel.IsDM) return res.status(400).json({ code: 0, message: "No access" });
    if (!RequestedChannel.CheckDMAccess(MyUser)) return res.status(400).json({ code: 0, message: "No access" });
    // TODO: call event gateway

    res.sendStatus(204);
});

App.post("/:ChannelID/invites", VerifyAuth, async (req, res) => {
    if (typeof req.body.flags !== "number") return res.sendStatus(204);

    const MyUser = (await GetUserByRequest(req, {
        Memberships: { Owner: false, ToGuild: { Channels: { OwnerGuild: true } } },
    }))!;
    const RequestedChannel = await Channel.findOne({
        where: { ID: req.params.ChannelID },
        relations: { OwnerGuild: { Members: true } },
    });

    if (!RequestedChannel) return res.status(400).json({ code: 10013, message: "Unknown Channel" });

    if (RequestedChannel.IsDM) return res.status(400).json({ code: 10013, message: "Cannot create invites to DMs." });

    const Mmbr = MyUser.Memberships.find((x) => x.ToGuild.ID === RequestedChannel.OwnerGuild!.ID);
    if (!Mmbr) return res.status(400).json({ code: 0, message: "You aren't participating in that guild." });
    if (!HasPermission(Mmbr, Permissions.CREATE_INSTANT_INVITE))
        return res.status(403).json({ code: 10013, message: "Missing Access" });

    const NewInvite = await Invite.create({
        InviteOwner: MyUser,
        InviteCode: GenerateRandomString(),
        MaxUses: req.body["max_uses"] || 0,
        InGuild: RequestedChannel.OwnerGuild,
        Created: new Date(),
        LinkedChannel: RequestedChannel,
    }).save();

    res.json(NewInvite.Package());
});

App.post("/:ChannelID/messages", VerifyAuth, async (req, res) => {
    const MyUser = (await GetUserByRequest(req, {
        Memberships: { ToGuild: true },
        RelationsFrom: true,
        RelationsRegarding: true,
    }))!;
    const RequestedChannel = await Channel.findOne({
        where: { ID: req.params.ChannelID },
        relations: { DMRecipients: true, OwnerGuild: true },
    });

    if (!RequestedChannel)
        return res.status(400).json({ code: JsonErrorCodes.UnknownChannel, message: "Unknown Channel" });
    if (RequestedChannel.IsDM && !RequestedChannel.CheckDMAccess(MyUser))
        return res.status(400).json({ code: JsonErrorCodes.GeneralError, message: "No access" });
    else if (!RequestedChannel.IsDM) {
        const Mmbr = MyUser.Memberships.find((x) => x.ToGuild.ID === RequestedChannel.OwnerGuild!.ID);
        if (!Mmbr) return res.status(400).json({ code: 0, message: "You aren't participating in that guild." });
        if (!HasPermission(Mmbr, Permissions.SEND_MESSAGES))
            return res.status(403).json({ code: JsonErrorCodes.MissingAccess, message: "Missing Access" });
    }

    if (typeof req.body.content !== "string" || req.body.content.length > 2000)
        return res.status(400).json({ code: JsonErrorCodes.GeneralError, message: "Message too long" });

    if (RequestedChannel.Type === ChannelType.DM) {
        const OtherUser = RequestedChannel.AllRecipientsExceptYou(MyUser)![0];
        const RelationshipBetweenUsers = [...MyUser.RelationsFrom, ...MyUser.RelationsRegarding].find(
            (R) => R.From.ID === OtherUser.ID || R.Regarding.ID === OtherUser.ID,
        );

        if (!RelationshipBetweenUsers || RelationshipBetweenUsers?.Type !== RelationType.FRIEND)
            return res.status(400).json({ code: JsonErrorCodes.GeneralError, message: "Cannot DM non-friends" });
    }

    let MessageReplyingTo: Message | undefined;
    if (
        typeof req.body.message_reference === "object" &&
        typeof req.body.message_reference.channel_id === "string" &&
        typeof req.body.message_reference.message_id === "string"
    ) {
        const ChannelReference = await Channel.findOne({
            where: {
                ID: req.body.message_reference.channel_id,
            },
            relations: {
                Messages: {
                    Channel: {
                        Messages: false,
                    },
                },
            },
        });

        if (!ChannelReference)
            return res.status(400).json({ code: JsonErrorCodes.UnknownChannel, message: "Unknown Channel" });
        const MessageReference = ChannelReference.Messages.find((M) => M.ID === req.body.message_reference.message_id);

        if (!MessageReference)
            return res.status(400).json({ code: JsonErrorCodes.UnknownMessage, message: "Unknown Message" });
        MessageReplyingTo = MessageReference;
    }

    const CreatedMessage = Message.create({
        ID: GenerateSnowflake(),
        Author: MyUser,
        Type: MessageType.DEFAULT,
        Content: req.body.content,
        CreationDate: new Date(),
        Channel: RequestedChannel,
    });

    if (MessageReplyingTo) {
        CreatedMessage.ReplyingTo = MessageReplyingTo;
        CreatedMessage.Type = MessageType.REPLY;
    }

    await CreatedMessage.save();
    await SendMessage(CreatedMessage);

    const PMessage = CreatedMessage.Package();
    res.json({
        ...PMessage,
        nonce: req.body.nonce ?? undefined,
        components: [],
        edited_timestamp: null,
    });
});

module.exports = {
    DefaultAPI: "/api/v9/channels",
    App,
};
