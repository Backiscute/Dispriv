import { GuildFilterType, IConvertedExperiment, IExperimentFilter } from "@/classes/ExperimentInterfaces";
import { ExperimentRollouts } from "@/components/ExperimentTable";
import { Save } from "@/pages/Experiments";
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { stringify } from "yaml";

function TempSave(filters: IExperimentFilter[]) {
    writeFileSync(join("..", "Configs", "ExperimentConfig.yaml"), stringify(filters));
}

export default function ExperimentEditor({ exp, filters, editExperimentHook }: { exp: IConvertedExperiment, filters: IExperimentFilter[], editExperimentHook: React.Dispatch<React.SetStateAction<{ exp: IConvertedExperiment; filt: IExperimentFilter[]; } | undefined>> }) {
    return <>
        <div className="data-box" style={{ width: "23.5%", borderRadius: 10, maxHeight: "unset" }}>
            <h1 style={{ // this a h1 but i overrode almost all defining h1 props :fire:
                display: "block",
                margin: "35px",
                textAlign: "center",
                fontSize: "24px",
                fontFamily: "var(--discord-font-primary)",
                fontWeight: "normal",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
            }}>{exp.HashableName}</h1>
            <div style={{
                borderRadius: "8px",
                padding: "10px",
                backgroundColor: "var(--discord-background-secondary)",
            }}>
                <p className="dataHeader">Display name</p>
                <span>{exp.ReadableName}</span>
                <br/><br/>
                <p className="dataHeader">Treatments</p>
                <ExperimentRollouts exp={exp} conf={filters}/>
                <br/>
                <p className="dataHeader">Quick actions</p>
                <span>
                    {
                        exp.Buckets.map((x, i) => (
                            <button onClick={() => {
                                const Filters = filters;
                                Filters.push({
                                    ExperimentHash: exp.CalculatedHash,
                                    AffectsEveryone: true,
                                    TargetedGuilds: [],
                                    TargetedUsers: [],
                                    Bucket: x,
                                    Properties: {
                                        Percentage: {
                                            s: 0,
                                            e: 100
                                        }
                                    }
                                });
                                console.log(stringify(Filters));
                                TempSave(Filters);
                            }}
                            style={{
                                marginTop: "5px",
                                width: "100%"
                            }}>Enable "{exp.Treatments[i]}" for Everyone</button>
                        ))
                    }
                </span>
            </div>
        </div>
    </>;
}