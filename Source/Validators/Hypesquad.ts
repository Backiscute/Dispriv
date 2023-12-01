import { z } from "zod";

export const HypesquadHouseJoinSchema = z.object({
    house_id: z.number().min(1).max(3)
});