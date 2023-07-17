import { GuildFilterType, IConvertedExperiment, IExperimentFilter } from "@/classes/ExperimentInterfaces";
import { ExperimentRollouts } from "@/components/ExperimentTable";
import { Save } from "@/pages/Experiments";
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { useRef, useState } from "react";
import { parse, stringify } from "yaml";
import Dialog, { ElementType } from "./Dialog";
import MonacoEditorComponent from "./MonacoEditor";

function SaveFilters(filters: IExperimentFilter[]) {
    writeFileSync(join("..", "Configs", "ExperimentConfig.yaml"), stringify(filters));
}

export default function ExperimentEditor({
    exp,
    filters,
    editExperimentHook,
    fullConfHook,
}: {
    exp: IConvertedExperiment;
    filters: IExperimentFilter[];
    editExperimentHook: React.Dispatch<
        React.SetStateAction<{ exp: IConvertedExperiment; filt: IExperimentFilter[] } | undefined>
    >;
    fullConfHook: React.Dispatch<React.SetStateAction<IExperimentFilter[]>>;
}) {
    const [RelatedFilters, setRelatedFilters] = useState<IExperimentFilter[]>(
        filters.filter((x) => x.ExperimentHash === exp.CalculatedHash),
    );
    const createDialog = useRef<HTMLDialogElement>(null);
    const previous = useRef<string>("");
    const filterData = useRef<string>("");
    const [elements, setElements] = useState<ElementType[]>([
        {
            type: "text",
            label: "Experiment's Murmur3 Hash",
            jsonName: "expHash",
            placeholder: exp.CalculatedHash.toString(),
            value: exp.CalculatedHash.toString(),
            onChange: (e) => {
                e.target.value = exp.CalculatedHash.toString();
                e.preventDefault();
            },
        },
        {
            type: "select",
            label: "Treatment",
            jsonName: "bucket",
            defaultIndex: 1,
            options: exp.Treatments.map((x) => {
                return { label: x, value: exp.Buckets[exp.Treatments.indexOf(x)].toString() };
            }),
        },
        {
            type: "select",
            label: "Affects everyone",
            jsonName: "affectsAll",
            defaultIndex: 1,
            options: [
                {
                    label: "Yes",
                    value: "true",
                },
                {
                    label: "No",
                    value: "false",
                },
            ],
            onChange: (v) => {
                setElements((prev) => {
                    if (previous.current === v) return prev;

                    previous.current = v as string;

                    const TargetedStuff = prev.filter((x) => x.jsonName.startsWith("tr"));

                    if (TargetedStuff.length > 0 && v === "true")
                        return [
                            ...prev.slice(0, prev.indexOf(TargetedStuff[0])),
                            ...prev.slice(prev.indexOf(TargetedStuff[1]) + 1),
                        ];

                    if (TargetedStuff.length !== 0 && v === "false") return prev;

                    return [
                        ...prev.slice(0, 3),
                        {
                            type: "text",
                            label: "Targeted users",
                            jsonName: "trUsers",
                            placeholder: "e.g. 454968542723571715,910665644188516405",
                        },
                        {
                            type: "text",
                            label: "Targeted guilds",
                            jsonName: "trGuilds",
                            placeholder: "e.g. 998894274613628948,1117880446429184091",
                        },
                        ...prev.slice(3),
                    ];
                });
            },
        },
        {
            type: "text",
            label: "Targeted users",
            jsonName: "trUsers",
            placeholder: "e.g. 454968542723571715,910665644188516405",
        },
        {
            type: "text",
            label: "Targeted guilds",
            jsonName: "trGuilds",
            placeholder: "e.g. 998894274613628948,1117880446429184091",
        },
        {
            label: "Filter Properties",
            type: "custom",
            jsonName: "properties",
            element: (
                <MonacoEditorComponent
                    onChange={(v) => {
                        if (!v) return;
                        filterData.current = v;
                    }}
                    theme="vs-dark"
                    defaultLanguage="yaml"
                    height={200}
                    className="editor"
                />
            ),
            grabValue: () => {
                return parse(filterData.current || "");
            },
        },
    ]);

    return (
        <div style={{ overflow: "auto" }}>
            <Dialog
                title="Create new Experiment Filter"
                elements={elements}
                onClose={(d) => {
                    console.log(d);
                    const NewFilter: IExperimentFilter = {
                        ExperimentHash: Number(d.expHash),
                        AffectsEveryone: d.affectsAll === true,
                        TargetedUsers:
                            d.trUsers === "" || d.trUsers === undefined
                                ? []
                                : d.trUsers.split(",").map((x: string) => x.trim()),
                        TargetedGuilds:
                            d.trGuilds === "" || d.trGuilds === undefined
                                ? []
                                : d.trGuilds.split(",").map((x: string) => x.trim()),
                        Bucket: Number(d.bucket),
                        Properties: d.properties,
                    };
                    console.log(stringify(NewFilter));
                    filters.push(NewFilter);
                    SaveFilters(filters);
                    fullConfHook(filters);

                    setRelatedFilters(filters.filter((x) => x.ExperimentHash === exp.CalculatedHash));
                }}
                innerRef={createDialog}
            />

            <p
                onClick={() => editExperimentHook(undefined)}
                style={{ cursor: "pointer", width: 50, color: "var(--discord-text-muted)" }}
            >
                {"< Back"}
            </p>
            <div
                className="data-box"
                style={{ width: "25%", borderRadius: 10, maxHeight: "unset", marginRight: 20, float: "left" }}
            >
                <h1
                    style={{
                        // this a h1 but i overrode almost all defining h1 props :fire:
                        display: "block",
                        margin: "35px",
                        textAlign: "center",
                        fontSize: "24px",
                        fontFamily: "var(--discord-font-primary)",
                        fontWeight: "normal",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {exp.HashableName}
                </h1>
                <div className="internal-data">
                    <p className="dataHeader">Display name</p>
                    <span>{exp.ReadableName}</span>
                    <br />
                    <br />
                    <p className="dataHeader">Murmur3 Hash</p>
                    <span>{exp.CalculatedHash}</span>
                    <br />
                    <br />
                    <p className="dataHeader">Treatments</p>
                    <ExperimentRollouts exp={exp} conf={filters} />
                    <br />
                    <p className="dataHeader">Quick actions</p>
                    <span>
                        <button
                            style={{ width: "100%" }}
                            onClick={() => {
                                filters = filters.filter((x) => x.ExperimentHash !== exp.CalculatedHash);
                                SaveFilters(filters);
                                fullConfHook(filters);

                                setRelatedFilters([]);
                            }}
                        >
                            Remove all filters
                        </button>
                    </span>
                </div>
            </div>
            <div className="data-box" style={{ width: "35%", borderRadius: 10, maxHeight: "unset", float: "left" }}>
                <h1
                    style={{
                        // this a h1 but i overrode almost all defining h1 props :fire:
                        display: "block",
                        margin: "35px",
                        textAlign: "center",
                        fontSize: "24px",
                        fontFamily: "var(--discord-font-primary)",
                        fontWeight: "normal",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    Related Filters
                </h1>
                <div className="internal-data">
                    {RelatedFilters.length === 0 ? (
                        <span>
                            No filters available.
                            <br />
                        </span>
                    ) : (
                        RelatedFilters.map((x, i) => (
                            <div key={i}>
                                <p className="dataHeader">Filter #{i + 1}</p>
                                <span>
                                    <span style={{ color: "var(--discord-text-muted)" }}>Modifies: </span>{" "}
                                    {exp.Treatments[exp.Buckets.indexOf(x.Bucket)]}
                                    <br />
                                    {x.Properties ? (
                                        <>
                                            <span style={{ color: "var(--discord-text-muted)" }}>Filters: </span>{" "}
                                            {Object.keys(x.Properties!).join(", ")}
                                            <br />
                                            {x.Properties.Percentage ? (
                                                <>
                                                    <span style={{ color: "var(--discord-text-muted)" }}>
                                                        Percentage:{" "}
                                                    </span>{" "}
                                                    {x.Properties.Percentage.e - x.Properties.Percentage.s}%<br />
                                                </>
                                            ) : (
                                                <></>
                                            )}
                                            {x.Properties.RequiredGuildFeatures ? (
                                                <>
                                                    <span style={{ color: "var(--discord-text-muted)" }}>
                                                        Guild Features:{" "}
                                                    </span>{" "}
                                                    {x.Properties.RequiredGuildFeatures.map(
                                                        (f) => f[0].toUpperCase() + f.slice(1).toLowerCase(),
                                                    ).join(", ")}
                                                    <br />
                                                </>
                                            ) : (
                                                <></>
                                            )}
                                            {x.Properties.IDRanges ? (
                                                <>
                                                    <span style={{ color: "var(--discord-text-muted)" }}>
                                                        ID Between:{" "}
                                                    </span>{" "}
                                                    {x.Properties.IDRanges.map((x) => `${x.s} - ${x.e}`).join(", ")}
                                                    <br />
                                                </>
                                            ) : (
                                                <></>
                                            )}
                                            {x.Properties.MembersRequired ? (
                                                <>
                                                    <span style={{ color: "var(--discord-text-muted)" }}>
                                                        Members Between:{" "}
                                                    </span>{" "}
                                                    {x.Properties.MembersRequired.map((x) => `${x.s} - ${x.e}`).join(
                                                        ", ",
                                                    )}
                                                    <br />
                                                </>
                                            ) : (
                                                <></>
                                            )}
                                            {x.Properties.VanityURLRequired ? (
                                                <>
                                                    <span style={{ color: "var(--discord-text-muted)" }}>
                                                        Requires Vanity URL:{" "}
                                                    </span>{" "}
                                                    {x.Properties.VanityURLRequired ? "Yes" : "No"}
                                                    <br />
                                                </>
                                            ) : (
                                                <></>
                                            )}
                                        </>
                                    ) : (
                                        <></>
                                    )}
                                    {!x.AffectsEveryone && x.TargetedUsers.length > 0 ? (
                                        <>
                                            <span style={{ color: "var(--discord-text-muted)" }}>
                                                Applies to users:{" "}
                                            </span>{" "}
                                            {x.TargetedUsers.join(", ")}
                                            <br />
                                        </>
                                    ) : (
                                        <></>
                                    )}
                                    {!x.AffectsEveryone && x.TargetedGuilds.length > 0 ? (
                                        <>
                                            <span style={{ color: "var(--discord-text-muted)" }}>
                                                Applies to guilds:{" "}
                                            </span>{" "}
                                            {x.TargetedGuilds.join(", ")}
                                            <br />
                                        </>
                                    ) : (
                                        <></>
                                    )}
                                </span>
                                <br />
                            </div>
                        ))
                    )}
                    <button onClick={() => createDialog.current?.showModal()} style={{ marginTop: 5 }}>
                        Create new...
                    </button>
                </div>
            </div>
        </div>
    );
}
