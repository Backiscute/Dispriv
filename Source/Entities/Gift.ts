/* eslint-disable no-unused-vars */
import {
    Entity,
    PrimaryColumn,
    Column,
    BaseEntity,
    OneToMany,
    ManyToOne,
    ManyToMany,
    JoinColumn,
    BeforeRemove,
} from "typeorm";

import { User } from "./User";

@Entity()
export class SubscriptionPlan extends BaseEntity {
    @PrimaryColumn()
    ID: string;

    @Column({ default: "Nitro Monthly" })
    Name: string;

    @Column({ default: 1 })
    Interval: number;

    @Column({ default: 1 })
    IntervalCount: number;

    @Column({ default: true })
    TaxInclusive: boolean;

    @Column({ default: "521847234246082599" })
    SKUID: string;

    @Column({ default: "usd" })
    Currency: string;

    @Column({ default: 999 })
    Price: number;

    @Column({ nullable: true })
    PriceTier?: number;

    @OneToMany(() => Gift, (Gift) => Gift.SubscriptionPlan)
    Gifts: Gift[];

    Package() {
        return {
            id: this.ID,
            name: this.Name,
            interval: this.Interval,
            interval_count: this.IntervalCount,
            tax_inclusive: this.TaxInclusive,
            sku_id: this.SKUID,
            currency: this.Currency,
            price: this.Price,
            price_tier: this.PriceTier,
        };
    }
}

@Entity()
export class SKU extends BaseEntity {
    @PrimaryColumn({ default: "521847234246082599" })
    ID: string;

    @Column({ default: 5 })
    Type: number;

    @Column({ nullable: true })
    DependentSKUID?: string;

    @Column({ default: "521842831262875670" })
    ApplicationID: string;

    @Column({ nullable: true })
    ManifestLabels?: string;

    @Column({ default: 1 })
    AccessType: number;

    @Column({ default: "Nitro" })
    Name: string;

    @Column({ default: false })
    Premium: boolean;

    @Column({ default: "nitro" })
    Slug: string;

    @Column({ default: 68 })
    Flags: number;

    @Column({ default: false })
    ShowAgeGate: boolean;

    @OneToMany(() => Gift, (gift) => gift.SKU)
    Gifts: Gift[];

    Package() {
        return {
            id: this.ID,
            type: this.Type,
            dependent_sku_id: this.DependentSKUID,
            application_id: this.ApplicationID,
            manifest_labels: this.ManifestLabels,
            access_type: this.AccessType,
            name: this.Name,
            features: [],
            release_date: null,
            premium: this.Premium,
            slug: this.Slug,
            flags: this.Flags,
            show_age_gate: this.ShowAgeGate,
        };
    }
}

@Entity()
export class Gift extends BaseEntity {
    @PrimaryColumn()
    Code: string;

    @ManyToOne(() => SKU, (S) => S.Gifts, { eager: true })
    @JoinColumn()
    SKU: SKU;

    @ManyToOne(() => SubscriptionPlan, (S) => S.Gifts, { eager: true })
    @JoinColumn()
    SubscriptionPlan: SubscriptionPlan;

    @Column({ default: "521842831262875670" })
    ApplicationID: string;

    @Column({ default: 0 })
    Uses: number;

    @Column({ default: 1 })
    MaxUses: number;

    @Column({ default: "999-99-99T99:99:99+99:99" })
    ExpiresAt: string;

    @Column({ default: false })
    Redeemed: boolean;

    @ManyToOne(() => User, (U) => U.Gifts, { eager: true })
    User: User;

    @Column({ default: "521848044908576803" })
    StoreListingID: string;

    @Column({ default: 5 })
    Type: number;

    Package() {
        return {
            code: this.Code,
            sku_id: this.SKU.ID,
            application_id: this.ApplicationID,
            uses: this.Uses,
            max_uses: this.MaxUses,
            expires_at: this.ExpiresAt,
            redeemed: this.Redeemed,
            user: this.User.PackagePublic(),
            store_listing: {
                id: this.StoreListingID,
                summary: " ",
                sku: this.SKU.Package(),
                thumbnail: {
                    id: "633877574094684160",
                    size: 148981,
                    mime_type: "image/png",
                    width: 556,
                    height: 316,
                },
            },
            subscription_plan_id: this.SubscriptionPlan.ID,
            subscription_plan: this.SubscriptionPlan.Package(),
        };
    }
}
