import { Router } from "express";
import { GenerateSnowflake, GetUserByRequest, VerifyAuth } from "../Modules/SnowflakeUtils";
import { User } from "../Entities/User";
import { RelationType, Relation } from "../Entities/FriendUser";
import { Msg } from "../Modules/Logger";

const App = Router();

App.get("/@me/burst-credits", VerifyAuth, async (req, res) => {
    const User = await GetUserByRequest(req);
    res.json(User.AvailableSuperreactions);
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
    res.json({"personalization": {"consented": true}, "usage_statistics": {"consented": true}});
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
    const UserData = await GetUserByRequest(req, { Relations: true });
    console.log(UserData.Relations);
    res.json([ ]);
});

App.post("/@me/relationships", VerifyAuth, async (req, res) => {
    const FriendUsername = req.body.username;
    let FriendDiscriminator = (req.body.discriminator ?? 0).toString();

    if (!FriendUsername) return res.status(400).json({ code: 0, message: "400: Bad Request" });

    if (FriendDiscriminator.length < 4) FriendDiscriminator = FriendDiscriminator.padStart(4, "0");

    const MyUser = await GetUserByRequest(req);

    if (FriendUsername == MyUser.Username && FriendDiscriminator == MyUser.Discriminator) return res.status(400).json({ code: 80003, message: "Cannot send friend request to self" });

    const RelationTarget = await User.findOneBy({ Username: FriendUsername, Discriminator: FriendDiscriminator });
    if (!RelationTarget) return res.status(404).json({ message: "Unknown User", code: 10013 });

    //if (RelationTarget.Relationships !== undefined && RelationTarget.Relationships.find(R => R.ID == MyUser.ID) || MyUser.Relationships !== undefined && MyUser.Relationships.find(R => R.ID == QFriendUser.ID)) return res.status(400).json({ code: 80003, message: "Friendship already exists, blocked or pending." });

    try 
    {
        Msg("Creating relation from " + MyUser.Username + "#" + MyUser.Discriminator + " to " + RelationTarget.Username + "#" + RelationTarget.Discriminator);
        
        const CreatedRelation = await Relation.create({
            ID: GenerateSnowflake(),
            From: MyUser,
            Regarding: RelationTarget,
            Type: RelationType.NOT_YET_ACCEPTED
        });
        await CreatedRelation.save();
    
        //QFriendUser.Relationships.unshift(NewFriendUser);
        //MyUser.Relationships.unshift(NewFriendUser1);
    
        await RelationTarget.save();
        return res.sendStatus(204);
    }
    catch (err)
    {
        console.error(err);
        return res.status(500).json({ code: 0, message: "Internal Server Error" });
    }
});

module.exports = {
    DefaultAPI: "/api/v9/users",
    App
};