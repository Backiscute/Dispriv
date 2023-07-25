import { BaseEntity, BeforeInsert, Column, Entity, JoinTable, ManyToOne, PrimaryColumn } from "typeorm";
import { User } from "./User";
import { CreateTimestamp } from "../Modules/DiscordUtils";
import { GenerateSnowflake } from "../Modules/SnowflakeUtils";

export interface SubscriptionItem {
    id: string;
    quantity: number;
    plan_id: string;
};

@Entity()
export class UserSubscription extends BaseEntity {
    @PrimaryColumn()
        ID: string;

    @Column({ default: "USD" })
        Currency: string;

    @ManyToOne(() => User, (U) => U.Subscriptions, {})
    @JoinTable()
        LinkedUser: User;

    @Column({ default: 1 })
        Status: number;

    @Column({ default: 1 })
        Type: number;

    @Column()
        Created: string;
    
    @Column()
        PeriodStart: string;

    @Column()
        PeriodEnd: string;

    @Column({ nullable: true })
        CanceledAt?: string;

    @Column({ type: "simple-json" })
        Items: SubscriptionItem[];

    @BeforeInsert()
    Setup() 
    {
        this.ID = GenerateSnowflake();
        this.Created = CreateTimestamp();
        this.PeriodStart = CreateTimestamp();
        this.PeriodEnd = "2048-01-01T00:00:00.000000+00:00";
    }
    
    Package()
    {
        return {
            canceled_at: this.CanceledAt,
            country_code: null,
            created_at: this.Created,
            current_period_end: this.PeriodEnd,
            current_period_start: this.PeriodStart,
            id: this.ID,
            items: this.Items,
            payment_gateway: null,
            payment_gateway_plan_id: null,
            payment_gateway_subscription_id: null,
            price: null,
            status: this.Status,
            streak_started_at: this.Created, // temp
            type: this.Type,
            use_storekit_resubscribe: false,
            user_id: this.LinkedUser.ID,
            currency: "usd"
        };
    }
}

@Entity()
export class SubscriptionSlot extends BaseEntity { // aka boosts
    @PrimaryColumn()
        ID: string;

    @Column()
        LinkedSubscriptionID?: string;

    @Column({ nullable: true })
        CooldownEnd?: string;

    @Column({ nullable: true })
        GuildID?: string;

    @Column()
        UserID: string;

    Package()
    {
        return {
            canceled: false,
            id: this.ID,
            cooldown_ends_at: this.CooldownEnd,
            premium_guild_subscription: this.GuildID ? {
                ended: false,
                guild_id: this.GuildID,
                id: this.ID,
                user_id: this.UserID
            } : null,
            subscription_id: this.LinkedSubscriptionID
        };
    }
}