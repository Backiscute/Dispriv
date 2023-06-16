import { BaseEntity, Column, Entity, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";

export enum ExperimentPopulationFilterType {
	FEATURE = 1604612045, // what features a guild requires to be eligible
	ID_RANGE = 2404720969, // what the guild id has to be between for it to be eligible
	MEMBER_COUNT = 2918402255, // amount of members required by guild for eligibility,
	ID_LIST = 3013771838, // list of ids eligible
	HUB_TYPE = 4148745523, // probably useless
	VANITY_URL = 188952590, // if it needs vanity invites
	RANGE_BY_HASH = 2294888943 // unknown
}

@Entity()
export class UserExperiment extends BaseEntity {
	@PrimaryColumn()
	ID: string;

	@Column()
	DisplayName: string;

	@Column()
	Version: number;

	@Column()
	Bucket: number;

	@Column()
	Population: number;
}

@Entity()
export class GuildExperiment extends BaseEntity {
	@PrimaryColumn()
	ID: string;

	@Column()
	DisplayName: string;

	@Column()
	Version: number;

	@OneToMany(() => ExperimentPopulation, EP => EP.Experiment)
	Populations: ExperimentPopulation[];
}

@Entity()
export class ExperimentPopulation extends BaseEntity {
	@PrimaryColumn()
	ID: string;

	@ManyToOne(() => GuildExperiment, GE => GE.Populations)
	Experiment: GuildExperiment;

	@OneToMany(() => ExperimentPopulationRange, EPR => EPR.ExperimentPopulation, { eager: true })
	Ranges: ExperimentPopulationRange[];

	@OneToMany(() => ExperimentPopulationFilter, EPF => EPF.ExperimentPopulation, { eager: true })
	Filters: ExperimentPopulationFilter[];
}

@Entity()
export class ExperimentPopulationRange {
	@PrimaryColumn()
	ID: string;

	@Column()
	Bucket: number;

	@Column({ type: "simple-json" })
	Rollouts: { Start: number, End: number }[];

	@ManyToOne(() => ExperimentPopulation, EP => EP.Ranges)
	ExperimentPopulation: ExperimentPopulation;
}

@Entity()
export class ExperimentPopulationFilter {
	@PrimaryColumn()
	ID: string;

	// TODO: finish

	@ManyToOne(() => ExperimentPopulation, EP => EP.Filters)
	ExperimentPopulation: ExperimentPopulation;
}