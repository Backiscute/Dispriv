/* eslint-disable */
import { BaseEntity, Entity, PrimaryColumn, Column, ManyToOne, OneToMany, ManyToMany, JoinTable, PrimaryGeneratedColumn } from 'typeorm';
import { ApplicationFlags } from "../Classes/Flags";
import { User } from './User';
import { Team } from './ApplicationTeam';

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

  @Column('simple-array', { nullable: true })
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
  id: string;

  @Column({ length: 32 })
  name: string;
  
  @Column({ nullable: true })
  icon?: string;

  @Column({ length: 200, nullable: true })
  description: string;

  @Column({ length: 200, nullable: true })
  summary: string;

  @Column({ default: true })
  hook: boolean;

  @Column({ default: ApplicationFlags.NONE })
  flags: ApplicationFlags;

  @Column({ type: "simple-array", nullable: true })
  publishers?: object[];

  @Column({ type: "simple-array", nullable: true })
  developers?: object[];

  @Column({ type: "simple-array", nullable: true })
  redirect_uris?: string[];

  @Column({ default: 0 })
  rpc_application_state: number;

  @Column({ default: 1 })
  store_application_state: number;

  @Column({ default: 1 })
  creator_monetization_state: number;

  @Column({ default: 1 })
  verification_state: number;
  
  @Column({ nullable: true })
  interactions_endpoint_url: string;

  @Column({ type: "simple-array", nullable: true })
  interactions_event_types?: string[];

  @Column({ default: 1 })
  interactions_version: number;

  @Column({ default: true })
  integration_public: boolean;

  @Column({ default: false })
  integration_require_code_grant: boolean;

  @Column({ default: 1 })
  discoverability_state: number;

  @Column({ default: 2240 })
  discovery_eligibility_flags: number;

  @Column({ nullable: true })
  role_connections_verification_url?: string;

  @Column({ type: "simple-array", nullable: true })
  tags?: string[];

  @Column({ nullable: true })
  privacy_policy_url?: string;

  @Column({ nullable: true })
  terms_of_service_url?: string;

  @ManyToOne(() => User, U => U.Applications, { eager: true, nullable: true })
  Owner?: User;

  @Column({ type: "simple-json", nullable: true })
  Team?: Team;

  @Column({ type: "simple-json", nullable: true })
  Bot?: User;

  @Column({ default: -1, nullable: true })
  max_participants: number;

  @Column({ type: "simple-json", nullable: true })
  embedded_activity_config?: EmbeddedAppConfig;


  HasFlag(Flag: ApplicationFlags) {
    return (this.flags & Flag) === Flag;
  }

  Package() {
    let EmbeddedAppConfig = undefined;
    if (this.HasFlag(ApplicationFlags.EMBEDDED_IN_CLIENT)) EmbeddedAppConfig = {embedded_activity_config: this.embedded_activity_config};

    return {
        id: this.id,
        name: this.name,
        icon: this.icon,
        description: this.description,
        summary: this.summary,
        hook: this.hook,
        verify_key: null,
        owner: this.Team != null ? this.Team.PackageTeamUser() : this.Owner.PackagePublic(),
        publishers: this.publishers,
        developers: this.developers,
        flags: this.flags,
        redirect_uris: this.redirect_uris,
        rpc_application_state: this.rpc_application_state,
        store_application_state: this.store_application_state,
        creator_monetization_state: this.creator_monetization_state,
        verification_state: this.verification_state,
        interactions_endpoint_url: this.interactions_endpoint_url,
        interactions_event_types: this.interactions_event_types,
        interactions_version: this.interactions_version,
        integration_public: this.integration_public,
        integration_require_code_grant: this.integration_require_code_grant,
        discoverability_state: this.discoverability_state,
        discovery_eligibility_flags: this.discovery_eligibility_flags,
        role_connections_verification_url: this.role_connections_verification_url,
        privacy_policy_url: this.privacy_policy_url,
        terms_of_service_url: this.terms_of_service_url,
        bot: this.Bot?.PackagePublic(),
        tags: this.tags,
        max_participants: this.max_participants,
        ...EmbeddedAppConfig
    }
  }

  PackagePublic() {
    let EmbeddedAppConfig = undefined;
    if (this.HasFlag(ApplicationFlags.EMBEDDED_IN_CLIENT) && this.embedded_activity_config) EmbeddedAppConfig = {embedded_activity_config: this.embedded_activity_config};

    return {
        id: this.id,
        name: this.name,
        icon: this.icon,
        description: this.description,
        summary: this.summary,
        type: null,
        cover_image: null,
        hook: this.hook,
        bot_public: this.integration_public,
        bot_require_code_grant: this.integration_require_code_grant,
        terms_of_service_url: null,
        privacy_policy_url: this.privacy_policy_url,
        verify_key: null,
        publishers: this.publishers,
        developers: this.developers,
        flags: this.flags,
        tags: this.tags,
        max_participants: this.max_participants,
        ...EmbeddedAppConfig
    }
  }
}