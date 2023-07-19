import { Router } from "express";
import { User } from "../Entities/User";
import { VerifyToken } from "../Modules/AuthUtils";
import { DiscordApplication } from "../Entities/Application";
import { Channel, ChannelType } from "../Entities/Channel";
import { Guild } from "../Entities/Guild";
import { Badge } from "../Entities/Badge";
import { OpCodes } from "../Classes/GatewayOpCodes";
import { SendMessage, SendToMembers, SendToUser } from "../Modules/DiscordUtils";
import { Connections } from "../Handlers/Gateway";
import { Gift, SKU, SubscriptionPlan } from "../Entities/Gift";
import { GenerateCode, GenerateSnowflake } from "../Modules/SnowflakeUtils";
import { SendOp } from "../Modules/GatewayUtils";
import { MessageFlags, UserFlags } from "../Classes/Flags";
import { Presence } from "../Classes/Presence";
import { Msg } from "../Modules/Logger";
import { green, red } from "colorette";
import { Message, MessageType } from "../Entities/Message";

const App = Router();

App.use((req, res, next) => {
    if (req.header("authorization") !== process.env.DASHBOARD_KEY)
        return res.status(403).json({ code: 0, message: "You are not authorized to use the TEST API." });
    next();
});

App.get("/SystemAccount", async (req, res) => {
    let Account = await User.findOneBy({
        Flags: UserFlags.SYSTEM,
        Bot: true,
    });

    if (!Account)
        Account = await User.create({
            ID: GenerateSnowflake(),
            Username: "Discord",
            Email: "-",
            Password: "-",
            Bio: "This is the official Discord account on this Dispriv instance.",
            DateOfBirth: new Date(),
            Presence: Presence.UNKNOWN,
            Discriminator: "0",
            Flags: UserFlags.SYSTEM,
            Bot: true,
            TutorialReadIndicators: [],
            AuthorizedApps: [],
        }).save();

    return res.json({
        data: Account.Package(),
    });
});

App.post("/SystemMessages", async (req, res) => {
    if (typeof req.body.Content !== "string")
        return res.status(400).json({ success: false, errorMessage: "'Content' must be a string" });

    const SystemUser = await User.findOne({
        where: {
            Flags: UserFlags.SYSTEM,
            Bot: true,
        },
    });

    if (!SystemUser)
        return res
            .status(400)
            .json({ success: false, errorMessage: "Please create a System User before sending System Messages!" });

    if (req.body.Recipient) {
        const U = await User.findOne({
            where: {
                ID: req.body.Recipient,
            },
        });
        if (!U) return res.status(400).json({ success: false, errorMessage: "Invalid Recipient" });
        let UrgentChannel = await Channel.findOne({
            where: {
                DMRecipients: [{ ID: U.ID }, { ID: SystemUser.ID }],
            },
            relations: {
                DMRecipients: true,
            },
        });

        if (U.ID === SystemUser.ID) return;

        console.log(`${U.ID} -> ${U.Username}#${U.Discriminator}`);
        console.log(`${SystemUser.ID} -> ${SystemUser.Username}#${SystemUser.Discriminator}`);

        console.log(UrgentChannel?.DMRecipients);

        if (!UrgentChannel || UrgentChannel.DMRecipients?.length !== 2) {
            Msg(`Urgent message DM with ${red(U.Username + "#" + U.Discriminator)} doesn't exist, creating new!`);

            UrgentChannel = await Channel.create({
                ID: GenerateSnowflake(),
                Type: ChannelType.DM,
                Owner: SystemUser,
                DMRecipients: [SystemUser, U],
            }).save();

            SendToUser(U, OpCodes.DISPATCH, UrgentChannel.SmallDMPackage(U), null, "CHANNEL_CREATE");
        } else Msg(`Urgent message DM with ${green(U.Username + "#" + U.Discriminator)} exists!`);

        const UrgentMessage = await Message.create({
            ID: GenerateSnowflake(),
            Author: SystemUser,
            Type: MessageType.DEFAULT,
            Flags: MessageFlags.URGENT,
            Content: req.body.Content,
            CreationDate: new Date(),
            Channel: UrgentChannel,
        }).save();

        Msg(`Sent urgent DM to ${green(U.Username + "#" + U.Discriminator)}!`);

        await SendMessage(UrgentMessage);
    } else {
        const AllUsers = await User.find();
        AllUsers.forEach(async (U) => {
            let UrgentChannel = await Channel.findOne({
                where: {
                    DMRecipients: [{ ID: U.ID }, { ID: SystemUser.ID }],
                },
                relations: {
                    DMRecipients: true,
                },
            });

            if (U.ID === SystemUser.ID) return;

            console.log(`${U.ID} -> ${U.Username}#${U.Discriminator}`);
            console.log(`${SystemUser.ID} -> ${SystemUser.Username}#${SystemUser.Discriminator}`);

            console.log(UrgentChannel?.DMRecipients);

            if (!UrgentChannel || UrgentChannel.DMRecipients?.length !== 2) {
                Msg(`Urgent message DM with ${red(U.Username + "#" + U.Discriminator)} doesn't exist, creating new!`);

                UrgentChannel = await Channel.create({
                    ID: GenerateSnowflake(),
                    Type: ChannelType.DM,
                    Owner: SystemUser,
                    DMRecipients: [SystemUser, U],
                }).save();

                SendToUser(U, OpCodes.DISPATCH, UrgentChannel.SmallDMPackage(U), null, "CHANNEL_CREATE");
            } else Msg(`Urgent message DM with ${green(U.Username + "#" + U.Discriminator)} exists!`);

            const UrgentMessage = await Message.create({
                ID: GenerateSnowflake(),
                Author: SystemUser,
                Type: MessageType.DEFAULT,
                Flags: MessageFlags.URGENT,
                Content: req.body.Content.replaceAll("{USER}", U.Username),
                CreationDate: new Date(),
                Channel: UrgentChannel,
            }).save();

            Msg(`Sent urgent DM to ${green(U.Username + "#" + U.Discriminator)}!`);

            await SendMessage(UrgentMessage);
        });
    }

    res.json({
        success: true,
    });
});

App.get("/Websockets", async (req, res) => {
    res.json(Connections);
});

App.get("/Guilds", async (req, res) => {
    // example: GET /Guilds?search=Test
    // should do a text search on the guilds
    const Search = req.query.search as string | undefined;
    const Guilds = await Guild.createQueryBuilder("Guild")
        .where("Guild.Name GLOB :SearchTerm", { SearchTerm: `*${Search}*` })
        .limit(25)
        .getMany();
    if (Search) {
        // const FilteredGuilds = Guilds.filter((G) => /^\d+$/.test(Search) ? G.ID.startsWith(Search) : G.Name.toLowerCase().includes(Search.toLowerCase()));
        return res.json(Guilds.map((G) => G.Package(new User())));
    }
    res.json(Guilds.map((G) => G.Package()));
});

App.patch("/Server/:ID", async (req, res) => {
    const ServerData = await Guild.findOneBy({
        ID: req.params.ID,
    });
    if (!ServerData) return;

    Object.keys(req.body).forEach((K) => {
        //@ts-expect-error test endpoint, checks not needed
        ServerData[K] = req.body[K];
    });

    await ServerData.save();

    const GatewayPackage = ServerData.GatewayPackage(new User());
    SendToMembers(
        ServerData.ID,
        OpCodes.DISPATCH,
        {
            ...GatewayPackage,
            ...GatewayPackage.properties,
        },
        6969,
        "GUILD_UPDATE",
    );

    res.send(ServerData.Package(new User()));
});

App.patch("/Server/:ID/Features", async (req, res) => {
    const ServerData = await Guild.findOneBy({
        ID: req.params.ID,
    });
    if (!ServerData) return;

    ServerData.Features = req.body.features;
    await ServerData.save();
    const GatewayPackage = ServerData.GatewayPackage(new User());
    SendToMembers(
        ServerData.ID,
        OpCodes.DISPATCH,
        {
            ...GatewayPackage,
            ...GatewayPackage.properties,
        },
        6969,
        "GUILD_UPDATE",
    );
    res.send(ServerData.Package(new User()));
});

App.post("/Badge", async (req, res) => {
    if (typeof req.body.ID !== "string" || typeof req.body.Name !== "string" || typeof req.body.IconID !== "string")
        return res.status(400).json({
            errorMessage: "One or more fields missing: ID, Name, IconID",
            success: false,
        });

    const CreatedBadge = await Badge.create({
        ID: req.body.ID,
        DisplayName: req.body.Name,
        IconID: req.body.IconID,
    }).save();

    res.json({
        errorMessage: null,
        success: true,
        data: CreatedBadge.Package(),
    });
});

App.patch("/Channel/:ID", async (req, res) => {
    const ChannelData = await Channel.findOneBy({
        ID: req.params.ID,
    });
    if (!ChannelData) return;

    Object.keys(req.body).forEach((K) => {
        //@ts-expect-error test endpoint, checks not needed
        ChannelData[K] = req.body[K];
    });

    await ChannelData.save();
    res.send(ChannelData);
});

App.patch("/UserBadges/:Username/:Discriminator", async (req, res) => {
    const UserData = await User.findOneBy({
        Username: req.params.Username,
        Discriminator: req.params.Discriminator,
    });
    if (!UserData) return;

    const Badges: Badge[] = [];
    for (const BadgeID of req.body) {
        const BadgeFound = await Badge.findOne({ where: { ID: BadgeID } });
        if (!BadgeFound) continue;

        Badges.push(BadgeFound);
    }

    // i have no clue how this works i found it on google
    Badges.sort((A, B) => A.ID.localeCompare(B.ID, "en", { sensitivity: "base" }));

    UserData.Badges = Badges;
    await UserData.save();

    res.json({
        errorMessage: null,
        success: true,
        data: Badges.map((B) => B.Package()),
    });
});

App.patch("/User/:Username/:Discriminator", async (req, res) => {
    const UserData = await User.findOneBy({
        Username: req.params.Username,
        Discriminator: req.params.Discriminator,
    });
    if (!UserData) return;

    Object.keys(req.body).forEach((K) => {
        //@ts-expect-error test endpoint, checks not needed
        UserData[K] = req.body[K];
    });

    await UserData.save();
    res.send(UserData);
});

/*App.delete("/Channels/:ChannelID", async (req, res) => {
    const ChannelData = await Channel.findOne({
        where: {
            ID: req.params.ChannelID as string
        }
    });

    if (ChannelData) await Channel.createQueryBuilder().delete().where("ID = :ID", { ID: ChannelData.ID }).execute();

    res.send();
});*/

App.post("/UpdateApp/:AppID", async (req, res) => {
    const Application = await DiscordApplication.findOneBy({
        ID: req.params.AppID,
    });
    if (!Application) return;

    Object.keys(req.body).forEach((K) => {
        //@ts-expect-error test endpoint, checks not needed
        Application[K] = req.body[K];
    });

    await Application.save();
    res.send(Application);
});

App.post("/verifytoken", async (req, res) => {
    const Test = await VerifyToken(req.body.token);
    res.json({ passed: Test });
});

App.get("/Gifts/Gifts", async (req, res) => {
    const Gifts = await Gift.find();
    res.json(Gifts);
});

App.get("/Gifts/SKUs", async (req, res) => {
    const SKUs = await SKU.find();
    res.json(SKUs);
});

App.get("/Gifts/SubscriptionPlans", async (req, res) => {
    const SubscriptionPlans = await SubscriptionPlan.find();
    res.json(SubscriptionPlans);
});

App.put("/Gifts/Gifts", async (req, res) => {
    try {
        const [SKUData, SubscriptionPlanData, UserData] = await Promise.all([
            SKU.findOne({ where: { ID: req.body.SKUID } }),
            SubscriptionPlan.findOne({ where: { ID: req.body.SubPlanID } }),
            User.findOne({ where: { ID: req.body.UserID } }),
        ]);
        if (!SKUData || !SubscriptionPlanData || !UserData)
            return res.status(400).json({ message: "Invalid SKU or Subscription Plan" });
        const GiftData = Gift.create({
            ID: GenerateSnowflake(),
            ...req.body,
            SKU: SKUData,
            SubscriptionPlan: SubscriptionPlanData,
            User: UserData,
            Code: GenerateCode(16),
        });
        await GiftData.save();
        return res.json(GiftData);
    } catch (e) {
        return res.status(500).json({ message: e });
    }
});

App.put("/Gifts/SKU", async (req, res) => {
    const SKUData = SKU.create({
        ID: GenerateSnowflake(),
        ...req.body,
    });
    await SKUData.save();
    return res.json(SKUData);
});

App.put("/Gifts/SubPlan", async (req, res) => {
    try {
        const SubPlanData = SubscriptionPlan.create({
            ID: GenerateSnowflake(),
            ...req.body,
        });
        await SubPlanData.save();
        return res.json(SubPlanData);
    } catch (e) {
        return res.status(500).json({ message: e });
    }
});

App.patch("/Gifts/Gifts/:Code", async (req, res) => {
    try {
        console.log(req.body);
        const GiftData = await Gift.findOne({ where: { Code: req.params.Code } });
        if (!GiftData) return res.status(400).json({ message: "Invalid Gift Code" });
        Object.keys(req.body).forEach((K) => {
            //@ts-expect-error test endpoint, checks not needed
            GiftData[K] = req.body[K];
        });
        await GiftData.save();
        return res.json(GiftData);
    } catch (e) {
        return res.status(500).json({ message: e });
    }
});

App.post("/ws/:id", async (req, res) => {
    const WS = Connections.find((C) => C.ID === req.params.id);
    if (!WS) return res.status(404).json({ message: "No WS found" });
    SendOp(WS, req.body.op, req.body.d, req.body.s, req.body.t);
    res.json({ message: "Sent" });
});

module.exports = {
    DefaultAPI: "/api/tests",
    App,
};
