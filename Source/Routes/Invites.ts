/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Router } from "express";
import { GetUserByRequest, VerifyAuth } from "../Modules/AuthUtils";
import { GenerateSnowflake } from "../Modules/SnowflakeUtils";
import { Guild, Invite, InviteType, SystemChannelFlags } from "../Entities/Guild";
import { Membership } from "../Entities/User";
import { FindConnection, SendOp } from "../Modules/GatewayUtils";
import { OpCodes } from "../Classes/GatewayOpCodes";
import { HasPermission, SendMessage } from "../Modules/DiscordUtils";
import { Permissions } from "../Classes/Flags";
import { JsonErrorCodes } from "../Classes/JsonOpCodes";
import { Msg } from "../Modules/Logger";
import { Message, MessageType } from "../Entities/Message";
import { ChannelType } from "../Entities/Channel";

const App = Router();

App.get("/:InviteCode", VerifyAuth, async (req, res) => {
    const RequestedInvite = await Invite.findOne({
        where: { InviteCode: req.params.InviteCode },
        relations: { InGuild: { Members: true } },
    });
    if (!RequestedInvite) {
        const VanityGuild = await Guild.findOne({
            where: { VanityInviteURL: req.params.InviteCode },
            relations: { Members: true },
        });
        if (!VanityGuild) return res.status(404).json({ message: "Unknown Invite", code: 10006 });

        const InviteChannel = VanityGuild.Channels.find((C) => C.ID === VanityGuild.SystemChannelID) ?? VanityGuild.Channels[0];
        if (!InviteChannel) return res.status(404).json({ code: JsonErrorCodes.UNKNOWN_INVITE, message: "Unknown Invite" });

        return res.json({
            code: VanityGuild.VanityInviteURL,
            guild: VanityGuild.Partial(),
            type: InviteType.GUILD,
            expires_at: null,
            //TODO:
            aproximate_member_count: 0,
            aproximate_presence_count: 0,
            channel: {
                id: InviteChannel.ID,
                name: InviteChannel.DisplayName,
                type: InviteChannel.Type
            },
        });
    }

    res.json(RequestedInvite.PackagePublic());
});

App.delete("/:InviteCode", VerifyAuth, async (req, res) => {
    const RequestedInvite = await Invite.findOne({
        where: { InviteCode: req.params.InviteCode },
        relations: { InGuild: { Members: true, Channels: true } },
    });
    const MyUser = (await GetUserByRequest(req, { Memberships: { Owner: false, ToGuild: true } }))!;

    if (!RequestedInvite) return res.status(404).json({ message: "Unknown Invite", code: 10006 });

    const Membership = MyUser.Memberships.find((x) => x.ToGuild.ID === RequestedInvite.InGuild.ID);
    if (!Membership) return res.status(403).json({ message: "You are not a member of this guild", code: 0 });

    if (!HasPermission(Membership, Permissions.MANAGE_GUILD))
        return res.status(403).json({ message: "Missing Access", code: 0 });

    await RequestedInvite.remove();

    res.sendStatus(204);
});

App.post("/:InviteCode", VerifyAuth, async (req, res) => {
    const RequestedInvite = await Invite.findOne({
        where: { InviteCode: req.params.InviteCode },
        relations: { InGuild: { Members: true, Channels: { OwnerGuild: true } } },
    });
    const MyUser = (await GetUserByRequest(req, { Memberships: { Owner: false, ToGuild: true } }))!;

    if (!RequestedInvite) {
        const VanityGuild = await Guild.findOne({
            where: { VanityInviteURL: req.params.InviteCode },
            relations: { Members: true, Channels: { OwnerGuild: true } },
        });
        if (!VanityGuild) return res.status(404).json({ code: JsonErrorCodes.UNKNOWN_INVITE, message: "Unknown Invite" });

        if (MyUser.Memberships.find((x) => x.ToGuild.ID === VanityGuild.ID))
            return res.json({
                code: VanityGuild.VanityInviteURL,
                guild: VanityGuild.Partial(),
                type: InviteType.GUILD,
                expires_at: null,
                //TODO:
                approximate_member_count: 0,
                approximate_presence_count: 0,
                channel: null,
            });

        const InviteChannel = VanityGuild.Channels.find((C) => C.ID === VanityGuild.SystemChannelID) ?? VanityGuild.Channels[0];
        if (!InviteChannel) return res.status(404).json({ code: JsonErrorCodes.UNKNOWN_INVITE, message: "Unknown Invite" });

        const NewMembership = await Membership.create({
            ID: GenerateSnowflake(),
            Owner: MyUser,
            ToGuild: VanityGuild,
            CreatedAt: new Date(),
            Roles: [VanityGuild.DefaultRole],
        })
    
        await NewMembership.save();

        res.json({
            code: VanityGuild.VanityInviteURL,
            guild: VanityGuild.Partial(),
            type: InviteType.GUILD,
            expires_at: null,
            //TODO:
            approximate_member_count: 0,
            approximate_presence_count: 0,
            channel: {
                id: InviteChannel.ID,
                name: InviteChannel.DisplayName,
                type: InviteChannel.Type,
                guild_id: VanityGuild.ID
            },
            new_member:	true
        });

        const Conn = FindConnection(MyUser.ID);
        if (!Conn) return;

        SendOp(Conn, OpCodes.DISPATCH, { ...VanityGuild.GatewayPackage(MyUser), ...VanityGuild.GatewaySupplementalPackage(), members: VanityGuild.Members.map((C) => C.Package()).concat(NewMembership.Package()) }, 24, "GUILD_CREATE");

        const SystemChannelID = VanityGuild.SystemChannelID;

        if (!SystemChannelID) return;
    
        const SystemChannel = VanityGuild.Channels.find((x) => x.ID === SystemChannelID);
    
        if (!SystemChannel) return;
    
        if (SystemChannel.Type !== ChannelType.GUILD_TEXT) return;
        if (VanityGuild.SystemChannelHasFlag(SystemChannelFlags.SUPPRESS_JOIN_NOTIFICATIONS)) return;
    
        const SystemMessage = Message.create({
            ID: GenerateSnowflake(),
            Channel: SystemChannel,
            Content: "",
            Type: MessageType.USER_JOIN,
            CreationDate: new Date(),
            Author: MyUser,
        })
    
        SendMessage(SystemMessage);
    
        await SystemMessage.save();

        return;
    }

    const TargetGuild = RequestedInvite.InGuild;
    if (MyUser.Memberships.find((x) => x.ToGuild.ID === TargetGuild.ID)) return res.json(RequestedInvite.Package());

    const NewMembership = await Membership.create({
        ID: GenerateSnowflake(),
        Owner: MyUser,
        ToGuild: TargetGuild,
        CreatedAt: new Date(),
        Roles: [TargetGuild.DefaultRole],
    })

    await NewMembership.save();

    res.json(RequestedInvite.PackagePublic(true));

    RequestedInvite.CurrentUses++;
    RequestedInvite.save();

    const Conn = FindConnection(MyUser.ID);
    if (!Conn) return;

    SendOp(Conn, OpCodes.DISPATCH, { ...TargetGuild.GatewayPackage(MyUser), ...TargetGuild.GatewaySupplementalPackage(), members: TargetGuild.Members.map((C) => C.Package()).concat(NewMembership.Package()) }, 24, "GUILD_CREATE");

    const SystemChannelID = TargetGuild.SystemChannelID;

    if (!SystemChannelID) return;

    const SystemChannel = TargetGuild.Channels.find((x) => x.ID === SystemChannelID);

    if (!SystemChannel) return;

    if (SystemChannel.Type !== ChannelType.GUILD_TEXT) return;
    if (TargetGuild.SystemChannelHasFlag(SystemChannelFlags.SUPPRESS_JOIN_NOTIFICATIONS)) return;

    const SystemMessage = Message.create({
        ID: GenerateSnowflake(),
        Channel: SystemChannel,
        Type: MessageType.USER_JOIN,
        Content: "",
        CreationDate: new Date(),
        Author: MyUser,
    })

    SendMessage(SystemMessage);

    await SystemMessage.save();
});

module.exports = {
    DefaultAPI: "/api/v9/invites",
    App,
};
