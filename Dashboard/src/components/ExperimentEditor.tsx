import { IConvertedExperiment, IExperimentFilter } from "@/classes/ExperimentInterfaces";

export default function ExperimentEditor({ exp, filters, editExperimentHook }: { exp: IConvertedExperiment, filters: IExperimentFilter[], editExperimentHook: React.Dispatch<React.SetStateAction<{ exp: IConvertedExperiment; filt: IExperimentFilter[]; } | undefined>> }) {
    return <>
        <button style={{
            width: 100
        }} onClick={() => editExperimentHook(undefined)}>{"<- Back"}</button>
        <div style={{
            borderRadius: "8px",
            margin: "10px 0px 0px 0px",
            padding: "10px",
            backgroundColor: "var(--discord-background-secondary)",
            width: "22.5%"
        }}>
            <h1 style={{ // this a h1 but i overrode almost all defining h1 props :fire:
                display: "block",
                margin: "35px",
                textAlign: "center",
                fontSize: "24px",
                fontFamily: "var(--discord-font-primary)",
                fontWeight: "normal",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
            }}>{exp.HashableName}</h1>
            <p>MORE DATA</p>
            <p>MORE DATA</p>
            <p>MORE DATA</p>
        </div>
    </>;
}