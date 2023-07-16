import { IConvertedExperiment, IExperimentFilter } from "@/classes/ExperimentInterfaces";
import { useState } from "react";

export function ExperimentRollouts({ exp, conf }: { exp: IConvertedExperiment; conf: IExperimentFilter[] }) {
    const Filters = conf.filter((x) => x.ExperimentHash === exp.CalculatedHash);
    const Treatments = exp.Treatments;
    let MostChanceToBeActivated: {
        idx: number,
        percentage: number
    } = {
        idx: -1000,
        percentage: -1
    };

    const ContainFilters: number[] = [];

    for (const Filt of Filters) {
        const Treatment = Treatments[exp.Buckets.indexOf(Filt.Bucket)];
        console.log(Treatment, Filt);

        if (Filt.Properties?.Percentage !== undefined) {
            const Percent = Filt.Properties.Percentage.e - Filt.Properties.Percentage.s;
            if (Percent > MostChanceToBeActivated.percentage)
                MostChanceToBeActivated = {
                    idx: Treatments.indexOf(Treatment),
                    percentage: Percent
                };
        }

        if (!Filt.AffectsEveryone && Filt.TargetedUsers.length !== 0)
            ContainFilters.push(Treatments.indexOf(Treatment));
    }

    return <>
        {
            Treatments.map((Tr, i) => <a key={i}><span style={{ color: i === MostChanceToBeActivated.idx ? "#23a55a" : ContainFilters.includes(i) ? "yellow" : "#da373c" }}>[{exp.Buckets[i]}]</span> {Tr}<br /></a>)
        }
    </>;
}

export default function ExperimentTable({
    experiments,
    config,
    style,
    selectedType,
    editExperimentHook,
}: {
    experiments: IConvertedExperiment[];
    config: IExperimentFilter[];
    style?: React.CSSProperties;
    selectedType: "guild" | "user";
    editExperimentHook: React.Dispatch<
        React.SetStateAction<{ exp: IConvertedExperiment; filt: IExperimentFilter[] } | undefined>
    >;
}) {
    if (experiments.length === 0) return <></>;

    const [isHidden, setIsHidden] = useState<boolean>(true);
    const [filter, setFilter] = useState<string>("");

    // const St = { fontFamily: '"gg sans Medium", sans-serif', fontWeight: "normal" } as React.CSSProperties;

    return (
        <div>
            <button onClick={() => setIsHidden(!isHidden)}>{isHidden ? "Show" : "Hide"}</button>
            {!isHidden ? (
                <div>
                    <input
                        type="text"
                        style={{ marginTop: 10, height: 20, width: 350 }}
                        placeholder="Filter by display name..."
                        onChange={(e) => {
                            e.preventDefault();
                            setFilter(e.target.value.toLowerCase());
                        }}
                    />
                    <table className="experiment-table" style={{ ...style, width: "100%" }}>
                        <thead>
                            <th>Internal Name</th>
                            <th>Display Name</th>
                            <th>Rollout Details</th>
                            <th>Details</th>
                        </thead>
                        <tbody>
                            {experiments
                                .filter((x) => x.Type === selectedType)
                                .filter((x) => x.ReadableName.toLowerCase().includes(filter))
                                .map((Exp) => {
                                    return (
                                        <tr key={Exp.CalculatedHash}>
                                            <td style={{ width: "25%" }}>{Exp.HashableName}</td>
                                            <td style={{ width: "30%" }}>{Exp.ReadableName}</td>
                                            {/* <a style={{ color: "lime" }}>Control: 0%</a><br /><a style={{ color: "red" }}>Treatment 1: 100%</a> */}
                                            <td>
                                                <ExperimentRollouts exp={Exp} conf={config}/>
                                            </td>
                                            <td style={{ width: 60 }}>
                                                <button
                                                    style={{ display: "block", margin: "auto" }}
                                                    onClick={() => editExperimentHook({ exp: Exp, filt: config })}
                                                >
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <></>
            )}
        </div>
    );
}
