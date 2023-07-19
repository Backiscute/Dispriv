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
    SendToVC,
} from "../Modules/DiscordUtils";
import { Permissions, UserFlags } from "../Classes/Flags";
import EmbedParser from "../Modules/EmbedParser";
import { Presence } from "../Classes/Presence";
import { FindConnection, HasIntent, SendOp } from "../Modules/GatewayUtils";
import { GatewayIntents } from "../Classes/GatewayIntents";
import { Err, Msg } from "../Modules/Logger";
import { JsonErrorCodes } from "../Classes/JsonOpCodes";
import { AttachmentMessagePost, AttachmentReq } from "../Classes/Attachments";
import { v4 } from "uuid";
import { FindAttachment, HandleAttachment } from "../Modules/AssetUtils";
import { User } from "../Entities/User";
import { VoiceSessions } from "../Handlers/RTCSocket";
import { FindOptionsWhere, LessThan, MoreThan } from "typeorm";
import { ValidateRequest } from "../Modules/ValidationUtils";
import { MessageSendSchema, VCEffectSchema } from "../Validators/Channels";

const App = Router();

App.patch("/:ChannelID/messages/:MessageID", VerifyAuth, async (req, res) => {
    const MyUser = (await GetUserByRequest(req, { Memberships: { ToGuild: true } }))!;

    const RequestedMessage = await Message.findOne({
        where: {
            ID: req.params.MessageID,
        },
        relations: {
            Author: true,
            Channel: {
                OwnerGuild: true,
            },
        },
    });

    if (!RequestedMessage)
        return res.status(400).json({ code: JsonErrorCodes.UNKNOWN_MESSAGE, message: "Unknown Message" });
    if (RequestedMessage.Channel.ID !== req.params.ChannelID)
        return res.status(400).json({ code: JsonErrorCodes.UNKNOWN_MESSAGE, message: "Unknown Message" });
    if (RequestedMessage.Author.ID !== MyUser.ID)
        return res.status(403).json({ code: JsonErrorCodes.MISSING_ACCESS, message: "Missing Access" });
    if (RequestedMessage.Type !== MessageType.DEFAULT && RequestedMessage.Type !== MessageType.REPLY)
        return res.status(400).json({ code: JsonErrorCodes.INVALID_MESSAGE_TYPE, message: "Invalid Message Type" });
    if (typeof req.body.content !== "string" || req.body.content.length > 2000)
        return res.status(400).json({ code: JsonErrorCodes.GENERAL_ERROR, message: "Message too long" });

    const RequestedChannel = RequestedMessage.Channel;

    const Embeds: Embed[] = [];

    try {
        if (req.body.content)
            for await (const link of req.body.content.match(
                /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g,
            ) ?? []) {
                if (
                    !RequestedChannel.IsDM &&
                    !HasPermission(
                        MyUser.Memberships.find((x) => x.ToGuild.ID === RequestedChannel.OwnerGuild!.ID)!,
                        Permissions.EMBED_LINKS,
                    )
                )
                    break;
                const Embed = await EmbedParser(link);
                if (Embed) Embeds.push(Embed);
            }
    } catch (e) {
        Err("Error while parsing embeds");
    }

    RequestedMessage.Embeds = Embeds;
    RequestedMessage.Content = req.body.content;
    RequestedMessage.EditedTimestamp = new Date();

    await RequestedMessage.save();
    await SendToDMOrServer(
        RequestedMessage.Channel,
        OpCodes.DISPATCH,
        RequestedMessage.Package(new User()),
        null,
        "MESSAGE_UPDATE",
    ); // update the message

    res.json(RequestedMessage.Package(MyUser));
});

App.delete("/:ChannelID/messages/:MessageID", VerifyAuth, async (req, res) => {
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
        return res.status(400).json({ code: JsonErrorCodes.UNKNOWN_MESSAGE, message: "Unknown Message" });

    if (RequestedMessage.Channel.ID !== req.params.ChannelID)
        return res.status(400).json({ code: JsonErrorCodes.UNKNOWN_MESSAGE, message: "Unknown Message" });

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
        return res.status(403).json({ code: JsonErrorCodes.MISSING_ACCESS, message: "Missing Access" });

    await SendToDMOrServer(RequestedMessage.Channel, OpCodes.DISPATCH, {
        id: RequestedMessage.ID,
        channel_id: RequestedMessage.Channel.ID,
        guild_id: RequestedMessage.Channel.IsDM ? undefined : RequestedMessage.Channel.OwnerGuild!.ID,
    });

    if (RequestedMessage.Channel.FirstMessageID === RequestedMessage.ID) {
        RequestedMessage.Channel.FirstMessageID = undefined;
        await RequestedMessage.Channel.save();
    }
    await Message.remove(RequestedMessage);
    res.sendStatus(204);
});

App.post("/:ChannelID/attachments", VerifyAuth, (req, res) => {
    if (!req.body.files || !Array.isArray(req.body.files))
        return res.status(400).json({ code: JsonErrorCodes.GENERAL_ERROR, message: "No attachments provided" });
    if (req.body.files.length > 4)
        return res
            .status(400)
            .json({ code: JsonErrorCodes.MAXIMUM_ATTACHMENTS_IN_MESSAGE_REACHED, message: "Too many attachments" });
    for (const file of req.body.files)
        if (file.file_size > 25 * 1024 * 1024)
            return res.status(403).json({
                code: JsonErrorCodes.REQUEST_ENTITY_TOO_LARGE,
                message: "File uploads are limited at 25mb.",
            });

    res.json({
        attachments: req.body.files.map((file: AttachmentReq) => {
            const id = v4();
            return {
                id: file.id,
                upload_filename: `${id}_${file.filename}`,
                upload_url: `https://cdn.discordapp.com/upload/${id}_${file.filename}?auth=${req.headers.authorization}`,
            };
        }),
    });
});

App.get("/:ChannelID/messages", VerifyAuth, async (req, res) => {
    const MyUser = (await GetUserByRequest(req, { Memberships: { ToGuild: true } }))!,
        Before = /^\d+$/.test(req.query.before as string) ? (req.query.before as string) : undefined,
        After = /^\d+$/.test(req.query.after as string) ? (req.query.after as string) : undefined;
    let Limit = /^\d+$/.test(req.query.limit as string) ? parseInt(req.query.limit as string) : 50;
    if (Limit > 250) Limit = 250;
    if ((After && After > GenerateSnowflake()) || (Before && Before < req.params.ChannelID))
        return res.status(422).json({
            code: JsonErrorCodes.GENERAL_ERROR,
            message: "After is more than latest snowflake or Before less than channel snowflake.",
        });

    const RequestedChannel = await Channel.findOne({
        where: { ID: req.params.ChannelID },
        relations: {
            OwnerGuild: true,
            DMRecipients: true,
        },
        select: {
            ID: true,
            DMRecipients: true,
            Type: true,
            Owner: {
                ID: true,
            },
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

    const Where: FindOptionsWhere<Message> = {
        Channel: {
            ID: RequestedChannel.ID,
        },
    };
    if (Before) Where.ID = LessThan(Before);
    if (After) Where.ID = MoreThan(After);

    const Messages = await Message.find({
        order: { ID: "DESC" },
        where: Where,
        take: Limit,
        relations: { ReplyingTo: { Channel: { Messages: false }, Author: true }, Channel: { Messages: false } },
    });
    let PackagedMessages = Messages.map((M) => M.Package(MyUser));
    if (Before && After) PackagedMessages = PackagedMessages.filter((M) => M.id < Before);

    res.json(PackagedMessages);
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

    const Mmbr = MembershipFromGuild(MyUser, RequestedChannel.OwnerGuild!)!;
    if (!Mmbr)
        return res.status(403).json({
            code: JsonErrorCodes.UNKNOWN_MEMBER,
            message: "You are not participating in this guild.",
        });

    if (!HasPermission(Mmbr, Permissions.VIEW_CHANNEL)) return res.status(400).json({ code: 0, message: "No access" });

    res.json(RequestedChannel.GuildPackage(undefined, MyUser.ID));
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
        return res.status(403).json({ code: JsonErrorCodes.MISSING_ACCESS, message: "Missing Access" });
    if (
        !RequestedChannel.IsDM &&
        !HasPermission(MembershipFromGuild(MyUser, RequestedChannel.OwnerGuild!)!, Permissions.MANAGE_CHANNELS)
    )
        return res.status(403).json({ code: JsonErrorCodes.MISSING_ACCESS, message: "Missing Access" });

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
            case "nsfw":
                if (typeof Value !== "boolean") break;
                RequestedChannel.IsNSFW = Value;
                break;
        }
    }

    SendToDMOrServer(
        RequestedChannel,
        OpCodes.DISPATCH,
        RequestedChannel.IsDM ? RequestedChannel.GatewayDMPackage(MyUser) : RequestedChannel.GuildPackage(),
        null,
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
        return res.status(403).json({ code: JsonErrorCodes.MISSING_ACCESS, message: "Missing Access" });

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

App.post(
    "/:ChannelID/messages",
    VerifyAuth,
    async (req, res, next) => {
        ValidateRequest(req, res, next, MessageSendSchema);
    },
    async (req, res) => {
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
            return res.status(400).json({ code: JsonErrorCodes.UNKNOWN_CHANNEL, message: "Unknown Channel" });
        if (RequestedChannel.IsDM && !RequestedChannel.CheckDMAccess(MyUser))
            return res.status(400).json({ code: JsonErrorCodes.GENERAL_ERROR, message: "No access" });
        else if (!RequestedChannel.IsDM) {
            const Mmbr = MyUser.Memberships.find((x) => x.ToGuild.ID === RequestedChannel.OwnerGuild!.ID);
            if (!Mmbr) return res.status(400).json({ code: 0, message: "You aren't participating in that guild." });
            if (!HasPermission(Mmbr, Permissions.SEND_MESSAGES))
                return res.status(403).json({ code: JsonErrorCodes.MISSING_ACCESS, message: "Missing Access" });
        }

        if (RequestedChannel.Type === ChannelType.DM) {
            const OtherUser = RequestedChannel.AllRecipientsExceptYou(MyUser)![0];
            const RelationshipBetweenUsers = [...MyUser.RelationsFrom, ...MyUser.RelationsRegarding].find(
                (R) => R.From.ID === OtherUser.ID || R.Regarding.ID === OtherUser.ID,
            );

            if (!RelationshipBetweenUsers || RelationshipBetweenUsers?.Type !== RelationType.FRIEND)
                return res.status(400).json({ code: JsonErrorCodes.GENERAL_ERROR, message: "Cannot DM non-friends" });

            if (OtherUser.HasFlag(UserFlags.SYSTEM))
                // its impossible to dm a system account in normal discord
                return res
                    .status(400)
                    .json({ code: JsonErrorCodes.GENERAL_ERROR, message: "Cannot DM a system account" });
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
                return res.status(400).json({ code: JsonErrorCodes.UNKNOWN_CHANNEL, message: "Unknown Channel" });
            const MessageReference = ChannelReference.Messages.find(
                (M) => M.ID === req.body.message_reference.message_id,
            );

            if (!MessageReference)
                return res.status(400).json({ code: JsonErrorCodes.UNKNOWN_CHANNEL, message: "Unknown Message" });
            MessageReplyingTo = MessageReference;
        }

        const Embeds: Embed[] = [];

        try {
            if (req.body.content)
                for await (const link of req.body.content.match(
                    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g,
                ) ?? []) {
                    if (
                        !RequestedChannel.IsDM &&
                        !HasPermission(
                            MyUser.Memberships.find((x) => x.ToGuild.ID === RequestedChannel.OwnerGuild!.ID)!,
                            Permissions.EMBED_LINKS,
                        )
                    )
                        break;
                    const Embed = await EmbedParser(link);
                    if (Embed) Embeds.push(Embed);
                }
        } catch (e) {
            Err("Error while parsing embeds");
        }
        const Type = MessageType[req.body.content.replace("!", "") as keyof typeof MessageType] || MessageType.DEFAULT;
        if (req.body.content === "!ALL") {
            // for (const Type of Object.values(MessageType)) {
            //     const CreatedMessage = Message.create({
            //         ID: GenerateSnowflake(),
            //         Author: MyUser,
            //         Type: Type as any,
            //         Content: Type.toString(),
            //         CreationDate: new Date(),
            //         Channel: RequestedChannel,
            //     });
            //     await CreatedMessage.save();
            //     if (!RequestedChannel.FirstMessageID) {
            //         RequestedChannel.FirstMessageID = CreatedMessage.ID;
            //         await RequestedChannel.save();
            //     }
            //     await SendMessage(CreatedMessage);
            // }
            const MessageTypes = Object.entries(MessageType);
            const CreatedMessage = Message.create({
                ID: GenerateSnowflake(),
                Author: MyUser,
                Type: MessageType.DEFAULT,
                Content: "",
                CreationDate: new Date(),
                Channel: RequestedChannel,
            });
            const PMessage = CreatedMessage.Package(MyUser);
            res.json({
                ...PMessage,
                nonce: req.body.nonce ?? undefined,
                components: [],
                edited_timestamp: null,
            });
            for await (const [K, V] of MessageTypes) {
                if (typeof V !== "number") continue;
                const [Name, Value]: [string, number] = [K, V];
                const CreatedMessage = Message.create({
                    ID: GenerateSnowflake(),
                    Author: MyUser,
                    Type: Value,
                    Content: Name,
                    CreationDate: new Date(),
                    Channel: RequestedChannel,
                });
                await CreatedMessage.save();
                if (!RequestedChannel.FirstMessageID) {
                    RequestedChannel.FirstMessageID = CreatedMessage.ID;
                    await RequestedChannel.save();
                }
                await SendMessage(CreatedMessage);
            }
            // for (let i = 0; i < 100; i++) {
            //     const CreatedMessage = Message.create({
            //         ID: GenerateSnowflake(),
            //         Author: MyUser,
            //         Type: i,
            //         Content: "content",
            //         CreationDate: new Date(),
            //         Channel: RequestedChannel,
            //     });
            //     await CreatedMessage.save();
            //     if (!RequestedChannel.FirstMessageID) {
            //         RequestedChannel.FirstMessageID = CreatedMessage.ID;
            //         await RequestedChannel.save();
            //     }
            //     await SendMessage(CreatedMessage);
            // }
            return;
        }
        const CreatedMessage = Message.create({
            ID: GenerateSnowflake(),
            Author: MyUser,
            Content: Type === MessageType.DEFAULT ? req.body.content : "​",
            CreationDate: new Date(),
            Channel: RequestedChannel,
            Embeds,
            Type,
        });

        const Attachments: Attachment[] = [];

        try {
            for (const Attachment of (req.body.attachments ?? []) as AttachmentMessagePost[]) {
                if (
                    !RequestedChannel.IsDM &&
                    !HasPermission(
                        MyUser.Memberships.find((x) => x.ToGuild.ID === RequestedChannel.OwnerGuild!.ID)!,
                        Permissions.ATTACH_FILES,
                    )
                )
                    return res.status(403).json({
                        code: JsonErrorCodes.MISSING_ACCESS,
                        message: "You must have \"ATTACH_FILES\" permission to attach files.",
                    });
                const File = FindAttachment(Attachment.uploaded_filename);
                if (!File) continue;
                const AttachmentID = GenerateSnowflake();
                const { ContentType, Size, ImageOrVideoSize } = await HandleAttachment(
                    File,
                    `${CreatedMessage.Channel.ID}-${AttachmentID}-${Attachment.filename}`,
                );

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
        } catch (e) {
            return res.status(400).json({
                code: JsonErrorCodes.GENERAL_ERROR,
                message: "An error occurred while processing your attachments.",
            });
        }

        if (!CreatedMessage.Content && Attachments.length === 0 && Embeds.length === 0)
            return res.status(400).json({
                code: JsonErrorCodes.CANNOT_SEND_EMPTY_MESSAGE,
                message: "Cannot send empty message.",
            });

        CreatedMessage.Attachments = Attachments;

        if (MessageReplyingTo) {
            CreatedMessage.ReplyingTo = MessageReplyingTo;
            CreatedMessage.Type = MessageType.REPLY;
        }

        await CreatedMessage.save();
        if (!RequestedChannel.FirstMessageID) {
            RequestedChannel.FirstMessageID = CreatedMessage.ID;
            await RequestedChannel.save();
        }
        await SendMessage(CreatedMessage);

        const PMessage = CreatedMessage.Package(MyUser);
        res.json({
            ...PMessage,
            nonce: req.body.nonce ?? undefined,
            components: [],
            edited_timestamp: null,
        });
    },
);

App.put("/:ChannelID/messages/:MessageID/reactions/:Emoji/*", VerifyAuth, async (req, res) => {
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
    const Type = req.query.type as string;

    if (Type !== "0" && Type !== "1") return res.status(400).json({ code: 0, message: "Invalid reaction type" });
    if (!RequestedChannel || !RequestedMessage) return res.sendStatus(404);
    if (RequestedChannel.IsDM && !RequestedChannel.CheckDMAccess(MyUser!))
        return res.status(400).json({ code: JsonErrorCodes.MISSING_ACCESS, message: "Missing Access" });

    if (Type === "1") {
        // superreaction
        if (MyUser!.AvailableSuperreactions <= 0)
            return res.status(400).json({ code: JsonErrorCodes.REACTION_BLOCKED, message: "No burst credits" });
        MyUser!.AvailableSuperreactions -= 1;
        await MyUser!.save();
    }

    const MessageReaction = RequestedMessage.Reactions?.find(
        (R) => R.EmojiCode === Emoji && R.Type === (Type === "0" ? "normal" : "super"),
    );
    if (MessageReaction) {
        if (MessageReaction.UsersReacted.find((U) => U.ID === MyUser!.ID)) return res.sendStatus(204);

        MessageReaction.UsersReacted.push(MyUser!);
        await MessageReaction.save();
    } else {
        const MessageReaction = Reaction.create({
            ID: GenerateSnowflake(),
            EmojiCode: Emoji,
            Type: Type === "0" ? "normal" : "super",
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
                        type: MessageReaction?.Type === "normal" ? 0 : 1,
                        message_id: RequestedMessage.ID,
                        message_author_id: RequestedMessage.Author.ID,
                        emoji: {
                            name: Emoji,
                            id: null,
                        },
                        channel_id: RequestedChannel.ID,
                        burst: MessageReaction?.Type === "super",
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
                        type: MessageReaction?.Type === "normal" ? 0 : 1,
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
                        burst: MessageReaction?.Type === "super",
                        guild_id: RequestedChannel.OwnerGuild!.ID,
                    },
                    null,
                    "MESSAGE_REACTION_ADD",
                );
        });
    }
    return res.sendStatus(204);
});

App.delete("/:ChannelID/messages/:MessageID/reactions/:Emoji/*", VerifyAuth, async (req, res) => {
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
            code: JsonErrorCodes.GENERAL_ERROR,
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

App.get("/:ChannelID/pins", VerifyAuth, async (req, res) => {
    const RequestedChannel = await Channel.findOne({
        where: { ID: req.params.ChannelID },
        relations: { OwnerGuild: true, Messages: { Channel: true } },
    });

    if (!RequestedChannel)
        return res.status(404).json({ code: JsonErrorCodes.UNKNOWN_CHANNEL, message: "Unknown Channel" });

    const MyUser = await GetUserByRequest(req);

    if (RequestedChannel.IsDM && !RequestedChannel.CheckDMAccess(MyUser!))
        return res.status(400).json({ code: JsonErrorCodes.MISSING_ACCESS, message: "Missing Access" });
    // TODO: add permission check for guilds

    const PinnedMessages = RequestedChannel.Messages.filter((M) => M.Pinned);

    res.json(PinnedMessages.map((M) => M.Package(MyUser!)));
});

App.put("/:ChannelID/pins/:MessageID", VerifyAuth, async (req, res) => {
    const MessageToPin = await Message.findOne({
        where: { ID: req.params.MessageID },
        relations: { Channel: { OwnerGuild: true, Messages: true } },
    });

    if (!MessageToPin)
        return res.status(404).json({ code: JsonErrorCodes.UNKNOWN_MESSAGE, message: "Unknown Message" });

    if (MessageToPin.Channel.ID !== req.params.ChannelID)
        return res.status(400).json({ code: JsonErrorCodes.UNKNOWN_CHANNEL, message: "Unknown Channel" });

    const MyUser = await GetUserByRequest(req, { Memberships: { Owner: false, ToGuild: true } });

    if (MessageToPin.Channel.IsDM && !MessageToPin.Channel.CheckDMAccess(MyUser!))
        return res.status(400).json({ code: JsonErrorCodes.MISSING_ACCESS, message: "Missing Access" });
    if (
        !MessageToPin.Channel.IsDM &&
        !HasPermission(MembershipFromGuild(MyUser!, MessageToPin.Channel.OwnerGuild!)!, Permissions.MANAGE_MESSAGES)
    )
        return res.status(400).json({ code: JsonErrorCodes.MISSING_ACCESS, message: "Missing Access" });

    if (MessageToPin.Type != MessageType.DEFAULT && MessageToPin.Type != MessageType.REPLY)
        return res.json({ code: JsonErrorCodes.UNKNOWN_MESSAGE, message: "Cannot Execute On Message Type" });
    if (MessageToPin.Pinned) return res.sendStatus(204);

    // TODO: sort by pinning date (latest on top, oldest on bottom)
    const PinnedMessages = MessageToPin.Channel.Messages.filter((M) => M.Pinned);

    if (PinnedMessages.length >= 50)
        return res
            .status(400)
            .json({ code: JsonErrorCodes.MAXIMUM_PINS_REACHED_FOR_CHANNEL, message: "Too Many Pins In Channel" });

    MessageToPin.Pinned = true;

    await MessageToPin.save();

    const PinnedMessage = Message.create({
        ID: GenerateSnowflake(),
        Channel: MessageToPin.Channel,
        Type: MessageType.CHANNEL_PINNED_MESSAGE,
        Author: MyUser!,
        ReplyingTo: MessageToPin,
        Content: "",
        CreationDate: new Date(),
    });

    await PinnedMessage.save();

    await SendMessage(PinnedMessage);
    await SendToDMOrServer(
        MessageToPin.Channel,
        OpCodes.DISPATCH,
        MessageToPin.Package(new User()),
        null,
        "MESSAGE_UPDATE",
    ); // update the original message
    await SendToDMOrServer(
        MessageToPin.Channel,
        OpCodes.DISPATCH,
        { channel_id: MessageToPin.Channel.ID, last_pin_timestamp: new Date().toISOString() },
        null,
        "CHANNEL_PINS_UPDATE",
    ); // reload pins

    res.sendStatus(204);
});

App.delete("/:ChannelID/pins/:MessageID", VerifyAuth, async (req, res) => {
    const MessageToPin = await Message.findOne({
        where: { ID: req.params.MessageID },
        relations: { Channel: { OwnerGuild: true } },
    });

    if (!MessageToPin)
        return res.status(404).json({ code: JsonErrorCodes.UNKNOWN_MESSAGE, message: "Unknown Message" });

    if (MessageToPin.Channel.ID !== req.params.ChannelID)
        return res.status(400).json({ code: JsonErrorCodes.UNKNOWN_CHANNEL, message: "Unknown Channel" });

    const MyUser = await GetUserByRequest(req);

    if (MessageToPin.Channel.IsDM && !MessageToPin.Channel.CheckDMAccess(MyUser!))
        return res.status(400).json({ code: JsonErrorCodes.MISSING_ACCESS, message: "Missing Access" });
    // TODO: add permission check for guilds

    if (!MessageToPin.Pinned) return res.sendStatus(204);

    MessageToPin.Pinned = false;

    await MessageToPin.save();

    await SendToDMOrServer(
        MessageToPin.Channel,
        OpCodes.DISPATCH,
        MessageToPin.Package(new User()),
        null,
        "MESSAGE_UPDATE",
    ); // update the original message

    res.sendStatus(204);
});

App.post(
    "/:ChannelID/voice-channel-effects",
    VerifyAuth,
    async (req, res, next) => {
        ValidateRequest(req, res, next, VCEffectSchema);
    },
    async (req, res) => {
        const RequestedChannel = await Channel.findOne({
            where: { ID: req.params.ChannelID },
            relations: { OwnerGuild: true },
        });

        if (!RequestedChannel)
            return res.status(404).json({ code: JsonErrorCodes.UNKNOWN_CHANNEL, message: "Unknown Channel" });

        if (RequestedChannel.Type != ChannelType.GUILD_VOICE)
            return res.status(400).json({
                code: JsonErrorCodes.CANNOT_EXECUTE_ACTION_ON_THIS_CHANNEL_TYPE,
                message: "Cannot Execute On Channel Type",
            });

        const VoiceSession = VoiceSessions.find((S) => S.channel_id == RequestedChannel.ID);

        if (VoiceSession === undefined)
            return res.status(403).json({
                code: JsonErrorCodes.TARGET_USER_NOT_CONNECTED_TO_VOICE,
                message: "User must be in voice channel to send voice channel effect",
            });

        const MyUser = await GetUserByRequest(req);
        const VoiceState = VoiceSession.voice_states.find((S) => S.user_id == MyUser!.ID);

        if (VoiceState === undefined)
            return res.status(403).json({
                code: JsonErrorCodes.TARGET_USER_NOT_CONNECTED_TO_VOICE,
                message: "User must be in voice channel to send voice channel effect",
            });

        const AnimationID = req.body.animation_id ?? 0;
        const AnimationType = req.body.animation_type ?? 1;
        const EmojiID = req.body.emoji_id;
        const EmojiName = req.body.emoji_name;

        // TODO: Add nitro check for animationtype 0

        const EmojiRegex = /\p{Emoji}/u;

        if (!EmojiID && (!EmojiRegex.test(EmojiName) || EmojiName.length > 2))
            return res.status(400).json({ code: JsonErrorCodes.UNKNOWN_EMOJI, message: "Unknown Emoji" });

        await SendToVC(
            RequestedChannel,
            OpCodes.DISPATCH,
            {
                guild_id: RequestedChannel.OwnerGuild!.ID,
                channel_id: RequestedChannel.ID,
                user_id: MyUser!.ID,
                animation_id: AnimationID,
                animation_type: AnimationType,
                emoji: { animated: false, id: EmojiID, name: EmojiName },
            },
            null,
            "VOICE_CHANNEL_EFFECT_SEND",
        );
        res.sendStatus(204);
    },
);

module.exports = {
    DefaultAPI: "/api/v9/channels",
    App,
};
