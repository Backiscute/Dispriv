import { IRawExperiment, IConvertedExperiment, IExperimentFilter } from "@/classes/ExperimentInterfaces";
import yaml from "yaml";
import murmurhash3 from "murmurhash3js";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { useRef } from "react";
import Dialog from "@/components/Dialog";

export function Convert(Input: {[RawName: string]: IRawExperiment}) {
    const Temp: {[RawName: string]: IConvertedExperiment} = {};

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

export function Save(Path: string, ConvertedData: {[RawName: string]: IConvertedExperiment}, CurrentConfig: IExperimentFilter[] = []) {
    writeFileSync(join(dirname(Path), "Experiments.yaml"), yaml.stringify(ConvertedData));
    writeFileSync(join(dirname(Path), "ExperimentConfig.yaml"), yaml.stringify(CurrentConfig));
}

export default function Experiments() {
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
                    Convert JSON to YAML
                </button>
                <Dialog
                    title="Convert JSON to YAML"
                    elements={[
                        {
                            label: "Path to JSON",
                            jsonName: "pathToOriginal",
                            type: "text",
                            placeholder: `Working directory is ${process.cwd()}`,
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
                }}>
                    Load existing config
                </button>
            </div>
        </div>
    );
}