import { IRawExperiment, IConvertedExperiment, IExperimentFilter } from "@/classes/ExperimentInterfaces";
import yaml from "yaml";
import murmurhash3 from "murmurhash3js";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { useRef, useState } from "react";
import Dialog from "@/components/Dialog";
import ExperimentTable from "@/components/ExperimentTable";
import ExperimentEditor from "@/components/ExperimentEditor";

export type ExperimentsFile = { [RawName: string]: IConvertedExperiment };

export function Convert(Input: { [RawName: string]: IRawExperiment }) {
    const Temp: ExperimentsFile = {};

    for (const ExperimentHashableName of Object.keys(Input)) {
        const RawExp = Input[ExperimentHashableName];
        Temp[ExperimentHashableName] = {
            Type: RawExp.type,
            ReadableName: RawExp.title,
            HashableName: ExperimentHashableName,
            CalculatedHash: murmurhash3.x86.hash32(ExperimentHashableName),
            Treatments: RawExp.description,
            Buckets: RawExp.buckets
        };
    }

    return Temp;
}

export function Save(Path: string, ConvertedData: ExperimentsFile, CurrentConfig: IExperimentFilter[] = []) {
    writeFileSync(join(dirname(Path), "Experiments.yaml"), yaml.stringify(ConvertedData));
    writeFileSync(join(dirname(Path), "ExperimentConfig.yaml"), yaml.stringify(CurrentConfig));
}

export default function Experiments() {
    const [filters, setFilters] = useState<IExperimentFilter[]>([]);
    const [experiments, setExperiments] = useState<IConvertedExperiment[]>([]);
    const [editedExperiment, setEditedExperiment] = useState<{ exp: IConvertedExperiment, filt: IExperimentFilter[] }>();
    const convertDialog = useRef<HTMLDialogElement>(null);

    return (
        <div className="page-content">
            {
                editedExperiment === undefined ? (
                    <>
                        <h2>Experiments</h2>
                        <div style={{
                            display: "inline-block"
                        }}>
                            <button style={{
                                width: 200,
                                marginRight: 10
                            }} onClick={() => {
                                convertDialog.current?.showModal();
                            }}>
                                {"Discord -> Dispriv"}
                            </button>
                            <Dialog
                                title="Convert JSON to YAML"
                                elements={[
                                    {
                                        label: "Path to JSON",
                                        jsonName: "pathToOriginal",
                                        type: "text",
                                        placeholder: join(process.cwd(), "..", "Configs", "Experiments.json"),
                                    },
                                ]}
                                onClose={d => {
                                    const JSONPath = d.pathToOriginal as string;
                                    console.log(JSONPath);
                                    console.log(dirname(JSONPath));

                                    if (!existsSync(JSONPath)) {
                                        console.error(`File ${JSONPath} doesn't exist.`);
                                        return;
                                    }

                                    let Parsed: { [RawName: string]: IRawExperiment };
                                    try {
                                        Parsed = JSON.parse(readFileSync(JSONPath).toString());
                                    } catch {
                                        console.error(`File ${JSONPath} isn't a parseable JSON.`);
                                        return;
                                    }

                                    const Converted = Convert(Parsed);
                                    console.log(Converted);

                                    Save(JSONPath, Converted);
                                }}
                                innerRef={convertDialog}
                            />
                            <button style={{
                                width: 200,
                                marginRight: 10
                            }} onClick={() => {
                                console.log(filters, experiments);
                                if (!existsSync(join("..", "Configs", "Experiments.yaml")) || !existsSync(join("..", "Configs", "ExperimentConfig.yaml")))
                                    return console.log("autoload failed");

                                setFilters(yaml.parse(readFileSync(join("..", "Configs", "ExperimentConfig.yaml")).toString()));
                                const E = yaml.parse(readFileSync(join("..", "Configs", "Experiments.yaml")).toString());
                                setExperiments(Object.keys(E).map(x => E[x]));
                            }}>
                                Load existing config
                            </button>
                            <button style={{
                                width: 200,
                                marginRight: 10
                            }} onClick={async () => await navigator.clipboard.writeText(`let _mods = webpackChunkdiscord_app.push([[Symbol()],{},({c})=>Object.values(c)]); webpackChunkdiscord_app.pop(); const findByProps = (...props) => { for (let m of _mods) { try { if (!m.exports || m.exports === window) continue; if (props.every((x) => m.exports?.[x])) return m.exports; for (let ex in m.exports) { if (props.every((x) => m.exports?.[ex]?.[x])) return m.exports[ex]; } } catch {} } }; Object.fromEntries(Object.entries(findByProps("getRegisteredExperiments").getRegisteredExperiments()))`)}>
                                Copy script
                            </button>
                            <h1>User Experiments</h1>
                            <ExperimentTable experiments={experiments} config={filters} style={{
                                marginTop: 10
                            }} selectedType="user" editExperimentHook={setEditedExperiment} />

                            <h1>Guild Experiments</h1>
                            <ExperimentTable experiments={experiments} config={filters} style={{
                                marginTop: 10
                            }} selectedType="guild" editExperimentHook={setEditedExperiment} />
                        </div>
                    </>
                ) : <ExperimentEditor exp={editedExperiment.exp} filters={filters} editExperimentHook={setEditedExperiment} fullConfHook={setFilters} />
            }
        </div>
    );
}