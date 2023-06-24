type TextType = {
    type: "text";
    label: string;
    placeholder?: string;
};

type SelectType = {
    type: "select";
    label: string;
    options: {
        label: string;
        value: string;
    }[];
};

type ElementType = TextType | SelectType;

export default function Dialog(props: {
    title: string;
    elements: ElementType[];
    innerRef?: React.Ref<HTMLDialogElement>;
}) {
    return (
        <dialog ref={props.innerRef}>
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
                                    <div>{element.label}</div>
                                    <input type={element.type} placeholder={element.placeholder} />
                                </div>
                            );
                        case "select":
                            return (
                                <div key={index} className="form-input">
                                    <div>{element.label}</div>
                                    <select>
                                        {element.options.map((option, index) => (
                                            <option key={index} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            );
                    }
                })}
                <div className="form-submit-container">
                    <button
                        style={{
                            width: 75,
                        }}
                    >
                        OK
                    </button>
                </div>
            </form>
        </dialog>
    );
}

