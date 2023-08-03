import { z } from "zod";

export const SubscriptionPurchaseSchema = z.object({
    currency: z.string(),
    gateway_checkout_context: z.object({
        brain_tree_device_data: z.any()
    }),
    items: z.array(z.object({
        plan_id: z.string(),
        quantity: z.number().min(1).max(100)
    })),
    metadata: z.any(),
    payment_source_id: z.string(),
    payment_source_token: z.string().nullable(),
    purchase_token: z.string().optional(),
    return_url: z.string().nullable().optional(),
    trial_id: z.string().nullable().optional(),
    gift: z.boolean().optional(),
    sku_subscription_plan_id: z.string().optional()
});

export const GiftPurchaseSchema = z.object({
    currency: z.string().optional(),
    gateway_checkout_context: z.object({
        brain_tree_device_data: z.any()
    }),
    metadata: z.any(),
    payment_source_id: z.string(),
    payment_source_token: z.string().nullable(),
    purchase_token: z.string().optional(),
    return_url: z.string().nullable().optional(),
    trial_id: z.string().nullable().optional(),
    gift: z.boolean().optional(),
    sku_subscription_plan_id: z.string().optional()
});

export const MFAEnableSchema = z.object({
    password: z.string()
});