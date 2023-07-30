import {
    BaseEntity,
    Entity,
    PrimaryColumn,
    Column,
    ManyToOne,
    PrimaryGeneratedColumn,
    OneToOne,
    JoinTable,
    OneToMany,
    JoinColumn,
} from "typeorm";
import { ApplicationFlags } from "../Classes/Flags";
import { User } from "./User";
import { Team } from "./ApplicationTeam";
import { OAuth2App } from "./OAuth2";
import { Integration } from "./Integration";
import { SlashCommand } from "./SlashCommand";

@Entity()
export class EmbeddedAppConfig extends BaseEntity {
    @PrimaryGeneratedColumn()
        ID: string;

    @Column({ default: -1 })
        max_participants: number;

    @Column({ default: false })
        requires_age_gate: boolean;

    @Column({ nullable: true })
        premium_tier_requirement?: number;

    @Column({ nullable: true })
        free_period_starts_at?: string;

    @Column({ nullable: true })
        free_period_ends_at?: string;

    @Column({ nullable: true })
        activity_preview_video_asset_id?: string;

    @Column("simple-array", { nullable: true })
        supported_platforms: string[];

    @Column({ default: 0 })
        default_orientation_lock_state: number;

    @Column({ default: 0 })
        tablet_default_orientation_lock_state: number;

    @Column({ default: 0 })
        shelf_rank: number;
}

@Entity()
export class DiscordApplication extends BaseEntity {
    @PrimaryColumn()
        ID: string;

    @Column({ length: 32 })
        DisplayName: string;

    @Column({ nullable: true })
        IconHash?: string;

    @Column({ length: 200, nullable: true })
        Description: string;

    @Column({ length: 200, nullable: true })
        Summary: string;

    @Column({ default: true })
        IsHook: boolean;

    @Column({ default: ApplicationFlags.NONE })
        Flags: ApplicationFlags;

    @Column({ type: "simple-array", nullable: true })
        Publishers?: object[];

    @Column({ type: "simple-array", nullable: true })
        Developers?: object[];

    @Column({ type: "simple-array", nullable: true })
        RedirectURIs?: string[];

    @Column({ default: 0 })
        RPCAppState: number;

    @Column({ default: 1 })
        StoreAppState: number;

    @Column({ default: 1 })
        CreatorMonetizationState: number;

    @Column({ default: 1 })
        VerificationState: number;

    @Column({ nullable: true })
        InteractionsEndpoint: string;

    @Column({ type: "simple-array", nullable: true })
        InteractionEventTypes?: string[];

    @Column({ default: 1 })
        InteractionsVersion: number;

    @Column({ default: true })
        IsIntegrationPublic: boolean;

    @Column({ default: false })
        IntegrationRequiresCodeGrant: boolean;

    @Column({ default: 1 })
        DiscoverabilityState: number;

    @Column({ default: 2240 })
        DiscoveryFlags: number;

    @Column({ nullable: true })
        RoleConnectionsURL?: string;

    @Column({ type: "simple-array", nullable: true })
        UserTags?: string[];

    @Column({ nullable: true })
        PrivacyPolicy?: string;

    @Column({ nullable: true })
        TermsOfService?: string;

    @Column({ default: true })
        PublicBot: boolean;

    @Column({ default: false })
        BotRequireCodeGrant: boolean;

    @ManyToOne(() => User, (U) => U.Applications, { eager: true, nullable: true })
    @JoinColumn()
        Owner?: User;

    @ManyToOne(() => Team, (T) => T.Applications, { eager: true, nullable: true })
    @JoinColumn()
        Team?: Team;

    @OneToOne(() => User, (U) => U.BotApplication, { nullable: true })
    @JoinColumn()
        Bot?: User;
    
    @OneToMany(() => OAuth2App, (U) => U.Application, {})
    @JoinTable()
        OAuth2Clients?: OAuth2App[];

    @OneToMany(() => Integration, (I) => I.Application, {})
    @JoinTable()
        LinkedIntegrations?: Integration[];

    @OneToMany(() => SlashCommand, (SC) => SC.LinkedApplication, { orphanedRowAction: "delete" })
    @JoinTable()
        SlashCommands: SlashCommand[];

    @Column({ default: -1, nullable: true })
        EmbeddedParticipants: number;

    @Column({ type: "simple-json", nullable: true })
        embedded_activity_config?: EmbeddedAppConfig;

    HasFlag(Flag: ApplicationFlags) {
        return (this.Flags & Flag) === Flag;
    }

    Package() {
        let EmbeddedAppConfig = undefined;
        if (this.HasFlag(ApplicationFlags.EMBEDDED_IN_CLIENT))
            EmbeddedAppConfig = { embedded_activity_config: this.embedded_activity_config };
        return {
            id: this.ID,
            name: this.DisplayName,
            icon: this.IconHash,
            description: this.Description,
            summary: this.Summary,
            hook: this.IsHook,
            verify_key: null,
            bot_public: this.PublicBot,
            bot_require_code_grant: this.BotRequireCodeGrant,
            bot: this.Bot ? this.Bot.PackageSmall() : null,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            owner: this.Team != null ? this.Team.PackageTeamUser() : this.Owner!.PackagePublic(),
            publishers: this.Publishers,
            developers: this.Developers,
            flags: this.Flags,
            redirect_uris: this.RedirectURIs ?? [],
            rpc_application_state: this.RPCAppState,
            store_application_state: this.StoreAppState,
            creator_monetization_state: this.CreatorMonetizationState,
            verification_state: this.VerificationState,
            interactions_endpoint_url: this.InteractionsEndpoint,
            interactions_event_types: this.InteractionEventTypes ?? [],
            interactions_version: this.InteractionsVersion,
            integration_public: this.IsIntegrationPublic,
            integration_require_code_grant: this.IntegrationRequiresCodeGrant,
            discoverability_state: this.DiscoverabilityState,
            discovery_eligibility_flags: this.DiscoveryFlags,
            role_connections_verification_url: this.RoleConnectionsURL,
            privacy_policy_url: this.PrivacyPolicy,
            terms_of_service_url: this.TermsOfService,
            tags: this.UserTags,
            max_participants: this.EmbeddedParticipants,
            ...EmbeddedAppConfig,
        };
    }

    PackagePublic() {
        let EmbeddedAppConfig = undefined;
        if (this.HasFlag(ApplicationFlags.EMBEDDED_IN_CLIENT) && this.embedded_activity_config)
        {
            const Kys = this.embedded_activity_config;
            // add new json object to the package

            const Fr = {"client_platform_config": {
                "web": {
                    "label_type": 0,
                    "label_until": null,
                    "release_phase": "global_launch"
                },
                "ios": {
                    "label_type": 0,
                    "label_until": null,
                    "release_phase": "global_launch"
                },
                "android": {
                    "label_type": 0,
                    "label_until": null,
                    "release_phase": "global_launch"
                }
            }};

            const ForReal = {...Kys, ...Fr};

            EmbeddedAppConfig = { embedded_activity_config: ForReal};
        }

        return {
            id: this.ID,
            name: this.DisplayName,
            icon: this.IconHash,
            description: this.Description ?? "",
            summary: this.Summary,
            type: null,
            cover_image: null,
            hook: this.IsHook,
            bot: this.Bot ? this.Bot.PackageSmall() : null,
            bot_public: this.IsIntegrationPublic,
            bot_require_code_grant: this.IntegrationRequiresCodeGrant,
            terms_of_service_url: null,
            privacy_policy_url: this.PrivacyPolicy,
            verify_key: null,
            publishers: this.Publishers,
            developers: this.Developers,
            flags: this.Flags,
            tags: this.UserTags,
            max_participants: this.EmbeddedParticipants,
            ...EmbeddedAppConfig,
        };
    }
}
