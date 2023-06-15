/* eslint-disable no-case-declarations */
import { Router } from "express";
import { GenerateSnowflake, GetUserByRequest, VerifyAuth } from "../Modules/SnowflakeUtils";
import { Channel, ChannelType } from "../Entities/Channel";
import { Message, MessageType } from "../Entities/Message";
import { FindConnection, HasIntent, SendOp } from "../Modules/GatewayUtils";
import { GatewayIntents } from "../Classes/GatewayIntents";
import { OpCodes } from "../Classes/OpCodes";
import { Relation, RelationType } from "../Entities/FriendUser";
import { Guild, Invite } from "../Entities/Guild";
import { GenerateRandomString, HasPermission, MembershipFromGuild, SendMessage, SendToDMOrServer } from "../Modules/DiscordUtils";
import { Permissions } from "../Classes/Flags";

const App = Router();

App.get("/:ChannelID/messages", VerifyAuth, async (req, res) => {
    const MyUser = await GetUserByRequest(req, { Memberships: { ToGuild: true } });
    const RequestedChannel = await Channel.findOne({ where: { ID: req.params.ChannelID }, relations: { OwnerGuild: true, DMRecipients: true, Messages: { ReplyingTo: { Channel: { Messages: false }, Author: true }, Channel: { Messages: false } } } });

    if (!RequestedChannel) return res.status(400).json({ code: 10013, message: "Unknown Channel" });
    if (RequestedChannel.IsDM() && !RequestedChannel.CheckDMAccess(MyUser)) return res.status(400).json({ code: 0, message: "No access" });

	if (!RequestedChannel.IsDM()) {
		const Server = RequestedChannel.OwnerGuild;
		const Mmbr = MembershipFromGuild(MyUser, Server);

		if (!HasPermission(Mmbr, Permissions.READ_MESSAGE_HISTORY))
			return res.json([]);
	}

    res.json(RequestedChannel.Messages.map(M => M.Package()).reverse());
});

App.delete("/:ChannelID", VerifyAuth, async (req, res) => {
    const MyUser = await GetUserByRequest(req, { Memberships: { ToGuild: true } });
    const RequestedChannel = await Channel.findOne({ where: { ID: req.params.ChannelID }, relations: { OwnerGuild: true, DMRecipients: true, Messages: { ReplyingTo: { Channel: { Messages: false }, Author: true }, Channel: { Messages: false } } } });

	if (!RequestedChannel) return res.status(400).json({ code: 10013, message: "Unknown Channel" });
    if (RequestedChannel.IsDM() && !RequestedChannel.CheckDMAccess(MyUser)) return res.status(400).json({ code: 0, message: "No access" });
	if (!RequestedChannel.IsDM() && !HasPermission(MembershipFromGuild(MyUser, RequestedChannel.OwnerGuild), Permissions.MANAGE_CHANNELS)) return res.status(400).json({ code: 0, message: "No access" });

	await Channel.delete({ ID: RequestedChannel.ID });

	res.send();
});

App.patch("/:ChannelID", VerifyAuth, async (req, res) => {
    const MyUser = await GetUserByRequest(req, { Memberships: { ToGuild: true } });
    const RequestedChannel = await Channel.findOne({ where: { ID: req.params.ChannelID }, relations: { OwnerGuild: true, DMRecipients: true, Messages: { Channel: { Messages: false } } } });

    if (!RequestedChannel) return res.status(400).json({ code: 10013, message: "Unknown Channel" });
    if (RequestedChannel.IsDM() && !RequestedChannel.CheckDMAccess(MyUser)) return res.status(403).json({ code: 0, message: "Missing Access" });
	if (!RequestedChannel.IsDM() && !HasPermission(MembershipFromGuild(MyUser, RequestedChannel.OwnerGuild), Permissions.MANAGE_CHANNELS)) return res.status(403).json({ code: 0, message: "Missing Access" });

	for await (const Key of Object.keys(req.body)) {
		const Value = req.body[Key];
        switch (Key) {
            case "name":
				if (typeof Value !== "string") break;
                if (Value.length > 64) break;

                RequestedChannel.DisplayName = Value;
				if (RequestedChannel.IsDM())
                {
					const ChannelNameChangedMessage = await Message.create({
						ID: GenerateSnowflake(),
						Author: MyUser,
						Type: MessageType.CHANNEL_NAME_CHANGE,
						Content: RequestedChannel.DisplayName,
						CreationDate: new Date(),
						Channel: RequestedChannel
					}).save();
	
					await SendMessage(ChannelNameChangedMessage);
				}

                break;
        }
	}

    SendToDMOrServer(RequestedChannel, OpCodes.DISPATCH, RequestedChannel.IsDM() ? RequestedChannel.GatewayDMPackage(MyUser) : RequestedChannel.GuildPackage(), 23423, "CHANNEL_UPDATE");
    await RequestedChannel.save();

    res.json(RequestedChannel.SmallDMPackage(MyUser));
});

App.post("/:ChannelID/typing", VerifyAuth, async (req, res) => {
    const MyUser = await GetUserByRequest(req, { RelationsFrom: true, RelationsRegarding: true });
    const RequestedChannel = await Channel.findOne({ where: { ID: req.params.ChannelID }, relations: { DMRecipients: true } });

    if (!RequestedChannel) return res.status(400).json({ code: 10013, message: "Unknown Channel" });
    if (RequestedChannel.IsDM() && !RequestedChannel.CheckDMAccess(MyUser)) return res.status(400).json({ code: 0, message: "No access" });
    // TODO: add permission check here too
    
    RequestedChannel.AllRecipientsExceptYou(MyUser).forEach(Recipient => {
        const Conn = FindConnection(Recipient.ID);
        //console.log(Conn);
        if (!Conn) return;
        if (!HasIntent(Conn.Intents, RequestedChannel.IsDM() ? GatewayIntents.DIRECT_MESSAGE_TYPING : GatewayIntents.GUILD_MESSAGE_TYPING)) return;

        if (RequestedChannel.IsDM()) SendOp(Conn, OpCodes.DISPATCH, { channel_id: RequestedChannel.ID, timestamp: Date.now(), user_id: MyUser.ID }, null, "TYPING_START");
        // TODO: when guilds are added, add typing start for guilds
    });

    res.sendStatus(204);
});

App.get("/:ChannelID/call", VerifyAuth, async (req, res) => {
    const MyUser = await GetUserByRequest(req, { RelationsFrom: true, RelationsRegarding: true });
    const RequestedChannel = await Channel.findOne({ where: { ID: req.params.ChannelID }, relations: { DMRecipients: true } });

    if (!RequestedChannel) return res.status(400).json({ code: 10013, message: "Unknown Channel" });
    if (!RequestedChannel.IsDM()) return res.status(400).json({ code: 0, message: "No access" });
    if (!RequestedChannel.CheckDMAccess(MyUser)) return res.status(400).json({ code: 0, message: "No access" });
    
    res.json({"ringable": true});
});

App.post("/:ChannelID/call/ring", VerifyAuth, async (req, res) => {
    const MyUser = await GetUserByRequest(req, { RelationsFrom: true, RelationsRegarding: true });
    const RequestedChannel = await Channel.findOne({ where: { ID: req.params.ChannelID }, relations: { DMRecipients: true } });

    if (!RequestedChannel) return res.status(400).json({ code: 10013, message: "Unknown Channel" });
    if (!RequestedChannel.IsDM()) return res.status(400).json({ code: 0, message: "No access" });
    if (!RequestedChannel.CheckDMAccess(MyUser)) return res.status(400).json({ code: 0, message: "No access" });
    // TODO: call event gateway

    res.sendStatus(204);
});

App.post("/:ChannelID/invites", VerifyAuth, async (req, res) => {
    const MyUser = await GetUserByRequest(req, { Memberships: { Owner: false, ToGuild: { Channels: { OwnerGuild: true } } } });
    const RequestedChannel = await Channel.findOne({ where: { ID: req.params.ChannelID }, relations: { OwnerGuild: { Members: true } } });

    if (!RequestedChannel)
		return res.status(400).json({ code: 10013, message: "Unknown Channel" });
		
    if (!HasPermission(MyUser.Memberships.find(x => x.ToGuild.ID === RequestedChannel.OwnerGuild.ID), Permissions.CREATE_INSTANT_INVITE))
		return res.status(403).json({ code: 10013, message: "Missing Access" });

    const NewInvite = await Invite.create({
        InviteOwner: MyUser,
        InviteCode: GenerateRandomString(),
        MaxUses: req.body["max_uses"] || 0,
        InGuild: RequestedChannel.OwnerGuild,
        Created: new Date()
    }).save();

    await RequestedChannel.OwnerGuild.reload();

    res.json(NewInvite.Package());
});


App.post("/:ChannelID/messages", VerifyAuth, async (req, res) => {
    const MyUser = await GetUserByRequest(req, { RelationsFrom: true, RelationsRegarding: true });
    const RequestedChannel = await Channel.findOne({ where: { ID: req.params.ChannelID }, relations: { DMRecipients: true, OwnerGuild: true } });

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

        if (!MessageReference) return res.status(400).json({ code: 10013, message: "Unknown Message" });
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
    App
};