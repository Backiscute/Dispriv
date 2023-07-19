/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Router } from "express";
import { GetUserByRequest, VerifyAuth } from "../Modules/AuthUtils";
import { GenerateSnowflake } from "../Modules/SnowflakeUtils";
import { Guild, GuildFeatures, Role } from "../Entities/Guild";
import { Membership, User } from "../Entities/User";
import { OpCodes } from "../Classes/GatewayOpCodes";
import { Permissions, UserFlags } from "../Classes/Flags";
import { Channel, ChannelType } from "../Entities/Channel";
import {
    GetHighestRole,
    GetHighestRoleInArr,
    HasPermission,
    SendGuildMemberUpdate,
    SendToMembers,
    SendToUser,
} from "../Modules/DiscordUtils";
import { Remove, Upload, ValidBaseURL } from "../Modules/AssetUtils";
import { JsonErrorCodes } from "../Classes/JsonOpCodes";

const App = Router();

App.get("/*/regions", (req, res) => {
    res.json([{ id: "dispriv", name: "Dispriv Voice", custom: false, deprecated: false, optimal: true }]);
});

App.post("/:GuildID/delete", VerifyAuth, async (req, res) => {
    const MyUser = (await GetUserByRequest(req, { OwnedGuilds: true }))!;
    if (!MyUser.OwnedGuilds.map((G) => G.ID).includes(req.params.GuildID))
        return res.status(403).json({ code: 0, message: "Missing Access" });

    const G = MyUser.OwnedGuilds.find((G) => G.ID === req.params.GuildID);

    if (!G) return res.status(404).json({ code: 0, message: "Couldn't find that guild." });

    if (G.IconID) Remove(G.IconID);

    await SendToMembers(G.ID, OpCodes.DISPATCH, { id: G.ID }, 69, "GUILD_DELETE");

    console.log(JSON.stringify(G, null, 4));
    await Guild.remove(G);

    res.status(204).send();
});

App.post("/:GuildID/roles", VerifyAuth, async (req, res) => {
    const MyUser = (await GetUserByRequest(req, { Memberships: { ToGuild: true } }))!;
    if (!MyUser.Memberships.map((G) => G.ToGuild.ID).includes(req.params.GuildID))
        return res.status(400).json({ code: 0, message: "You aren't participating in that guild." });

    const Mmbr = MyUser.Memberships.find((G) => G.ToGuild.ID === req.params.GuildID);
    if (!Mmbr) return res.status(400).json({ code: 0, message: "You aren't participating in that guild." });
    const G = Mmbr.ToGuild;

    if (!HasPermission(Mmbr, Permissions.MANAGE_ROLES))
        return res.status(403).json({ code: 10013, message: "Missing Access" });

    const CreatedRole = await Role.create({
        ID: GenerateSnowflake(),
        Name: req.body.name ?? "new role",
        Color: req.body.color ?? 0,
        InGuild: G,
        Position: 1,
    }).save();

    SendToMembers(
        G.ID,
        OpCodes.DISPATCH,
        {
            guild_id: G.ID,
            role: CreatedRole.Package(),
        },
        6942,
        "GUILD_ROLE_CREATE",
    );
    res.json(CreatedRole.Package());
});

App.patch(["/:GuildID/members/:MemberID", "/:GuildID/profile/:MemberID"], VerifyAuth, async (req, res) => {
    //if (req.params.MemberID === "@me") return res.sendStatus(403);
    const IsMe = req.params.MemberID === "@me";

    const MyUser = (await GetUserByRequest(req))!;

    const Mmbr = await Membership.findOne({
        where: {
            ToGuild: {
                ID: req.params.GuildID
            },
            Owner: {
                ID: MyUser.ID
            }
        }
    });
    if (!Mmbr) return res.status(400).json({ code: JsonErrorCodes.UNKNOWN_MEMBER, message: "You aren't participating in that guild." });
    const GuildMember = IsMe ? Mmbr : await Membership.findOne({
        where: {
            ToGuild: {
                ID: req.params.GuildID
            },
            Owner: {
                ID: req.params.MemberID
            }
        },
        relations: {
            ToGuild: {
                Owner: true
            }
        }
    });

    if (!GuildMember) return res.status(404).json({ code: JsonErrorCodes.UNKNOWN_MEMBER, message: "That user isn't a member of this guild." });

    const G = GuildMember.ToGuild;

    for (const PropKey of Object.keys(req.body)) {
        const Value = req.body[PropKey];
        switch (PropKey) {
            case "avatar":
                if (GuildMember.AvatarID && GuildMember.AvatarID !== Value) {
                    Remove(GuildMember.AvatarID);
                    GuildMember.AvatarID = undefined;
                }

                if (!ValidBaseURL(Value)) continue;

                GuildMember.AvatarID = await Upload(Value, "Guilds/Users");
                continue;
            case "banner":
                if (GuildMember.BannerID && GuildMember.BannerID !== Value) {
                    Remove(GuildMember.BannerID);
                    GuildMember.BannerID = undefined;
                }

                if (!ValidBaseURL(Value)) continue;

                GuildMember.BannerID = await Upload(Value, "Guilds/Users");
                break;
            case "bio":
                if (!/^[a-z 0-9!?,.*-_#!;()[\]|`]{0,250}$/gi.test(Value))
                    return res.status(403).json({ code: 0, message: "Bio failed validation" });

                GuildMember.Bio = Value ? Value : undefined;
                continue;
            case "nick":
                if (!HasPermission(Mmbr, IsMe ? Permissions.CHANGE_NICKNAME : Permissions.MANAGE_NICKNAMES))
                    return res.status(403).json({ code: 40003, message: "Missing Access" });

                if (!/^[a-z 0-9'"-_]{1,32}$/gi.test(Value))
                    return res.status(403).json({ code: 0, message: "Nickname failed validation" });

                GuildMember.GuildNickname = Value;
                break;
            case "roles": {
                if (!HasPermission(Mmbr, Permissions.MANAGE_ROLES))
                    return res.status(403).json({ code: 40003, message: "Missing Access" });

                const AllRoles: Role[] = await Promise.all(
                    req.body.roles.map((RID: string) => Role.findOne({ where: { InGuild: { ID: G.ID }, ID: RID } })),
                );
                const HR = GetHighestRole(Mmbr);
                const RolesToSet: Role[] = [];

                RolesToSet.push(G.DefaultRole);

                for (const Role of AllRoles) {
                    if (Role.Position >= HR.Position && G.Owner.ID !== MyUser.ID) continue;

                    if (Role.ID === G.ID) continue;

                    RolesToSet.push(Role);
                }

                GuildMember.Roles = RolesToSet;
                break;
            }
        }
    }

    await GuildMember.save();
    res.json(req.path.includes("/profile/") ? { guild_id: GuildMember.ID } : GuildMember.Package());

    SendGuildMemberUpdate((await User.findOne({
        where: {
            ID: GuildMember.Owner.ID
        },
        relations: {
            Memberships: {
                ToGuild: {
                    Members: true
                }
            }
        }
    }))!);
});

App.patch(["/:GuildID/roles/:RoleID", "/:GuildID/roles"], VerifyAuth, async (req, res) => {
    const SingleRole = typeof req.params.RoleID === "string";

    const MyUser = (await GetUserByRequest(req, { Memberships: { ToGuild: { Owner: true } } }))!;
    const Mmbr = MyUser.Memberships.find((G) => G.ToGuild.ID === req.params.GuildID);
    if (!Mmbr) return res.status(400).json({ code: 0, message: "You aren't participating in that guild." });
    const G = Mmbr.ToGuild;

    if (!HasPermission(Mmbr, Permissions.MANAGE_ROLES))
        return res.status(403).json({ code: 10013, message: "Missing Access" });

    const RoleArray: Role[] = SingleRole
        ? [
            await Role.findOne({
                where: { InGuild: { ID: G.ID }, ID: req.params.RoleID },
                relations: { InGuild: true },
            }),
        ]
        : await Promise.all(
            req.body.map((r: { id: string }) =>
                Role.findOne({ where: { InGuild: { ID: G.ID }, ID: r.id }, relations: { InGuild: true } }),
            ),
        );

    const ResponseBody = [];

    if (GetHighestRole(Mmbr).Position <= GetHighestRoleInArr(RoleArray).Position && G.Owner.ID !== MyUser.ID)
        return res.status(403).json({ code: 10013, message: "Missing Access" });

    for (let I = 0; I < RoleArray.length; I++) {
        const Body = SingleRole ? req.body : req.body[I];
        const Rl = RoleArray[I];

        for (const PropKey of Object.keys(Body)) {
            const Value = Body[PropKey];
            switch (PropKey) {
                case "name":
                    Rl.Name = Value;
                    continue;
                case "permissions":
                    Rl.Permissions = Number.parseInt(Value);
                    continue;
                case "position":
                    Rl.Position = Number.parseInt(Value);
                    continue;
                case "color":
                    Rl.Color = Value;
                    continue;
                case "icon":
                    if (Rl.IconID !== null && !G.Features.includes(GuildFeatures.ROLE_ICONS))
                        return res.status(403).json({ code: JsonErrorCodes.MISSING_ACCESS, message: "Missing Access" });

                    if (Rl.IconID && Rl.IconID !== Value) {
                        Remove(Rl.IconID);
                        Rl.IconID = undefined;
                    }

                    if (!ValidBaseURL(Value)) continue;

                    Rl.IconID = await Upload(Value, "Guilds");
                    continue;
                case "hoist":
                    Rl.ShownOnMemberlist = Value;
                    continue;
                case "mentionable":
                    Rl.AnyoneCanMention = Value;
                    continue;
                case "unicode_emoji":
                    Rl.UnicodeEmoji = Value;
                    continue;
            }
        }

        await Rl.save();

        SendToMembers(
            G.ID,
            OpCodes.DISPATCH,
            {
                guild_id: G.ID,
                role: Rl.Package(),
            },
            1337,
            "GUILD_ROLE_UPDATE",
        );

        if (SingleRole) res.json(Rl.Package());
        else ResponseBody.push(Rl.Package());
    }

    if (!res.headersSent) res.json(ResponseBody);
});

App.patch("/:GuildID/channels", VerifyAuth, async (req, res) => {
    const MyUser = (await GetUserByRequest(req, { Memberships: { ToGuild: true } }))!;
    const Mmbr = MyUser.Memberships.find((G) => G.ToGuild.ID === req.params.GuildID);
    if (!Mmbr) return res.status(400).json({ code: 0, message: "You aren't participating in that guild." });
    const G = Mmbr.ToGuild;

    if (!HasPermission(Mmbr, Permissions.MANAGE_CHANNELS))
        return res.status(403).json({ code: 10013, message: "Missing Access" });

    if (!Array.isArray(req.body)) return res.status(400).json({ code: 0, message: "Invalid payload" });

    for await (const Chnl of req.body) {
        if (typeof Chnl.id !== "string" || typeof Chnl.position !== "number") continue;

        const ChnlEntry = await Channel.findOne({
            where: { OwnerGuild: { ID: G.ID }, ID: Chnl.id },
            relations: { OwnerGuild: true, OwnerCategory: true },
        });
        if (!ChnlEntry) continue;
        ChnlEntry.GuildPosition = Chnl.position;

        if (typeof Chnl.parent_id === "string") {
            const Parent = await Channel.findOne({
                where: { OwnerGuild: { ID: G.ID }, ID: Chnl.parent_id, Type: ChannelType.GUILD_CATEGORY },
            });
            if (Parent) ChnlEntry.OwnerCategory = Parent;
        } else if (!Chnl.parent_id) ChnlEntry.OwnerCategory = undefined;

        await ChnlEntry.save();

        SendToMembers(G.ID, OpCodes.DISPATCH, ChnlEntry.GuildPackage(), 420, "CHANNEL_UPDATE");
    }

    res.sendStatus(204);
});

App.post("/:GuildID/channels", VerifyAuth, async (req, res) => {
    const MyUser = (await GetUserByRequest(req, { Memberships: { ToGuild: true } }))!;
    const Mmbr = MyUser.Memberships.find((G) => G.ToGuild.ID === req.params.GuildID);
    if (!Mmbr) return res.status(400).json({ code: 0, message: "You aren't participating in that guild." });
    const G = Mmbr.ToGuild;

    if (!HasPermission(Mmbr, Permissions.MANAGE_CHANNELS))
        return res.status(403).json({ code: 10013, message: "Missing Access" });

    if (
        !G.Features.includes(GuildFeatures.VERIFIED) &&
        !G.Features.includes(GuildFeatures.PARTNERED) &&
        req.body.type !== ChannelType.GUILD_CATEGORY &&
        req.body.type !== ChannelType.GUILD_ANNOUNCEMENT &&
        req.body.type !== ChannelType.GUILD_TEXT &&
        req.body.type !== ChannelType.GUILD_VOICE
    )
        return res.status(403).json({ code: 10013, message: "Missing Access" });

    const Chnl = Channel.create({
        ID: GenerateSnowflake(),
        Type: req.body.type as ChannelType,
        DisplayName: req.body.name,
        OwnerGuild: G,
    });

    if (typeof req.body.parent_id === "string") {
        const Parent = await Channel.findOne({
            where: { OwnerGuild: { ID: G.ID }, ID: req.body.parent_id, Type: ChannelType.GUILD_CATEGORY },
        });
        if (Parent) Chnl.OwnerCategory = Parent;
    }

    if (typeof req.body.topic === "string" && req.body.topic.length <= 1024) Chnl.Topic = req.body.topic;

    await Chnl.save();

    res.status(201).json(Chnl.GuildPackage());

    SendToMembers(G.ID, OpCodes.DISPATCH, Chnl.GuildPackage(), 69, "CHANNEL_CREATE");
});

App.get("/:GuildID/invites", VerifyAuth, async (req, res) => {
    const MyUser = (await GetUserByRequest(req, { Memberships: { ToGuild: { Invites: { InGuild: true } } } }))!;
    const Mmbr = MyUser.Memberships.find((G) => G.ToGuild.ID === req.params.GuildID);
    if (!Mmbr) return res.status(400).json({ code: 0, message: "You aren't participating in that guild." });

    if (!HasPermission(Mmbr, Permissions.MANAGE_GUILD))
        return res.status(403).json({ code: 10013, message: "Missing Access" });

    res.json(Mmbr.ToGuild.Invites.map((I) => I.Package()));
});

App.get("/:GuildID/vanity-url", VerifyAuth, async (req, res) => {
    const MyUser = (await GetUserByRequest(req, { Memberships: { ToGuild: true } }))!;

    const Mmbr = MyUser.Memberships.find((G) => G.ToGuild.ID === req.params.GuildID);
    if (!Mmbr) return res.status(400).json({ code: 0, message: "You aren't participating in that guild." });

    res.json({
        code: Mmbr.ToGuild.VanityInviteURL,
        uses: 0,
    });
});

App.patch("/:GuildID/vanity-url", VerifyAuth, async (req, res) => {
    if (typeof req.body.code !== "string") return res.status(400).json({ code: 0, message: "Invalid request" });

    const MyUser = (await GetUserByRequest(req, { Memberships: { ToGuild: true } }))!;
    const Mmbr = MyUser.Memberships.find((G) => G.ToGuild.ID === req.params.GuildID);
    if (!Mmbr) return res.status(400).json({ code: 0, message: "You aren't participating in that guild." });

    if (!HasPermission(Mmbr, Permissions.MANAGE_GUILD))
        return res.status(403).json({ code: 10013, message: "Missing Access" });

    if (!req.body.code) {
        Mmbr.ToGuild.VanityInviteURL = undefined;
        await Mmbr.ToGuild.save();

        res.json({
            code: "",
            uses: 0,
        });
        return;
    }

    const ExistingInviteGuild = await Guild.findOne({ where: { VanityInviteURL: req.body.code } });
    if (ExistingInviteGuild) return res.status(400).json({ code: 0, message: "Invite link already taken" });

    Mmbr.ToGuild.VanityInviteURL = req.body.code;
    await Mmbr.ToGuild.save();

    res.json({
        code: req.body.code,
        uses: 0,
    });
});

App.patch("/:GuildID", VerifyAuth, async (req, res) => {
    const MyUser = (await GetUserByRequest(req, {
        Memberships: { ToGuild: { Channels: { OwnerCategory: true, OwnerGuild: true } } },
    }))!;
    const Mmbr = MyUser.Memberships.find((G) => G.ToGuild.ID === req.params.GuildID);
    if (!Mmbr) return res.status(400).json({ code: 0, message: "You aren't participating in that guild." });
    const G = Mmbr.ToGuild;

    if (!HasPermission(Mmbr, Permissions.MANAGE_GUILD))
        return res.status(403).json({ code: 10013, message: "Missing Access" });

    for (const PropKey of Object.keys(req.body)) {
        const Value = req.body[PropKey];
        switch (PropKey) {
            case "name":
                G.Name = Value;
                continue;
            case "description":
                G.Description = Value;
                continue;
            case "icon":
                if (G.IconID && G.IconID !== Value) {
                    Remove(G.IconID);
                    G.IconID = undefined;
                }

                if (!ValidBaseURL(Value)) continue;

                G.IconID = await Upload(Value, "Guilds");
                continue;
        }
    }

    await G.save();

    res.json(G.Package(MyUser));

    SendToMembers(G.ID, OpCodes.DISPATCH, G.Package(MyUser), 1337, "GUILD_UPDATE");
});

App.post("/", VerifyAuth, async (req, res) => {
    if (!req.body.name) return;
    const MyUser = (await GetUserByRequest(req, { Memberships: { Owner: false, ToGuild: true } }))!;

    if (MyUser.Memberships.length >= 100 && !MyUser.HasFlag(UserFlags.STAFF) && !MyUser.HasFlag(UserFlags.PARTNER))
        return res.status(400).json({ code: 0, message: "You're in too many guilds!" });

    const GuildID = GenerateSnowflake();

    const CreatedGuild = await Guild.create({
        ID: GuildID,
        Name: req.body.name,
        Owner: MyUser,
        Features: [GuildFeatures.NEWS, GuildFeatures.VANITY_URL, GuildFeatures.COMMERCE],
    }).save();

    const Mmbr = await Membership.create({
        ID: CreatedGuild.ID,
        Owner: MyUser,
        ToGuild: CreatedGuild,
        CreatedAt: new Date(),
        Roles: [CreatedGuild.DefaultRole],
    }).save();

    await CreatedGuild.reload();
    MyUser.Memberships.push(Mmbr);

    res.json(CreatedGuild.Package(MyUser));
    SendToUser(MyUser, OpCodes.DISPATCH, CreatedGuild.GatewayPackageEvent(MyUser), 24, "GUILD_CREATE");
});

module.exports = {
    DefaultAPI: "/api/v9/guilds",
    App,
};
