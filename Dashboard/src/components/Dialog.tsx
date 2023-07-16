import { req } from "@/util/apiFuncs";
import { useRef, useState } from "react";
import ReactDropdown from "react-dropdown";

type TextType = {
    type: "text";
    label: string;
    jsonName: string;
    placeholder?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

type SelectType = {
    type: "select";
    label: string;
    jsonName: string;
    options: {
        label: string;
        value: string;
    }[];
    defaultIndex?: number;
    onChange?: (value: string | number) => void;
};

type CustomType = {
    type: "custom";
    label: string;
    element: JSX.Element;
    jsonName: string;
    grabValue?: () => Object;
};

export type ElementType = TextType | SelectType | CustomType;

function setNestedValue(obj: any, path: string, value: any) {
    const properties = path.split(".");
    const lastProperty = properties.pop();

    let currentObj = obj;
    for (const property of properties) {
        if (!currentObj[property]) {
            currentObj[property] = {};
        }
        currentObj = currentObj[property];
    }

    if (lastProperty) {
        currentObj[lastProperty] = value;
    }
}

export default function Dialog(props: {
    title: string;
    elements: ElementType[];
    innerRef?: React.Ref<HTMLDialogElement>;
    onClose?: (data: any) => void;
}) {
    const obj = useRef<Object>({});
    return (
        <dialog
            style={{
                position: "relative",
                overflow: "visible",
            }}
            ref={props.innerRef}
        >
            <h2>{props.title}</h2>
            <form method="dialog" className="dialog-form">
                {/* <div className="form-input">
                    <div>Gift ID</div>
                    <input type="text" />
                </div>
                <div className="form-input">
                    <div>Gift ID</div>
                    <input type="text" />
                </div> */}
                {props.elements.map((element, index) => {
                    switch (element.type) {
                        case "text":
                            return (
                                <div key={index} className="form-input">
                                    <div className="form-label">{element.label}</div>
                                    <input type={element.type} placeholder={element.placeholder} onChange={(element.onChange ? (e => element.onChange!(e)) : undefined)} value={element.value}/>
                                </div>
                            );
                        case "select":
                            return (
                                <div key={index} className="form-input">
                                    <div className="form-label">{element.label}</div>
                                    <ReactDropdown
                                        onChange={(o) => {
                                            if (element.onChange) {
                                                element.onChange(o.value);
                                            }
                                        }}
                                        options={element.options}
                                        value={element.defaultIndex ? element.options[element.defaultIndex] : undefined}
                                    />
                                </div>
                            );
                        case "custom":
                            return (
                                <div key={index} className="form-input">
                                    <div className="form-label">{element.label}</div>
                                    <div className="fix-yo-shit">{element.element}</div>
                                </div>
                            );
                    }
                })}
                <div className="form-submit-container">
                    <button
                        style={{
                            width: 75,
                            marginRight: 10,
                            background: "none",
                            backgroundColor: "none",
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        style={{
                            width: 75,
                        }}
                        onClick={() => {
                            props.elements.forEach((el) => {
                                if (el.type === "custom") {
                                    setNestedValue(obj.current, el.jsonName, el.grabValue?.());
                                } else {
                                    Array.from(document.getElementsByClassName("form-input")).forEach((e) => {
                                        const element = e as HTMLDivElement;
                                        const label = element.getElementsByClassName("form-label")[0];
                                        if (label?.innerHTML === el.label) {
                                            switch (el.type) {
                                                case "text":
                                                    setNestedValue(
                                                        obj.current,
                                                        el.jsonName,
                                                        (element.getElementsByTagName("input")[0] as HTMLInputElement)
                                                            .value,
                                                    );

                                                    (element.getElementsByTagName("input")[0] as HTMLInputElement).value = el.value ?? "";
                                                    break;
                                                case "select":
                                                    const root = element.getElementsByClassName("Dropdown-root")[0];
                                                    if (root) {
                                                        const selected =
                                                            root.getElementsByClassName("Dropdown-control")[0];
                                                        if (selected) {
                                                            const placeholder =
                                                                selected.getElementsByClassName(
                                                                    "Dropdown-placeholder",
                                                                )[0];
                                                            if (placeholder) {
                                                                console.log(el.options);
                                                                setNestedValue(
                                                                    obj.current,
                                                                    el.jsonName,
                                                                    el.options.find(x => x.label.replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;") === placeholder.innerHTML)?.value,
                                                                );
                                                            }
                                                        }
                                                    }
                                            }
                                        }
                                    });
                                }
                            });
                            props.onClose?.(obj.current);
                        }}
                    >
                        OK
                    </button>
                </div>
            </form>
        </dialog>
    );
}

