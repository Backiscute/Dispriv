/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-case-declarations */
import { Router } from "express";
import { GetUserByRequest, VerifyAuth } from "../Modules/AuthUtils";
import { GenerateSnowflake } from "../Modules/SnowflakeUtils";
import { Channel, ChannelType } from "../Entities/Channel";
import { Attachment, Embed, Message, MessageType, Reaction } from "../Entities/Message";
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
import EmbedParser from "../Modules/EmbedParser";
import { Presence } from "../Classes/Presence";
import { FindConnection, HasIntent, SendOp } from "../Modules/GatewayUtils";
import { GatewayIntents } from "../Classes/GatewayIntents";
import { Msg } from "../Modules/Logger";
import { JsonErrorCodes } from "../Classes/JsonOpCodes";
import { AttachmentMessagePost, AttachmentReq } from "../Classes/Attachments";
import { v4 } from "uuid";
import { FindAttachment, HandleAttachment } from "../Modules/AssetUtils";

const App = Router();

App.patch("/*/messages/:MessageID", async (req, res) => {
    res.status(403).send();
});

App.delete("/:ChannelID/messages/:MessageID", async (req, res) => {
    const MyUser = (await GetUserByRequest(req, { Memberships: { ToGuild: true } }))!;

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

    await Message.remove(RequestedMessage);
    res.sendStatus(204);
});

App.post("/:ChannelID/attachments", VerifyAuth, (req, res) => {
    if (!req.body.files || !Array.isArray(req.body.files))
        return res.status(400).json({ code: JsonErrorCodes.GeneralError, message: "No attachments provided" });
    if (req.body.files.length > 4)
        return res.status(400).json({ code: JsonErrorCodes.TooManyAttachments, message: "Too many attachments" });
    for (const file of req.body.files)
        if (file.file_size > 25 * 1024 * 1024) return res.status(403).json({
            code: JsonErrorCodes.FileTooLarge,
            message: "File uploads are limited at 25mb."
        });
    
    res.json({
        attachments: req.body.files.map((file: AttachmentReq) => {
            const id = v4();
            return {
                id: file.id,
                upload_filename: `${id}_${file.filename}`,
                upload_url: `https://cdn.discordapp.com/upload/${id}_${file.filename}?auth=${req.headers.authorization}`
            };
        })
    });
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

    res.json(RequestedChannel.Messages.map((M) => M.Package(MyUser)).reverse());
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

    //FIXME: foreign key constraint
    await Channel.remove(RequestedChannel);
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

    const Embeds: Embed[] = [];

    if (req.body.content) for await (const link of req.body.content.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g)) {
        if (!RequestedChannel.IsDM && !HasPermission(MyUser.Memberships.find((x) => x.ToGuild.ID === RequestedChannel.OwnerGuild!.ID)!, Permissions.EMBED_LINKS)) break;
        const Embed = await EmbedParser(link);
        if (Embed) Embeds.push(Embed);
    }

    const CreatedMessage = Message.create({
        ID: GenerateSnowflake(),
        Author: MyUser,
        Type: MessageType.DEFAULT,
        Content: req.body.content,
        CreationDate: new Date(),
        Channel: RequestedChannel,
        Embeds
    });

    const Attachments: Attachment[] = [];

    for (const Attachment of (req.body.attachments ?? []) as AttachmentMessagePost[]) {
        if (!RequestedChannel.IsDM && !HasPermission(MyUser.Memberships.find((x) => x.ToGuild.ID === RequestedChannel.OwnerGuild!.ID)!, Permissions.ATTACH_FILES))
            return res.status(403).json({
                code: JsonErrorCodes.MissingPermissions,
                message: "You must have \"ATTACH_FILES\" permission to attach files."
            });
        const File = FindAttachment(Attachment.uploaded_filename);
        if (!File) continue;
        const AttachmentID = GenerateSnowflake();
        const { ContentType, Size, ImageOrVideoSize } = await HandleAttachment(File, `${CreatedMessage.Channel.ID}-${AttachmentID}-${Attachment.filename}`);
        
        Attachments.push({
            content_type: ContentType,
            filename: Attachment.filename,
            url: `https://cdn.discordapp.com/attachments/${CreatedMessage.Channel.ID}/${AttachmentID}/${Attachment.filename}`,
            proxy_url: `https://cdn.discordapp.com/attachments/${CreatedMessage.Channel.ID}/${AttachmentID}/${Attachment.filename}`,
            id: AttachmentID,
            size: Size,
            height: ImageOrVideoSize.height,
            width: ImageOrVideoSize.width,
        });
    }

    if (!CreatedMessage.Content && Attachments.length === 0 && Embeds.length === 0) return res.status(400).json({
        code: JsonErrorCodes.CannotSendEmptyMessage,
        message: "Cannot send empty message."
    });

    CreatedMessage.Attachments = Attachments;

    if (MessageReplyingTo) {
        CreatedMessage.ReplyingTo = MessageReplyingTo;
        CreatedMessage.Type = MessageType.REPLY;
    }

    await CreatedMessage.save();
    await SendMessage(CreatedMessage);

    const PMessage = CreatedMessage.Package(MyUser);
    res.json({
        ...PMessage,
        nonce: req.body.nonce ?? undefined,
        components: [],
        edited_timestamp: null,
    });
});

App.put("/:ChannelID/messages/:MessageID/reactions/:Emoji/*", async (req, res) => {
    const [MyUser, RequestedChannel, RequestedMessage] = await Promise.all([
        GetUserByRequest(req, { RelationsFrom: true, RelationsRegarding: true, Memberships: { ToGuild: true } }),
        Channel.findOne({
            where: { ID: req.params.ChannelID },
            relations: { DMRecipients: true, OwnerGuild: { Members: true } },
        }),
        Message.findOne({
            where: { ID: req.params.MessageID },
            relations: { Author: true, Channel: { OwnerGuild: true } },
        }),
    ]);
    const Emoji = req.params.Emoji as string;
    if (!RequestedChannel || !RequestedMessage) return res.sendStatus(404);
    if (RequestedChannel.IsDM && !RequestedChannel.CheckDMAccess(MyUser!))
        return res.status(400).json({ code: 0, message: "No access" });
    const MessageReaction = RequestedMessage.Reactions?.find((R) => R.EmojiCode === Emoji);
    if (MessageReaction) {
        if (MessageReaction.UsersReacted.find((U) => U.ID === MyUser!.ID))
            return res.status(400).send({
                code: JsonErrorCodes.ReactionBlocked,
                message: "You have already reacted to this message",
            });
        MessageReaction.UsersReacted.push(MyUser!);
        await MessageReaction.save();
    } else {
        const MessageReaction = Reaction.create({
            ID: GenerateSnowflake(),
            EmojiCode: Emoji,
            Type: "normal",
            UsersReacted: [],
            ToMessage: RequestedMessage,
        });
        MessageReaction.UsersReacted.push(MyUser!);
        await MessageReaction.save();
    }
    if (RequestedChannel.IsDM) {
        RequestedChannel.DMRecipients?.forEach((Recipient) => {
            const Conn = FindConnection(Recipient.ID);
            if (Conn)
                SendOp(
                    Conn,
                    OpCodes.DISPATCH,
                    {
                        user_id: MyUser!.ID,
                        type: 0,
                        message_id: RequestedMessage.ID,
                        message_author_id: RequestedMessage.Author.ID,
                        emoji: {
                            name: Emoji,
                            id: null,
                        },
                        channel_id: RequestedChannel.ID,
                        burst: false,
                    },
                    null,
                    "MESSAGE_REACTION_ADD",
                );
        });
    } else {
        RequestedChannel.OwnerGuild?.Members.forEach((M) => {
            const Conn = FindConnection(M.Owner.ID);
            if (Conn)
                SendOp(
                    Conn,
                    OpCodes.DISPATCH,
                    {
                        user_id: MyUser!.ID,
                        type: 0,
                        message_id: RequestedMessage.ID,
                        message_author_id: RequestedMessage.Author.ID,
                        member: {
                            user: MyUser!.Package(),
                            ...MyUser!.Memberships.find(
                                (M) => M.ToGuild.ID === RequestedChannel.OwnerGuild!.ID,
                            )?.Package(),
                        },
                        emoji: {
                            name: Emoji,
                            id: null,
                        },
                        channel_id: RequestedChannel.ID,
                        burst: false,
                        guild_id: RequestedChannel.OwnerGuild!.ID,
                    },
                    null,
                    "MESSAGE_REACTION_ADD",
                );
        });
    }
    return res.sendStatus(204);
});

App.delete("/:ChannelID/messages/:MessageID/reactions/:Emoji/*", async (req, res) => {
    const [MyUser, RequestedChannel, RequestedMessage] = await Promise.all([
        GetUserByRequest(req, { RelationsFrom: true, RelationsRegarding: true }),
        Channel.findOne({
            where: { ID: req.params.ChannelID },
            relations: { DMRecipients: true, OwnerGuild: { Members: true } },
        }),
        Message.findOne({
            where: { ID: req.params.MessageID },
            relations: { Author: true, Channel: { OwnerGuild: { Members: true } } },
        }),
    ]);
    const Emoji = req.params.Emoji as string;
    if (!RequestedChannel || !RequestedMessage) return res.sendStatus(404);
    if (RequestedChannel.IsDM && !RequestedChannel.CheckDMAccess(MyUser!))
        return res.status(400).json({ code: 0, message: "No access" });
    const MessageReaction = RequestedMessage.Reactions?.find(
        (R) => R.EmojiCode === Emoji && R.UsersReacted.map((U) => U.ID).includes(MyUser!.ID),
    );
    if (!MessageReaction)
        return res.status(400).send({
            code: JsonErrorCodes.GeneralError,
            message: "You have not reacted to this message",
        });
    MessageReaction.UsersReacted = MessageReaction.UsersReacted.filter((U) => U.ID !== MyUser!.ID);
    await MessageReaction.save();
    if (RequestedChannel.IsDM) {
        RequestedChannel.DMRecipients?.forEach((Recipient) => {
            const Conn = FindConnection(Recipient.ID);
            if (Conn)
                SendOp(
                    Conn,
                    OpCodes.DISPATCH,
                    {
                        user_id: MyUser!.ID,
                        type: 0,
                        message_id: RequestedMessage.ID,
                        emoji: {
                            name: Emoji,
                            id: null,
                        },
                        channel_id: RequestedChannel.ID,
                        burst: false,
                    },
                    null,
                    "MESSAGE_REACTION_REMOVE",
                );
        });
    } else {
        RequestedChannel.OwnerGuild?.Members.forEach((M) => {
            const Conn = FindConnection(M.Owner.ID);
            if (Conn)
                SendOp(
                    Conn,
                    OpCodes.DISPATCH,
                    {
                        user_id: MyUser!.ID,
                        type: 0,
                        message_id: RequestedMessage.ID,
                        emoji: {
                            name: Emoji,
                            id: null,
                        },
                        channel_id: RequestedChannel.ID,
                        burst: false,
                        guild_id: RequestedChannel.OwnerGuild!.ID,
                    },
                    null,
                    "MESSAGE_REACTION_REMOVE",
                );
        });
    }
    return res.sendStatus(204);
});

module.exports = {
    DefaultAPI: "/api/v9/channels",
    App,
};
