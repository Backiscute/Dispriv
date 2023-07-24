/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-case-declarations */
import { Router } from "express";
import { GetUserByRequest, VerifyAuth } from "../Modules/AuthUtils";
import { GenerateSnowflake } from "../Modules/SnowflakeUtils";
import { Membership, User } from "../Entities/User";
import { RelationType, Relation } from "../Entities/FriendUser";
import { Err, Msg } from "../Modules/Logger";
import { OpCodes } from "../Classes/GatewayOpCodes";
import { Channel, ChannelType } from "../Entities/Channel";
import { Remove, Upload } from "../Modules/AssetUtils";
import {
    CreateTimestamp,
    GenerateRandomString,
    NitroType,
    RequestGatewayAccount,
    SendGuildMemberUpdate,
    SendToUser,
} from "../Modules/DiscordUtils";
import { JsonErrorCodes } from "../Classes/JsonOpCodes";
import { FrecencyUserSettings, PreloadedUserSettings } from "discord-protos";
import { FindConnection } from "../Modules/GatewayUtils";
import { SubscriptionSlot, UserSubscription } from "../Entities/Subscription";
import { ValidateRequest } from "../Modules/ValidationUtils";
import { SubscriptionPurchaseSchema } from "../Validators/Users";
import { SubscriptionPlan } from "../Entities/Gift";

const App = Router();

function IsBase64Image(Data: string) {
    try {
        const ImageBuffer = Buffer.from(Data, "base64");
        return ImageBuffer.length > 0;
    } catch (error) {
        return false;
    }
}

App.patch(["/@me", "/@me/profile", "/%40me/profile"], VerifyAuth, async (req, res) => {
    const U = (await GetUserByRequest(req, {
        Memberships: { ToGuild: { Channels: { OwnerCategory: true, OwnerGuild: true }, Members: true } },
    }))!;
    // const AllowedKeys = [
    //     "accent_color",
    //     "avatar",
    //     "avatar_decoration",
    //     "discriminator",
    //     "display_name",
    //     "global_name",
    //     "theme_colors",
    // ];
    for (const PropKey of Object.keys(req.body)) {
        const Value = req.body[PropKey];
        switch (PropKey) {
            case "avatar":
                if (U.AvatarID && U.AvatarID !== Value) {
                    Remove(U.AvatarID);
                    U.AvatarID = undefined;
                }

                if (!IsBase64Image(Value)) continue;

                U.AvatarID = await Upload(Value, "Users");
                continue;
            case "banner":
                if (U.BannerID && U.BannerID !== Value) {
                    Remove(U.BannerID);
                    U.BannerID = undefined;
                }

                if (!IsBase64Image(Value)) continue;

                U.BannerID = await Upload(Value, "Users");
                break;
            case "bio":
                if (!/^[a-z 0-9!?,.*-_#!;()[\]|`]{0,250}$/gi.test(Value))
                    return res.status(403).json({ code: 0, message: "Bio failed validation" });

                U.Bio = Value;
                continue;
            case "discriminator":
                if (!/^[0-9]{4}$/g.test(Value))
                    return res.status(403).json({ code: 0, message: "weird discriminator" });
                const ExistingUserD = await User.findOne({ where: { Username: U.Username, Discriminator: Value } });
                if (ExistingUserD) return res.status(400).json({ code: 0, message: "Discriminator already taken!" });

                U.Discriminator = Value;
                continue;
            case "username":
                if (!/^[a-z 0-9]{2,32}$/gi.test(Value))
                    return res.status(403).json({ code: 0, message: "Username failed validation" });
                let ExistingUserU = await User.findOne({ where: { Username: Value, Discriminator: U.Discriminator } });
                let DiscrimRandom = U.Discriminator;

                while (ExistingUserU !== null) {
                    DiscrimRandom = GenerateRandomString(4, "0123456789");
                    ExistingUserU = await User.findOne({ where: { Username: Value, Discriminator: DiscrimRandom } });
                }

                U.Username = Value.trim();
                U.Discriminator = DiscrimRandom;
                continue;
            case "theme_colors":
                //U.ThemeColors = Value;
                continue;
        }
    }

    await U.save();

    res.json(U.Package());

    const Conn = FindConnection(U.ID);
    if (Conn) {
        Conn.PackagedAccount = U.Package();
        Conn.Account = (await RequestGatewayAccount(Conn.UserToken))!;
    }

    await SendGuildMemberUpdate(U); //SendToConnections(U, OpCodes.DISPATCH, U.PackagePublic(), 9999, "GUILD_MEMBER_UPDATE");  no its for when you change ur profile n shit and roles and nickname and etc
    SendToUser(U, OpCodes.DISPATCH, U.Package(), 9998, "USER_UPDATE");
});
App.post("/@me/devices", (req, res) => res.sendStatus(204));

//TODO: check if all update or only key
App.use("/@me/settings-proto/:index", (req, res, next) => {
    const Index = parseInt(req.params.index);
    if (isNaN(Index))
        return res.status(400).json({
            code: JsonErrorCodes.GENERAL_ERROR,
            message: "Index can only be an integer.",
        });
    else if (Index < 1 || Index > 3)
        return res.status(400).json({
            code: JsonErrorCodes.GENERAL_ERROR,
            message: "Settings proto index can only be between 1 and 3.",
        });
    else next();
});
App.get("/@me/settings-proto/:index", VerifyAuth, async (req, res) => {
    const MyUser = (await GetUserByRequest(req))!;

    res.send({ settings: MyUser.SettingsProto[parseInt(req.params.index) - 1] });
});

App.patch("/@me/settings-proto/:index", VerifyAuth, async (req, res) => {
    const MyUser = (await GetUserByRequest(req))!,
        Index = parseInt(req.params.index);
    if (typeof req.body.settings !== "string") return res.status(400).json({ code: 0, message: "Invalid payload" });

    try {
        switch (Index) {
            case 1:
                const PreloadedUSettings = PreloadedUserSettings.fromBase64(MyUser.SettingsProto[Index - 1]);
                const PreloadedUSettingsChange = PreloadedUserSettings.fromBase64(req.body.settings);

                for (const [Key, Value] of Object.entries(PreloadedUSettingsChange))
                    PreloadedUSettings[Key as keyof PreloadedUserSettings] = Value;

                MyUser.SettingsProto[Index - 1] = PreloadedUserSettings.toBase64(PreloadedUSettings);
                break;
            case 2:
                const FrenecyUSettings = FrecencyUserSettings.fromBase64(MyUser.SettingsProto[Index - 1]);
                const FrenecyUSettingsChange = FrecencyUserSettings.fromBase64(req.body.settings);

                for (const [Key, Value] of Object.entries(FrenecyUSettingsChange))
                    FrenecyUSettings[Key as keyof FrecencyUserSettings] = Value;

                MyUser.SettingsProto[Index - 1] = FrecencyUserSettings.toBase64(FrenecyUSettings);
                break;
            case 3:
                MyUser.SettingsProto[Index - 1] = req.body.settings;
                break;
        }
        await MyUser.save();
        res.json({ settings: MyUser.SettingsProto[Index - 1] });
    } catch (e) {
        Err("Error in settings proto patch: " + e);
        res.status(500).json({ code: JsonErrorCodes.GENERAL_ERROR, message: "Internal Server Error" });
    }
});

App.delete("/@me/guilds/:ServerID", VerifyAuth, async (req, res) => {
    const MyUser = (await GetUserByRequest(req, { Memberships: { Owner: false, ToGuild: true } }))!;

    const MembershipT = MyUser.Memberships.find((x) => x.ToGuild.ID === req.params.ServerID);
    if (!MembershipT)
        return res.status(400).json({ code: 404, message: "You don't have a valid membership inside that guild." });

    await Membership.createQueryBuilder("memberships").delete().where("ID = :ID", { ID: MembershipT.ID }).execute();
    res.send();
});

App.post("/@me/channels", VerifyAuth, async (req, res) => {
    if (!Array.isArray(req.body.recipients)) return res.status(400).json({ code: 0, message: "400: Bad Request" });

    const DMUsers: User[] = [];
    const MyUser = (await GetUserByRequest(req, { RelationsFrom: true, RelationsRegarding: true }))!;
    const MyUserRelations = [...MyUser.RelationsFrom, ...MyUser.RelationsRegarding];
    for (let I = 0; I < req.body.recipients.length; I++) {
        const UID = req.body.recipients[I];

        const UserData = await User.findOne({
            where: { ID: UID },
            relations: { RelationsFrom: true, RelationsRegarding: true },
        });
        if (!UserData) return res.status(400).json({ code: 0, message: "400: Bad Request" });
        if (UserData.ID === MyUser.ID) return res.status(400).json({ code: 0, message: "400: Bad Request" });

        const RelationBetweenUsers = MyUserRelations.find(
            (R) => R.From.ID === MyUser.ID || R.Regarding.ID === MyUser.ID,
        );
        if (!RelationBetweenUsers || RelationBetweenUsers?.Type !== RelationType.FRIEND)
            return res.status(400).json({ code: 0, message: "Friend relation between users not found" });

        DMUsers.push(UserData);
    }
    DMUsers.push(MyUser);

    const RecipientIDs = DMUsers.map((U) => U.ID);

    const ChannelCheck = await Channel.createQueryBuilder()
        .leftJoinAndSelect("Channel.DMRecipients", "DMRecipient")
        .where("DMRecipient.ID IN (:...RecipientIDs)", { RecipientIDs })
        .having(`COUNT(DISTINCT DMRecipient.ID) = ${RecipientIDs.length}`)
        .groupBy("Channel.ID")
        .getOne();

    if (ChannelCheck) {
        ChannelCheck.DMRecipients!.forEach((D) => console.log(D.Username));
        return res.json(ChannelCheck.SmallDMPackage(MyUser));
    }

    const CT = DMUsers.filter((U) => U.ID !== MyUser.ID).length === 1 ? ChannelType.DM : ChannelType.GROUP_DM;
    const CreatedChannel = await Channel.create({
        ID: GenerateSnowflake(),
        Type: CT,
        Owner: MyUser,
        DMRecipients: DMUsers,
    }).save();

    res.json(CreatedChannel.SmallDMPackage(MyUser));
});

App.get("/@me/burst-credits", VerifyAuth, async (req, res) => {
    const User = (await GetUserByRequest(req))!;
    res.json({
        amount: User.AvailableSuperreactions,
        replenished_today: false,
    });
});

App.get("/@me/library", async (req, res) => {
    res.json([]);
});

App.get("/@me", VerifyAuth, async (req, res) => {
    const User = (await GetUserByRequest(req))!;
    res.json(User.Package());
});

App.get("/:UserID/profile", VerifyAuth, async (req, res) => {
    const UserID = req.params.UserID;
    if (!UserID) return res.status(400).json({ code: 0, message: "400: Bad Request" });

    const FoundUser = await User.findOneBy({ ID: UserID });
    if (!FoundUser) return res.status(404).json({ message: "Unknown User", code: 10013 });
    const Guild: { [Key: string]: unknown } = {};

    if (req.query.guild_id) {
        const Mmbr = await Membership.findOne({
            where: {
                ToGuild: {
                    ID: req.query.guild_id as string,
                },
                Owner: {
                    ID: FoundUser.ID,
                },
            },
            relations: {
                Owner: true,
            },
        });

        if (Mmbr) {
            Guild.guild_member = Mmbr.Package(true);
            Guild.guild_member_profile = {
                bio: Mmbr.Bio,
                accent_color: null,
                banner: Mmbr.BannerID,
                guild_id: Mmbr.ID,
                emoji: null,
                popout_animation_particle_type: null,
                theme_colors: null,
            };
        }
    }

    // const IncludeMutualGuilds = req.query.with_mutual_guilds || false;
    // const IncludeMutualFriendsCount = req.query.with_mutual_friends_count || false;

    res.json({
        badges: FoundUser.Badges.map((B) => B.Package()),
        connected_accounts: [], // TODO
        guild_badges: [],
        mutual_friends_count: 0, // TODO
        mutual_guilds: [], // TODO
        premium_guild_since: null,
        premium_since: null,
        premium_type: 2,
        profile_themes_experiment_bucket: 0,
        user: FoundUser.PackagePublic(),
        user_profile: {
            bio: FoundUser.Bio,
            accent_color: null,
            banner: FoundUser.BannerID,
            emoji: null,
            popout_animation_particle_type: null,
            theme_colors: FoundUser.ThemeColors,
        },
        ...Guild,
    });
});

App.get("/@me/consent", async (req, res) => {
    res.json({ personalization: { consented: true }, usage_statistics: { consented: true } });
});

App.get("/@me/harvest", async (req, res) => {
    res.json({
        harvest_id: GenerateSnowflake(),
        user_id: "0",
        status: 3,
        created_at: "0000-00-00T00:00:00.000000+00:00",
        completed_at: "0000-00-00T00:00:00.000000+00:00",
        polled_at: "0000-00-00T00:00:00.000000+00:00",
    });
});

App.get("/@me/relationships", VerifyAuth, async (req, res) => {
    const UserData = (await GetUserByRequest(req, { RelationsFrom: true, RelationsRegarding: true }))!;
    /*UserData.Relations.forEach(R => {
        const PackagedRelation = R.PackageAPI(true, UserData);
        if (PackagedRelation) Relations.unshift(PackagedRelation);
    });*/
    res.json([
        ...UserData.RelationsFrom.map((R) => R.PackageAPI(true, UserData)),
        ...UserData.RelationsRegarding.map((R) => R.PackageAPI(true, UserData)),
    ]);
});

App.delete("/@me/relationships/:RelatedUserID", VerifyAuth, async (req, res) => {
    const RelationTarget = await User.findOne({
        where: { ID: req.params.RelatedUserID },
        relations: { RelationsFrom: true, RelationsRegarding: true },
    });
    if (!RelationTarget) return res.status(400).json({ code: 10013, message: "Unknown User" });

    const MyUser = (await GetUserByRequest(req, { RelationsFrom: true, RelationsRegarding: true }))!;
    const TargetRelation = [...MyUser.RelationsRegarding, ...MyUser.RelationsFrom].find(
        (R) => R.From.ID === RelationTarget.ID || R.Regarding.ID === RelationTarget.ID,
    );
    if (
        !TargetRelation ||
        (TargetRelation?.Regarding.ID === MyUser.ID && TargetRelation?.Type === RelationType.BLOCKED)
    )
        return res.status(400).json({ code: 0, message: "Relation between users not found" });

    Msg(
        `Relation between ${MyUser.Username}#${MyUser.Discriminator} <-> ${RelationTarget.Username}#${RelationTarget.Discriminator} valid and not BLOCKED.`,
    );

    SendToUser(
        RelationTarget,
        OpCodes.DISPATCH,
        {
            id: MyUser.ID,
            type: TargetRelation.Type,
        },
        null,
        "RELATIONSHIP_REMOVE",
    );
    SendToUser(
        MyUser,
        OpCodes.DISPATCH,
        {
            id: RelationTarget.ID,
            type: TargetRelation.Type,
        },
        null,
        "RELATIONSHIP_REMOVE",
    );

    await TargetRelation.remove();

    res.status(204).send();
});

App.put("/@me/relationships/:RelatedUserID", VerifyAuth, async (req, res) => {
    const RelationTarget = await User.findOne({
        where: { ID: req.params.RelatedUserID },
        relations: { RelationsFrom: true, RelationsRegarding: true },
    });
    if (!RelationTarget) return res.status(400).json({ code: 10013, message: "Unknown User" });

    const MyUser = (await GetUserByRequest(req, { RelationsFrom: true, RelationsRegarding: true }))!;
    let TargetRelation = MyUser.RelationsRegarding.find((R) => R.From.ID === RelationTarget.ID);

    if (req.body.type === RelationType.BLOCKED) {
        if (!TargetRelation) {
            TargetRelation = await Relation.create({
                ID: GenerateSnowflake(),
                From: MyUser,
                Regarding: RelationTarget,
                Type: RelationType.BLOCKED,
            }).save();
            return res.status(204).send();
        }

        if (TargetRelation?.Type === RelationType.BLOCKED)
            return res.status(400).json({ code: 0, message: "Can't block person that's already blocked" });
        TargetRelation.Type = RelationType.BLOCKED;
        await TargetRelation.save();
        return res.status(204).send();
    }

    if (TargetRelation?.Type !== RelationType.NOT_YET_ACCEPTED)
        return res.status(400).json({ code: 0, message: "Incoming relation between users not found" });

    Msg(
        `Relation between ${MyUser.Username}#${MyUser.Discriminator} <- ${RelationTarget.Username}#${RelationTarget.Discriminator} valid and NOT_YET_ACCEPTED.`,
    );
    TargetRelation.Type = RelationType.FRIEND;
    await TargetRelation.save();

    const ChannelCheck = await Channel.createQueryBuilder()
        .leftJoinAndSelect("Channel.DMRecipients", "DMRecipient")
        .where("DMRecipient.ID IN (:...RecipientIDs)", { RecipientIDs: [RelationTarget.ID] })
        .having("COUNT(DISTINCT DMRecipient.ID) = 1")
        .groupBy("Channel.ID")
        .getOne();

    let NChannel: Channel | null = null;

    if (ChannelCheck) {
        ChannelCheck.DMRecipients!.forEach((D) => console.log(D.Username));
        NChannel = ChannelCheck;
    } else {
        const CreatedChannel = await Channel.create({
            ID: GenerateSnowflake(),
            Type: ChannelType.DM,
            Owner: MyUser,
            DMRecipients: [RelationTarget, MyUser],
        }).save();
        NChannel = CreatedChannel;
    }

    SendToUser(
        RelationTarget,
        OpCodes.DISPATCH,
        TargetRelation.PackageGateway(true, RelationTarget),
        null,
        "RELATIONSHIP_ADD",
    );
    SendToUser(MyUser, OpCodes.DISPATCH, TargetRelation.PackageGateway(true, MyUser), null, "RELATIONSHIP_ADD");

    if (!ChannelCheck) {
        SendToUser(RelationTarget, OpCodes.DISPATCH, NChannel.SmallDMPackage(RelationTarget), null, "CHANNEL_CREATE");
        SendToUser(MyUser, OpCodes.DISPATCH, NChannel.SmallDMPackage(MyUser), null, "CHANNEL_CREATE");
    }

    res.status(204).send();
});

App.post("/@me/relationships", VerifyAuth, async (req, res) => {
    const FriendUsername = req.body.username;
    let FriendDiscriminator = (req.body.discriminator ?? 0).toString();

    if (!FriendUsername) return res.status(400).json({ code: 0, message: "400: Bad Request" });

    if (FriendDiscriminator.length < 4) FriendDiscriminator = FriendDiscriminator.padStart(4, "0");

    const MyUser = (await GetUserByRequest(req, { RelationsFrom: true, RelationsRegarding: true }))!;

    const RelationTarget = await User.findOne({
        where: { Username: FriendUsername, Discriminator: FriendDiscriminator },
        relations: { RelationsFrom: true, RelationsRegarding: true },
    });
    if (!RelationTarget) return res.status(404).json({ message: "Unknown User", code: 10013 });

    if (MyUser.ID === RelationTarget.ID)
        return res.status(400).json({ code: 80003, message: "Cannot send friend request to self" });

    //if (RelationTarget.Relationships !== undefined && RelationTarget.Relationships.find(R => R.ID == MyUser.ID) || MyUser.Relationships !== undefined && MyUser.Relationships.find(R => R.ID == QFriendUser.ID)) return res.status(400).json({ code: 80003, message: "Friendship already exists, blocked or pending." });

    try {
        Msg(
            "Creating relation from " +
                MyUser.Username +
                "#" +
                MyUser.Discriminator +
                " to " +
                RelationTarget.Username +
                "#" +
                RelationTarget.Discriminator,
        );

        const CreatedRelation = await Relation.create({
            ID: GenerateSnowflake(),
            From: MyUser,
            Regarding: RelationTarget,
            Type: RelationType.NOT_YET_ACCEPTED,
        }).save();

        console.log(CreatedRelation);

        //(await DisprivDataSource).createQueryBuilder().relation(User, "Relations").of(MyUser).add(CreatedRelation);
        //(await DisprivDataSource).createQueryBuilder().relation(User, "Relations").of(RelationTarget).add(CreatedRelation);

        SendToUser(
            RelationTarget,
            OpCodes.DISPATCH,
            CreatedRelation.PackageGateway(true, RelationTarget),
            null,
            "RELATIONSHIP_ADD",
        );

        SendToUser(MyUser, OpCodes.DISPATCH, CreatedRelation.PackageGateway(true, MyUser), null, "RELATIONSHIP_ADD");

        await RelationTarget.save();
        await MyUser.save();

        return res.sendStatus(204);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ code: 0, message: "Internal Server Error" });
    }
});

App.get("/@me/billing/subscriptions", VerifyAuth, async (req, res) => {
    const MyUser = (await GetUserByRequest(req, { Subscriptions: { LinkedUser: true } }))!;
    res.json(MyUser.Subscriptions.map((S) => S.Package()));
});

App.post("/@me/billing/subscriptions", VerifyAuth, async (req, res, next) => {
    ValidateRequest(req, res, next, SubscriptionPurchaseSchema);
},
async (req, res) => {
    const MyUser = (await GetUserByRequest(req, { Subscriptions: true }))!;
    const Items = req.body.items;

    const Subs: object[] = [];

    for (const Item of Items) {
        const PlanID = Item.plan_id;
        const Quantity = Item.quantity;

        const Plan = await SubscriptionPlan.findOne({ where: { ID: PlanID } });

        if (!Plan) return res.status(400).json({ code: JsonErrorCodes.UNKNOWN_ENTITLEMENT, message: "Unknown Entitlement" });

        const SubID = GenerateSnowflake();
        if (Plan.Name.includes("Server Boost"))
        {
            const Sub = MyUser.Subscriptions.find((S) => S.Items[0].plan_id === PlanID);
            if (Sub) return;

            await UserSubscription.create({
                ID: SubID,
                LinkedUser: MyUser,
                Items: [{ id: GenerateSnowflake(), quantity: Quantity, plan_id: PlanID }],
            }).save();
        }

        switch (Plan.ID) 
        {
            case "642251038925127690":
            case "511651880837840896":
            case "511651885459963904":
            case "944037208325619722":
            {
                for (let i = 0; i < 2; i++ ) {
                    const SubSlot = await SubscriptionSlot.create({
                        ID: GenerateSnowflake(),
                        UserID: MyUser.ID,
                        LinkedSubscriptionID: SubID,
                    });
    
                    await SubSlot.save();
                } // add nitro boosts
                break;
            }
        }

        for ( let i = 0; i < Quantity; i++ ) {
            if (Plan.Name.includes("Nitro"))
            {
                if (Quantity > 1) return res.status(400).json({ code: JsonErrorCodes.INVALID_FORM_BODY_OR_CONTENT_TYPE, message: "Invalid Form Body" });

                const UserSub = await UserSubscription.create({
                    ID: SubID,
                    LinkedUser: MyUser,
                    Items: [{ id: GenerateSnowflake(), quantity: Quantity, plan_id: PlanID }],
                });

                await UserSub.save();
                Subs.push(UserSub.Package());

                MyUser.Premium = true;
                MyUser.PremiumStreak = CreateTimestamp();
                MyUser.PremiumType = ( Plan.Name.includes("Basic") ? NitroType.NITRO_BASIC : Plan.Name.includes("Classic") ? NitroType.NITRO_CLASSIC : NitroType.NITRO );
                MyUser.Subscriptions.push(UserSub);

                await MyUser.save();

                SendToUser(MyUser, OpCodes.DISPATCH, MyUser.Package(), null, "USER_UPDATE");
            }
            else if (Plan.Name.includes("Server Boost"))
            {
                const SubSlot = await SubscriptionSlot.create({
                    ID: GenerateSnowflake(),
                    UserID: MyUser.ID,
                    LinkedSubscriptionID: SubID,
                });

                await SubSlot.save();
    
                Subs.push(SubSlot.Package());
            }
        }
    };

    res.json((Subs.length === 1 ? Subs[0] : Subs));
    
});

App.patch("/@me/billing/subscriptions/:SubID", VerifyAuth, async (req, res, next) => {
    ValidateRequest(req, res, next, SubscriptionPurchaseSchema);
},
async (req, res) => {
    const MyUser = (await GetUserByRequest(req, { Subscriptions: true }))!;
    const Items = req.body.items;

    const Subscription = await UserSubscription.findOne({ where: { ID: req.params.SubID }, relations: { LinkedUser: true } });

    if (!Subscription) return res.status(400).json({ code: JsonErrorCodes.UNKNOWN_SKU, message: "Unknown SKU" });

    const New: object[] = [];

    for (const Item of Items) {
        const PlanID = Item.plan_id;
        const Quantity = Item.quantity;

        const Plan = await SubscriptionPlan.findOne({ where: { ID: PlanID } });

        if (!Plan) return res.status(400).json({ code: JsonErrorCodes.UNKNOWN_ENTITLEMENT, message: "Unknown Entitlement" });

        for ( let i = 0; i < Quantity; i++ ) {
            if (Object.prototype.hasOwnProperty.call(Item, "id")) continue;

            if (Plan.Name.includes("Nitro"))
            {
                Subscription.Items.unshift({ plan_id: PlanID, quantity: Quantity, id: GenerateSnowflake() });

                await Subscription.save();

                res.json(Subscription.Package());
                return;
            }
            else if (Plan.Name.includes("Server Boost"))
            {
                const SubSlot = await SubscriptionSlot.create({
                    ID: GenerateSnowflake(),
                    UserID: MyUser.ID,
                    LinkedSubscriptionID: Subscription.ID,
                });

                await SubSlot.save();

                Subscription.Items.unshift({ plan_id: PlanID, quantity: Quantity, id: GenerateSnowflake() });  

                await Subscription.save();

                New.push(SubSlot.Package());
            }
        }
    };

    res.json(New);
    
});

App.get("/@me/billing/country-code", (req, res) => {
    res.json({ country_code: "US" });
});

App.post("/@me/billing/subscriptions/preview", VerifyAuth, async (req, res) => {
    const IsRenew = req.body.renewal ?? false;
    res.json({
        id: GenerateSnowflake(),
        invoice_items: [
            {
                id: "1",
                amount: 0,
                discounts: [],
                subscription_plan_id: req.body.items[0].plan_id,
                subscription_plan_price: 0,
                quantity: req.body.items[0].quantity,
                proration: false
            }
        ],
        total: 0,
        subtotal: 0,
        currency: "usd",
        tax: 0,
        tax_inclusive: true,
        subscription_period_start: IsRenew ? "2048-01-01T00:00:00.000000+00:00" : CreateTimestamp(),
        subscription_period_end: "2048-01-01T00:00:00.000000+00:00",
    });
});

App.all("/@me/billing/subscriptions/:SubID/preview", VerifyAuth, async (req, res) => {
    const IsRenew = req.body.renewal ?? false;
    const Sub = await UserSubscription.findOne({ where: { ID: req.params.SubID } });

    if (!Sub) return res.status(400).json({ code: JsonErrorCodes.UNKNOWN_SKU, message: "Unknown SKU" });

    const Items = req.body.items ?? Sub.Items;
    const InvoiceItems = [];

    for (const Item of Items) {
        const PlanID = Item.plan_id;
        const Quantity = Item.quantity;

        InvoiceItems.push({
            id: GenerateSnowflake(),
            amount: 0,
            discounts: [],
            subscription_plan_id: PlanID,
            subscription_plan_price: 0,
            quantity: Quantity,
            proration: false
        });
    }

    res.json({
        id: GenerateSnowflake(),
        invoice_items: InvoiceItems,
        total: 0,
        subtotal: 0,
        currency: "usd",
        tax: 0,
        tax_inclusive: true,
        subscription_period_start: IsRenew ? "2048-01-01T00:00:00.000000+00:00" : CreateTimestamp(),
        subscription_period_end: "2048-01-01T00:00:00.000000+00:00",
    });
});

App.get("/@me/guilds/premium/subscription-slots", VerifyAuth, async (req, res) => {
    const MyUser = (await GetUserByRequest(req))!;

    const Boosts = await SubscriptionSlot.find({ where: { UserID: MyUser.ID } });

    res.json(Boosts.map((B) => B.Package()));
});

App.get("/@me/applications/:ApplicationID/entitlements", VerifyAuth, async (req, res) => {
    res.json([]); // subscription credits, etc
});

App.get("/@me/billing/payment-sources", VerifyAuth, async (req, res) => {
    const MyUser = (await GetUserByRequest(req))!;

    res.json([
        {
            id: GenerateSnowflake(),
            type: 2,
            invalid: false,
            flags: 2,
            email: MyUser.Email,
            billing_address: {
                name: MyUser.Username,
                line_1: "DisprivStreet 123",
                line_2: null,
                city: "NY",
                state: "NY",
                country: "US",
                postal_code: "10080",
            },
            country: "US",
            payment_gateway: 2,
            default: true,
        },
    ]);
});

module.exports = {
    DefaultAPI: "/api/v9/users",
    App,
};
