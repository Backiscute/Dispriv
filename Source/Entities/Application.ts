/* eslint-disable */
import { BaseEntity, Entity, PrimaryColumn, Column, ManyToOne, PrimaryGeneratedColumn, OneToOne } from 'typeorm';
import { ApplicationFlags } from "../Classes/Flags";
import { User } from './User';
import { Team } from './ApplicationTeam';

@Entity()
export class EmbeddedAppConfig extends BaseEntity {
  @PrimaryGeneratedColumn()
  ID: string;

  @Column({ default: -1 })
  MaxParticipants: number;

  @Column({ default: false })
  IsEighteenPlus: boolean;

  @Column({ nullable: true })
  NeedsNitro?: number;

  @Column({ nullable: true })
  FreePeriodStarts?: string; // date?

  @Column({ nullable: true })
  FreePeriodEnds?: string; // date?

  @Column({ nullable: true })
  ActivityPreviewVideoID?: string;

  @Column('simple-array', { nullable: true })
  SupportsPlatforms: string[];

  @Column({ default: 0 })
  DefaultOrientation: number;

  @Column({ default: 0 })
  TabletDefaultOrientation: number;

  @Column({ default: 0 })
  ShelfPriority: number;
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

  @ManyToOne(() => User, U => U.Applications, { eager: true, nullable: true })
  Owner?: User;

  @ManyToOne(() => Team, T => T.Applications, { eager: true, nullable: true })
  Team?: Team;

  @OneToOne(() => User, U => U.BotApplication, { nullable: true })
  Bot?: User;

  @Column({ default: -1, nullable: true })
  EmbeddedParticipants: number;

  @Column({ type: "simple-json", nullable: true })
  EmbeddedConfig?: EmbeddedAppConfig;


  HasFlag(Flag: ApplicationFlags) {
    return (this.Flags & Flag) === Flag;
  }

  Package() {
    let EmbeddedAppConfig = undefined;
    if (this.HasFlag(ApplicationFlags.EMBEDDED_IN_CLIENT)) EmbeddedAppConfig = {embedded_activity_config: this.EmbeddedConfig};

    return {
        id: this.ID,
        name: this.DisplayName,
        icon: this.IconHash,
        description: this.Description,
        summary: this.Summary,
        hook: this.IsHook,
        verify_key: null,
        owner: this.Team != null ? this.Team.PackageTeamUser() : this.Owner.PackagePublic(),
        publishers: this.Publishers,
        developers: this.Developers,
        flags: this.Flags,
        redirect_uris: this.RedirectURIs,
        rpc_application_state: this.RPCAppState,
        store_application_state: this.StoreAppState,
        creator_monetization_state: this.CreatorMonetizationState,
        verification_state: this.VerificationState,
        interactions_endpoint_url: this.InteractionsEndpoint,
        interactions_event_types: this.InteractionEventTypes,
        interactions_version: this.InteractionsVersion,
        integration_public: this.IsIntegrationPublic,
        integration_require_code_grant: this.IntegrationRequiresCodeGrant,
        discoverability_state: this.DiscoverabilityState,
        discovery_eligibility_flags: this.DiscoveryFlags,
        role_connections_verification_url: this.RoleConnectionsURL,
        privacy_policy_url: this.PrivacyPolicy,
        terms_of_service_url: this.TermsOfService,
        bot: this.Bot?.PackagePublic(),
        tags: this.UserTags,
        max_participants: this.EmbeddedParticipants,
        ...EmbeddedAppConfig
    }
  }

  PackagePublic() {
    let EmbeddedAppConfig = undefined;
    if (this.HasFlag(ApplicationFlags.EMBEDDED_IN_CLIENT) && this.EmbeddedConfig) EmbeddedAppConfig = {embedded_activity_config: this.EmbeddedConfig};

    return {
        id: this.ID,
        name: this.DisplayName,
        icon: this.IconHash,
        description: this.Description,
        summary: this.Summary,
        type: null,
        cover_image: null,
        hook: this.IsHook,
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
        ...EmbeddedAppConfig
    }
  }
}