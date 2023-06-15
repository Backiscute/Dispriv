import { Router } from "express";
import { GenerateSnowflake, GetUserByRequest, VerifyAuth } from "../Modules/SnowflakeUtils";
import { Membership, User } from "../Entities/User";
import { RelationType, Relation } from "../Entities/FriendUser";
import { Msg } from "../Modules/Logger";
import { FindConnection, HasIntent, SendOp } from "../Modules/GatewayUtils";
import { OpCodes } from "../Classes/OpCodes";
import { Channel, ChannelType } from "../Entities/Channel";
import { GatewayIntents } from "../Classes/GatewayIntents";

const App = Router();

App.delete("/@me/guilds/:ServerID", VerifyAuth, async (req, res) => {
	const MyUser = await GetUserByRequest(req, { Memberships: { Owner: false, ToGuild: true } });
	
	const MembershipT = MyUser.Memberships.find(x => x.ToGuild.ID === req.params.ServerID);
	if (!MembershipT)
		return res.status(400).json({ code: 404, message: "You don't have a valid membership inside that guild." });

	await Membership.createQueryBuilder("memberships").delete().where("ID = :ID", { ID: MembershipT.ID }).execute();
	res.send();
});

App.post("/@me/channels", VerifyAuth, async (req, res) => {
    if (!Array.isArray(req.body.recipients)) return res.status(400).json({ code: 0, message: "400: Bad Request" });

    const DMUsers: User[] = [];
    const MyUser = await GetUserByRequest(req, { RelationsFrom: true, RelationsRegarding: true });
    const MyUserRelations = [...MyUser.RelationsFrom, ...MyUser.RelationsRegarding];
    for (let I = 0; I < req.body.recipients.length; I++) {
        const UID = req.body.recipients[I];

        const UserData = await User.findOne({ where: { ID: UID }, relations: { RelationsFrom: true, RelationsRegarding: true } });
        if (!UserData) return res.status(400).json({ code: 0, message: "400: Bad Request" });
        if (UserData.ID === MyUser.ID) return res.status(400).json({ code: 0, message: "400: Bad Request" });

        const RelationBetweenUsers = MyUserRelations.find(R => R.From.ID === MyUser.ID || R.Regarding.ID === MyUser.ID);
        if (!RelationBetweenUsers || RelationBetweenUsers?.Type !== RelationType.FRIEND) return res.status(400).json({ code: 0, message: "Friend relation between users not found" });

        DMUsers.push(UserData);
    }
    DMUsers.push(MyUser);

    const RecipientIDs = DMUsers.map(U => U.ID);

    const ChannelCheck = await Channel
        .createQueryBuilder()
        .leftJoinAndSelect("Channel.DMRecipients", "DMRecipient")
        .where("DMRecipient.ID IN (:...RecipientIDs)", { RecipientIDs })
        .having(`COUNT(DISTINCT DMRecipient.ID) = ${RecipientIDs.length}`)
        .groupBy("Channel.ID")
        .getOne();

        
    if (ChannelCheck) {
        ChannelCheck.DMRecipients.forEach(D => console.log(D.Username));
        return res.json(ChannelCheck.SmallDMPackage(MyUser));
    }

    const CT = DMUsers.filter(U => U.ID !== MyUser.ID).length === 1 ? ChannelType.DM : ChannelType.GROUP_DM;
    const CreatedChannel = await Channel.create({
        ID: GenerateSnowflake(),
        Type: CT,
        Owner: MyUser,
        DMRecipients: DMUsers
    }).save();

    res.json(CreatedChannel.SmallDMPackage(MyUser));
});

App.get("/@me/burst-credits", VerifyAuth, async (req, res) => {
    const User = await GetUserByRequest(req);
    res.json({
        amount: User.AvailableSuperreactions,
        replenished_today: false
    });
});

App.get("/@me/library", async (req, res) => {
    res.json([]);
});

App.get("/@me", VerifyAuth, async (req, res) => {
    const User = await GetUserByRequest(req);
    res.json(User.Package());
});

App.get("/:UserID/profile", VerifyAuth, async (req, res) => {
    const UserID = req.params.UserID;
    if (!UserID) return res.status(400).json({ code: 0, message: "400: Bad Request" });

    const FoundUser = await User.findOneBy({ ID: UserID });
    if (!FoundUser) return res.status(404).json({ message: "Unknown User", code: 10013 });

    const IncludeMutualGuilds = req.query.with_mutual_guilds || false;
    const IncludeMutualFriendsCount = req.query.with_mutual_friends_count || false;

    res.json({
        badges: [], // TODO
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
            banner: null,
            emoji: null,
            popout_animation_particle_type: null,
            theme_colors: null
        }
    });
});

App.get("/@me/consent", async (req, res) => {
    res.json({ "personalization": { "consented": true }, "usage_statistics": { "consented": true } });
});

App.get("/@me/harvest", async (req, res) => {
    res.json({
        "harvest_id": GenerateSnowflake(),
        "user_id": "0",
        "status": 3,
        "created_at": "0000-00-00T00:00:00.000000+00:00",
        "completed_at": "0000-00-00T00:00:00.000000+00:00",
        "polled_at": "0000-00-00T00:00:00.000000+00:00"
    });
});

App.get("/@me/relationships", VerifyAuth, async (req, res) => {
    const UserData = await GetUserByRequest(req, { RelationsFrom: true, RelationsRegarding: true });
    /*UserData.Relations.forEach(R => {
        const PackagedRelation = R.PackageAPI(true, UserData);
        if (PackagedRelation) Relations.unshift(PackagedRelation);
    });*/
    res.json([...UserData.RelationsFrom.map((R) => R.PackageAPI(true, UserData)), ...UserData.RelationsRegarding.map((R) => R.PackageAPI(true, UserData))]);
});

App.delete("/@me/relationships/:RelatedUserID", VerifyAuth, async (req, res) => {
    const RelationTarget = await User.findOne({ where: { ID: req.params.RelatedUserID }, relations: { RelationsFrom: true, RelationsRegarding: true } });
    if (!RelationTarget) return res.status(400).json({ code: 10013, message: "Unknown User" });

    const MyUser = await GetUserByRequest(req, { RelationsFrom: true, RelationsRegarding: true });
    const TargetRelation = [...MyUser.RelationsRegarding, ...MyUser.RelationsFrom].find(R => R.From.ID === RelationTarget.ID || R.Regarding.ID === RelationTarget.ID);
    if (!TargetRelation || (TargetRelation?.Regarding.ID === MyUser.ID && TargetRelation?.Type === RelationType.BLOCKED)) return res.status(400).json({ code: 0, message: "Relation between users not found" });

    Msg(`Relation between ${MyUser.Username}#${MyUser.Discriminator} <-> ${RelationTarget.Username}#${RelationTarget.Discriminator} valid and not BLOCKED.`);
    await TargetRelation.remove();
    res.status(204).send();
});

App.put("/@me/relationships/:RelatedUserID", VerifyAuth, async (req, res) => {
    const RelationTarget = await User.findOne({ where: { ID: req.params.RelatedUserID }, relations: { RelationsFrom: true, RelationsRegarding: true } });
    if (!RelationTarget) return res.status(400).json({ code: 10013, message: "Unknown User" });

    const MyUser = await GetUserByRequest(req, { RelationsFrom: true, RelationsRegarding: true });
    let TargetRelation = MyUser.RelationsRegarding.find(R => R.From.ID === RelationTarget.ID);

    if (req.body.type === RelationType.BLOCKED) {
        if (!TargetRelation) {
            TargetRelation = await Relation.create({
                ID: GenerateSnowflake(),
                From: MyUser,
                Regarding: RelationTarget,
                Type: RelationType.BLOCKED
            });
    
            await TargetRelation.save();
            return res.status(204).send();
        }

        if (TargetRelation?.Type === RelationType.BLOCKED) return res.status(400).json({ code: 0, message: "Can't block person that's already blocked" });
        TargetRelation.Type = RelationType.BLOCKED;
        await TargetRelation.save();
        return res.status(204).send();
    }

    if (TargetRelation?.Type !== RelationType.NOT_YET_ACCEPTED) return res.status(400).json({ code: 0, message: "Incoming relation between users not found" });

    Msg(`Relation between ${MyUser.Username}#${MyUser.Discriminator} <- ${RelationTarget.Username}#${RelationTarget.Discriminator} valid and NOT_YET_ACCEPTED.`);
    TargetRelation.Type = RelationType.FRIEND;
    await TargetRelation.save();

    const ChannelCheck = await Channel
        .createQueryBuilder()
        .leftJoinAndSelect("Channel.DMRecipients", "DMRecipient")
        .where("DMRecipient.ID IN (:...RecipientIDs)", { RecipientIDs: [RelationTarget.ID] })
        .having("COUNT(DISTINCT DMRecipient.ID) = 1")
        .groupBy("Channel.ID")
        .getOne();

    let NChannel = null;
        
    if (ChannelCheck) {
        ChannelCheck.DMRecipients.forEach(D => console.log(D.Username));
        NChannel = ChannelCheck;
    }
    else {
        const CreatedChannel = await Channel.create({
            ID: GenerateSnowflake(),
            Type: ChannelType.DM,
            Owner: MyUser,
            DMRecipients: [RelationTarget, MyUser]
        }).save();
        NChannel = CreatedChannel;
    }
    

    const TargetConnection = FindConnection(RelationTarget.ID);
    if (TargetConnection != null && HasIntent(TargetConnection.Intents, GatewayIntents.GUILDS)) SendOp(TargetConnection, OpCodes.DISPATCH, NChannel.SmallDMPackage(RelationTarget), null, "CHANNEL_CREATE");
    // if (TargetConnection != null) SendOp(TargetConnection, OpCodes.DISPATCH, TargetRelation.PackageGateway(true, RelationTarget), null, "RELATIONSHIP_ADD");

    const MyConnection = FindConnection(MyUser.ID);
    if (MyConnection != null && HasIntent(TargetConnection.Intents, GatewayIntents.GUILDS)) SendOp(MyConnection, OpCodes.DISPATCH, NChannel.SmallDMPackage(MyUser), null, "CHANNEL_CREATE");
   // if (MyConnection != null) SendOp(TargetConnection, OpCodes.DISPATCH, TargetRelation.PackageGateway(true, MyUser), null, "RELATIONSHIP_ADD");
    res.status(204).send();
});

App.post("/@me/relationships", VerifyAuth, async (req, res) => {
    const FriendUsername = req.body.username;
    let FriendDiscriminator = (req.body.discriminator ?? 0).toString();

    if (!FriendUsername) return res.status(400).json({ code: 0, message: "400: Bad Request" });

    if (FriendDiscriminator.length < 4) FriendDiscriminator = FriendDiscriminator.padStart(4, "0");

    const MyUser = await GetUserByRequest(req, { RelationsFrom: true, RelationsRegarding: true });

    const RelationTarget = await User.findOne({ where: { Username: FriendUsername, Discriminator: FriendDiscriminator }, relations: { RelationsFrom: true, RelationsRegarding: true } });
    if (!RelationTarget) return res.status(404).json({ message: "Unknown User", code: 10013 });

    if (MyUser.ID === RelationTarget.ID) return res.status(400).json({ code: 80003, message: "Cannot send friend request to self" });

    //if (RelationTarget.Relationships !== undefined && RelationTarget.Relationships.find(R => R.ID == MyUser.ID) || MyUser.Relationships !== undefined && MyUser.Relationships.find(R => R.ID == QFriendUser.ID)) return res.status(400).json({ code: 80003, message: "Friendship already exists, blocked or pending." });

    try {
        Msg("Creating relation from " + MyUser.Username + "#" + MyUser.Discriminator + " to " + RelationTarget.Username + "#" + RelationTarget.Discriminator);

        const CreatedRelation = await Relation.create({
            ID: GenerateSnowflake(),
            From: MyUser,
            Regarding: RelationTarget,
            Type: RelationType.NOT_YET_ACCEPTED
        });

        await CreatedRelation.save();

        //(await DisprivDataSource).createQueryBuilder().relation(User, "Relations").of(MyUser).add(CreatedRelation);
        //(await DisprivDataSource).createQueryBuilder().relation(User, "Relations").of(RelationTarget).add(CreatedRelation);


        const TargetConnection = FindConnection(RelationTarget.ID);
        if (TargetConnection != null) SendOp(TargetConnection, OpCodes.DISPATCH, CreatedRelation.PackageGateway(true, RelationTarget), null, "RELATIONSHIP_ADD");

        const MyConnection = FindConnection(MyUser.ID);
        if (MyConnection != null) SendOp(MyConnection, OpCodes.DISPATCH, CreatedRelation.PackageGateway(true, MyUser), null, "RELATIONSHIP_ADD");

        return res.sendStatus(204);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ code: 0, message: "Internal Server Error" });
    }
});

module.exports = {
    DefaultAPI: "/api/v9/users",
    App
};