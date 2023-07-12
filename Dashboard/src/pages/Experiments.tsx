import { IRawExperiment, IConvertedExperiment, IExperimentFilter } from "@/classes/ExperimentInterfaces";
import yaml from "yaml";
import murmurhash3 from "murmurhash3js";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { useRef, useState } from "react";
import Dialog from "@/components/Dialog";
import ExperimentTable from "@/components/ExperimentTable";

export type ExperimentsFile = {[RawName: string]: IConvertedExperiment};

export function Convert(Input: {[RawName: string]: IRawExperiment}) {
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
    const [experiments, setExperiments] = useState<IConvertedExperiment[]>([])
    const convertDialog = useRef<HTMLDialogElement>(null);
    
    return (
        <div className="page-content">
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

                        let Parsed: {[RawName: string]: IRawExperiment};
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
                    width: 200
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
                <ExperimentTable experiments={experiments} config={filters} style={{
                    marginTop: 10
                }} />
            </div>
        </div>
    );
}