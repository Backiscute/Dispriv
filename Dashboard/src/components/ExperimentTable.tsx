import { IConvertedExperiment, IExperimentFilter } from "@/classes/ExperimentInterfaces";
import { useState } from "react";

function ExperimentRollouts({ exp, conf }: { exp: IConvertedExperiment, conf: IExperimentFilter[] }) {
    const Filters = conf.filter(x => x.ExperimentHash === exp.CalculatedHash);
    const Treatments = exp.Treatments;
    return <td style={{ width: "30%" }}>
        {
            Treatments.map((Tr, i) => <a>[{exp.Buckets[i]}] {Tr}<br /></a>)
        }
    </td>;
}

export default function ExperimentTable({ experiments, config, style, selectedType, editExperimentHook }: { experiments: IConvertedExperiment[], config: IExperimentFilter[], style?: React.CSSProperties, selectedType: "guild" | "user", editExperimentHook: React.Dispatch<React.SetStateAction<{ exp: IConvertedExperiment; filt: IExperimentFilter[]; } | undefined>> }) {
    if (experiments.length === 0)
        return <></>;

    const [isHidden, setIsHidden] = useState<boolean>(true);
    const [filter, setFilter] = useState<string>("");

    const St = { fontFamily: "\"gg sans\", sans-serif" };
    
    return (
        <div>
            <button onClick={() => setIsHidden(!isHidden)}>{isHidden ? "Show" : "Hide"}</button>
            {
                !isHidden ? (
                    <div>
                        <input type="text" style={{ marginTop: 10, height: 20, width: 350 }} placeholder="Filter by display name..." onChange={(e) => {
                            e.preventDefault();
                            setFilter(e.target.value.toLowerCase());
                        }} />
                        <table style={{ ...style, width: "100%" }}>
                            <thead>
                                <th style={St}>Internal Name</th>
                                <th style={St}>Display Name</th>
                                <th style={St}>Rollout Details</th>
                                <th style={St}>Details</th>
                            </thead>
                            <tbody>
                                {
                                    experiments.filter(x => x.Type === selectedType).filter(x => x.ReadableName.toLowerCase().includes(filter)).map(Exp => {
                                        return <tr>
                                            <td style={{ width: "25%" }}>{Exp.HashableName}</td>
                                            <td style={{ width: "30%" }}>{Exp.ReadableName}</td>
                                            {/* <a style={{ color: "lime" }}>Control: 0%</a><br /><a style={{ color: "red" }}>Treatment 1: 100%</a> */}
                                            <ExperimentRollouts exp={Exp} conf={config}/>
                                            <td>
                                                <button style={{ display: "block", margin: "auto" }} onClick={() => editExperimentHook({ exp: Exp, filt: config })}>Edit</button>
                                            </td>
                                        </tr>;
                                    })
                                }
                            </tbody>
                        </table>
                    </div>
                ) : <></>
            }
        </div>
    );
}