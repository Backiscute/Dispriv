/* eslint-disable */
import { BaseEntity, Entity, PrimaryColumn, Column, ManyToOne, ManyToMany, JoinTable } from 'typeorm';
import { UserFlags } from "../Classes/Flags";
import { Message } from "./Message";
import { FriendUser } from './FriendUser';

@Entity()
export class User extends BaseEntity {
  @PrimaryColumn()
  ID: string;

  @Column({ length: 32 })
  Username: string;

  @Column({ length: 4 })
  Discriminator: string;

  @Column()
  Email: string;

  @Column()
  Password: string;

  @Column({ length: 200 })
  Bio: string;

  @Column()
  DateOfBirth: Date;

  @Column({ nullable: true })
  AvatarID?: string;

  @Column({ nullable: true })
  BannerID?: string;

  @Column({ nullable: true })
  AvatarDecoration?: string;

  @Column({ nullable: true })
  BannerColor?: string;

  @Column({ default: UserFlags.VERIFIED_EMAIL })
  Flags: UserFlags;

  @ManyToOne(() => Message, M => M.Author)
  MessagesByUser: Message[];

  Package() {
    return {
      accent_color: null,
      avatar: null,
      avatar_decoration: null,
      banner: null,
      banner_color: null,
      bio: this.Bio,
      desktop: true,
      discriminator: this.Discriminator,
      display_name: this.Username,
      email: this.Email,
      flags: 0,
      global_name: this.Username,
      id: this.ID,
      mfa_enabled: true,
      mobile: true,
      nsfw_allowed: true,
      phone: "phone number priv when",
      premium: true,
      premium_type: 2,
      premium_usage_flags: 0,
      public_flags: this.Flags,
      purchased_flags: 3, // get me this
      username: this.Username, // can u do this.Username fr
      verified: true
    }
  }

  PackagePublic() {
    return {
      accent_color: null,
      avatar: null,
      avatar_decoration: null,
      banner: null,
      banner_color: null,
      bio: this.Bio,
      discriminator: this.Discriminator,
      display_name: this.Username,
      flags: 0,
      global_name: this.Username,
      id: this.ID,
      public_flags: this.Flags,
      username: this.Username
    }
  }

}