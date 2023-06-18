import { Router } from "express";
import { GetUserByRequest, VerifyAuth } from "../Modules/AuthUtils";
import { Guild } from "../Entities/Guild";

const App = Router();

App.get("/discoverable-guilds", VerifyAuth, async (req, res) => {
	const Limit = Number(req.query.limit ?? 30);
	const Offset = Number(req.query.offset ?? 0);
	const MyUser = await GetUserByRequest(req);

	const Guilds = await Guild.find({
		order: { ID: "DESC" },
		take: Limit,
		skip: Offset
	});

	res.json({
		guilds: Guilds.map(G => G.DiscoveryPackage()),
		limit: Limit,
		offset: Offset,
		total: Guilds.length
	});
});

module.exports = {
	DefaultAPI: "/api/v9",
	App,
};