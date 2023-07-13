import { IConvertedExperiment, IExperimentFilter } from "@/classes/ExperimentInterfaces";

function ExperimentRollouts({ exp, conf }: { exp: IConvertedExperiment, conf: IExperimentFilter[] }) {
    const Filters = conf.filter(x => x.ExperimentHash === exp.CalculatedHash);
    const Treatments = exp.Treatments;
    return <td style={{ width: "30%" }}>
        {
            Treatments.map((Tr, i) => <a>[{exp.Buckets[i]}] {Tr}<br /></a>)
        }
    </td>;
}

export default function ExperimentTable({ experiments, config, style }: { experiments: IConvertedExperiment[], config: IExperimentFilter[], style?: React.CSSProperties }) {
    if (experiments.length === 0)
        return <></>;
    
    return (
        <table style={{ ...style, width: "100%" }}>
            <tr>
                <th style={{ fontFamily: "\"gg sans\", sans-serif" }}>Internal Name</th>
                <th style={{ fontFamily: "\"gg sans\", sans-serif" }}>Display Name</th>
                <th style={{ fontFamily: "\"gg sans\", sans-serif" }}>Rollout Details</th>
                <th style={{ fontFamily: "\"gg sans\", sans-serif" }}>Details</th>
            </tr>
            {
                experiments.map(Exp => {
                    return <tr>
                        <td style={{ width: "30%" }}>{Exp.HashableName}</td>
                        <td style={{ width: "30%" }}>{Exp.ReadableName}</td>
                        {/* <a style={{ color: "lime" }}>Control: 0%</a><br /><a style={{ color: "red" }}>Treatment 1: 100%</a> */}
                        <ExperimentRollouts exp={Exp} conf={config}/>
                        <td>
                            <button style={{ width: "100%" }}>Edit Rollouts</button>
                        </td>
                    </tr>;
                })
            }
        </table>
    );
}