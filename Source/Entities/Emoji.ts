import { BaseEntity, Column, Entity, JoinTable, ManyToOne, PrimaryColumn } from "typeorm";
import { User } from "./User";
import { Guild } from "./Guild";

@Entity()
export class CustomEmoji extends BaseEntity {
    @PrimaryColumn()
        ID: string;

    @Column()
        Name: string;

    @ManyToOne(() => Guild, (G) => G.Emojis, {})
        Guild: Guild;

    @ManyToOne(() => User, (U) => U.UploadedEmojis, {})
    @JoinTable()
        Author: User;

    @Column({ default: false })
        Animated: boolean;
    
    Package(IncludeUser = false)
    {
        return {
            id: this.ID,
            name: this.Name,
            user: IncludeUser ? this.Author.PackageSmall() : undefined,
            roles: [],
            require_colons: true,
            managed: false,
            animated: this.Animated,
            available: true
        };
    }
}