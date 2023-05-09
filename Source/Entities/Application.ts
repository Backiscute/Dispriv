/* eslint-disable */
import { BaseEntity, Entity, PrimaryColumn, Column, ManyToOne, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { ApplicationFlags } from "../Classes/Flags";
import { User } from './User';
import { Team } from './ApplicationTeam';
@Entity()
export class DiscordApplication extends BaseEntity {
  @PrimaryColumn()
  ID: string;

  @Column({ length: 32 })
  Name: string;

  @Column({ length: 200, nullable: true })
  Description: string;

  @Column({ length: 200, nullable: true })
  Summary: string;

  @Column({ default: true })
  Hook: boolean;

  @Column({ default: ApplicationFlags.NONE })
  Flags: ApplicationFlags;

  @ManyToOne(() => User, U => U.Applications, { eager: true, nullable: true })
  Owner?: User;

  @Column({ type: "simple-json", nullable: true })
  Team?: Team;

  @Column({ type: "simple-json", nullable: true })
  Bot?: User;

  HasFlag(Flag: ApplicationFlags) {
    return (this.Flags & Flag) === Flag;
  }

  Package() {
    return {
        id: this.ID,
        name: this.Name,
        icon: null,
        description: this.Description,
        summary: this.Summary,
        hook: this.Hook,
        verify_key: null,
        owner: this.Team != null ? this.Team.PackageTeamUser() : this.Owner.PackagePublic(),
        publishers: [],
        developers: [],
        flags: this.Flags,
        redirect_uris: [],
        rpc_application_state: 0,
        store_application_state: 1,
        creator_monetization_state: 1,
        verification_state: 1,
        interactions_endpoint_url: null,
        interactions_event_types: [],
        interactions_version: 1,
        integration_public: true,
        integration_require_code_grant: false,
        discoverability_state: 1,
        discovery_eligibility_flags: 2240,
        role_connections_verification_url: null,
        bot: this.Bot?.PackagePublic(),
        tags: []
    }
  }

  PackagePublic() {
    return {
        id: this.ID,
        name: this.Name,
        icon: null,
        description: this.Description,
        summary: this.Summary,
        type: null,
        cover_image: null,
        hook: this.Hook,
        bot_public: false,
        bot_require_code_grant: false,
        terms_of_service_url: null,
        privacy_policy_url: null,
        verify_key: null,
        publishers: [],
        developers: [],
        flags: this.Flags,
        tags: []
    }
  }
}