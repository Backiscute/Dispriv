import { Router } from "express";
import { GetUserByRequest, VerifyAuth } from "../Modules/AuthUtils";
import formidable from "formidable";
import { JsonErrorCodes } from "../Classes/JsonOpCodes";
import { FindConnection } from "../Modules/GatewayUtils";

const App = Router();

App.post("/", VerifyAuth(false), async (req, res) => {
    const Form = formidable({});

    Form.parse(req, async (err, fields) => {
        if (err) return res.status(400).json({ message: "Invalid Form Body", code: JsonErrorCodes.INVALID_FORM_BODY_OR_CONTENT_TYPE });

        const Payload = fields.payload_json ? JSON.parse(fields.payload_json[0]) : null;

        if (!Payload) return res.status(400).json({ message: "Invalid Form Body", code: JsonErrorCodes.INVALID_FORM_BODY_OR_CONTENT_TYPE });
        if (!Payload.data) return res.status(400).json({ message: "Invalid Form Body", code: JsonErrorCodes.INVALID_FORM_BODY_OR_CONTENT_TYPE });
        
        const ApplicationID = Payload.application_id;
        const InteractionType = Payload.type;
        const ChannelID = Payload.channel_id;
        const GuildID = Payload.guild_id;
        const CommandID = Payload.data.id;

        if (!ApplicationID || !InteractionType || !ChannelID || !GuildID || !CommandID) return res.status(400).json({ message: "Invalid Form Body", code: JsonErrorCodes.INVALID_FORM_BODY_OR_CONTENT_TYPE });

        const MyUser = await GetUserByRequest(req, { Memberships: { ToGuild: { Integrations: { Application: { SlashCommands: true, Bot: true } } } } });

        if (!MyUser) return res.status(404).json({ message: "Missing Access", code: JsonErrorCodes.MISSING_ACCESS });

        const Guild = MyUser.Memberships.find((M) => M.ToGuild.ID === GuildID);

        if (!Guild) return res.status(404).json({ message: "Missing Access", code: JsonErrorCodes.MISSING_ACCESS });

        const Integration = Guild.ToGuild.Integrations.find((I) => I.Application.ID === ApplicationID);

        if (!Integration) return res.status(404).json({ message: "Missing Access", code: JsonErrorCodes.MISSING_ACCESS });

        const Command = Integration.Application.SlashCommands.find((C) => C.ID === CommandID);

        if (!Command) return res.status(404).json({ message: "Unknown Interaction", code: JsonErrorCodes.UNKNOWN_INTERACTION });

        console.log(Command);
        console.log(InteractionType);

        if (!Integration.Application.Bot) return res.status(404).json({ message: "Missing Access", code: JsonErrorCodes.MISSING_ACCESS });

        // find the bot gateway connection??

        const BotConnection = FindConnection(Integration.Application.Bot.ID);

        if (!BotConnection) return res.status(404).json({ message: "Failed To Send Application Interaction", code: JsonErrorCodes.FAILED_TO_SEND_APPLICATION_INTERACTION });

        //SendOp(BotConnection, OpCodes.DISPATCH, {  })
    });
});
module.exports = {
    DefaultAPI: "/api/v9/interactions",
    App,
};
