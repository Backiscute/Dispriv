import { Router } from "express";
import { ValidateRequest } from "../Modules/ValidationUtils";
import { MessageSendSchema } from "../Validators/Channels";
import { Webhook } from "../Entities/Webhook";
import { Message } from "../Entities/Message";

const App = Router();

App.post("/:ChannelID/:WebhookToken", ValidateRequest(MessageSendSchema), async (req, res) => {
    return;
    const Wh = await Webhook.findOne({
        where: {
            Channel: {
                ID: req.params.ChannelID
            },
            Token: req.params.WebhookToken
        },
        relations: {
            Channel: true
        }
    });

    const Msg = await Message.create({

    }).save();
});

module.exports = {
    DefaultAPI: "/api/webhooks",
    App
};