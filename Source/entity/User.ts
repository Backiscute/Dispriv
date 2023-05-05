/* eslint-disable */
import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class User {
  @PrimaryColumn()
  id: string;

  @Column()
  username: string;

  @Column()
  discriminator: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  bot: boolean;

  @Column({ nullable: true })
  system: boolean;

  @Column({ nullable: true })
  mfa_enabled: boolean;

  @Column({ nullable: true })
  banner: string;

  @Column({ nullable: true })
  accent_color: number;

  @Column({ nullable: true })
  locale: string;

  @Column({ nullable: true })
  verified: boolean;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  flags: number;

  @Column({ nullable: true })
  premium_type: number;

  @Column({ nullable: true })
  public_flags: number;
}