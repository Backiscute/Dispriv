/* eslint-disable */
import { BaseEntity, Entity, PrimaryColumn, Column } from 'typeorm';
import { User } from './User';
@Entity()
export class Team extends BaseEntity {
  @PrimaryColumn()
  ID: string;

  @Column({ length: 32 })
  Name: string;

  @Column({ type: "simple-json", nullable: true })
  Owner?: User;

  Package() {
    return {
        id: this.ID,
        name: this.Name,
        icon: null,
        owner_user_id: this.Owner ? this.Owner.ID : null
    }
  }

  PackageTeamUser() {
    return {
        id: this.ID,
        username: "team" + this.ID,
        global_name: null,
        display_name: null,
        avatar: null,
        discriminator: "0000",
        public_flags: 1024,
        flags: 1024,
        avatar_decoration: null
    }
  }
}