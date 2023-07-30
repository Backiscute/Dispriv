import { z } from "zod";

/*
{
    "name": "blep",
    "type": 1,
    "description": "Send a random adorable animal photo",
    "options": [
        {
            "name": "animal",
            "description": "The type of animal",
            "type": 3,
            "required": True,
            "choices": [
                {
                    "name": "Dog",
                    "value": "animal_dog"
                },
                {
                    "name": "Cat",
                    "value": "animal_cat"
                },
                {
                    "name": "Penguin",
                    "value": "animal_penguin"
                }
            ]
        },
        {
            "name": "only_smol",
            "description": "Whether to show only baby animals",
            "type": 5,
            "required": False
        }
    ]
}

*/

export const CreateGlobalCommandSchema = z.array(z.object({
    name: z.string().min(1).max(32),
    description: z.string().min(1).max(100).optional(),
    type: z.number().min(1).max(3),
    nsfw: z.boolean().optional(),
    default_member_permissions: z.number().optional(),
    options: z.array(
        z.object({
            name: z.string().min(1).max(32),
            description: z.string().min(1).max(100),
            type: z.number().min(1).max(10),
            required: z.boolean().optional(),
            choices: z.array(
                z.object({
                    name: z.string().min(1).max(100),
                    value: z.string().min(1).max(100)
                })
            ).optional(),
            options: z.any().optional()
        })
    ).optional()
}));