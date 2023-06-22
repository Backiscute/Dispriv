import { BaseEntity, Column, Entity, JoinTable, ManyToOne, PrimaryColumn } from "typeorm";
import { DiscordApplication } from "./Application";
import { User } from "./User";

@Entity()
export class OAuth2App extends BaseEntity {
    @PrimaryColumn()
        ID: string;

    @ManyToOne(() => DiscordApplication, (D) => D.OAuth2Clients, {})
        Application: DiscordApplication;

    @Column({ type: "simple-array" })
        Scopes: string[];

    @ManyToOne(() => User, (U) => U.AuthorizedApps, {})
    @JoinTable()
        AuthorizedUsers: User;
    
    Package(IncludeUser = false)
    {
        return {
            id: this.ID,
            scopes: this.Scopes,
            application: this.Application.PackagePublic(),
            user: IncludeUser ? this.AuthorizedUsers.PackagePublic() : undefined,
            expires: "9999-01-01T02:00:00.849000+00:00"
        };
    }
}