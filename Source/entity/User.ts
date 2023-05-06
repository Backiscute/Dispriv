/* eslint-disable */
import { Entity, PrimaryColumn, Column, BaseEntity } from 'typeorm';
import {classToPlain, instanceToPlain} from "class-transformer";

export default abstract class AppBaseEntity extends BaseEntity {
    toJSON(): {} {
        return instanceToPlain(this);
    }
}

@Entity()
export class User extends AppBaseEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  username: string;

  @Column({ nullable: true })
  display_name: string;

  @Column()
  password: string;

  @Column()
  date_of_birth: string;
  
  @Column({ default: "0000" })
  discriminator: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  avatar_decoration: string;

  @Column({ nullable: true, default: false })
  bot: boolean;

  @Column({ nullable: true, default: false })
  system: boolean;

  @Column({ nullable: true, default: false })
  mfa_enabled: boolean;

  @Column({ nullable: true })
  banner: string;

  @Column({ nullable: true })
  banner_color: string;

  @Column({ nullable: true })
  accent_color: number;

  @Column({ nullable: true })
  locale: string;

  @Column({ nullable: true, default: true }) // no email verfication
  verified: boolean;

  @Column({ nullable: true, default: true })
  mobile: boolean;

  @Column({ nullable: true, default: true })
  desktop: boolean;

  @Column({ nullable: true, default: true })
  nsfw_allowed: boolean;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true, default: "" })
  phone: string;

  @Column({ default: "" })
  bio: string;

  @Column({ nullable: true })
  global_name: string;

  @Column({ nullable: true, default: true })
  premium: boolean;

  @Column({ nullable: true, default: 0 })
  flags: number;

  @Column({ nullable: true, default: 0 })
  premium_type: number;

  @Column({ nullable: true, default: 0 })
  public_flags: number;

  @Column({ nullable: true, default: 0 })
  premium_usage_flags: number;
}