import { BaseEntity, BeforeInsert, Column, Entity, JoinTable, ManyToOne, PrimaryColumn } from "typeorm";
import { Membership } from "./User";
import { DiscordApplication } from "./Application";
import { SendToMembers } from "../Modules/DiscordUtils";
import { OpCodes } from "../Classes/GatewayOpCodes";
import { Guild } from "./Guild";

@Entity()
export class Integration extends BaseEntity {
    @PrimaryColumn()
        ID: string;

    @ManyToOne(() => DiscordApplication, (A) => A.LinkedIntegrations, {})
    @JoinTable()
        Application: DiscordApplication;

    @Column({ type: "simple-array" })
        Scopes: string[];

    @ManyToOne(() => Membership, (M) => M.AddedIntegrations, {})
    @JoinTable()
        AddedBy: Membership;

    @ManyToOne(() => Guild, (G) => G.Integrations, {})
    @JoinTable()
        OwnerGuild: Guild;

    @Column({ default: true })
        Enabled: boolean;

    @BeforeInsert()
    SendCreateEvent() {
        SendToMembers(this.OwnerGuild.ID, OpCodes.DISPATCH, { guild_id: this.OwnerGuild.ID }, 0, "GUILD_INTEGRATIONS_UPDATE");
        SendToMembers(this.OwnerGuild.ID, OpCodes.DISPATCH, { guild_id: this.OwnerGuild.ID, ...this.Package()}, 0, "INTEGRATION_CREATE");
    }

    Package() {
        return {
            type: "discord",
            id: this.ID,
            enabled: this.Enabled,
            scopes: this.Scopes,
            name: this.Application.DisplayName,
            application: this.Application.PackagePublic(),
            user: this.AddedBy.Owner.PackageSmall()
        };
    }
}