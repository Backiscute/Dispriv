import { BaseEntity, Column, Entity, JoinTable, ManyToMany, PrimaryColumn } from "typeorm";
import { User } from "./User";

@Entity()
export class Badge extends BaseEntity {
	@PrimaryColumn()
	ID: string; // ! NOT A SNOWFLAKE !

	@Column()
	DisplayName: string;

	@Column()
	IconID: string;

	@Column({ nullable: true })
	ToURL: string;

	@ManyToMany(() => User, U => U.Badges, {})
	@JoinTable()
	UsersOwningThis: User[];

	Package() {
		return {
			description: this.DisplayName,
			icon: this.IconID,
			id: this.ID,
			link: this.ToURL
		};
	}
}