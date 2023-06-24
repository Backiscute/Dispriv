export default function Dialog(props: {
    title: string;
    elements: {
        type: "text";
        label: string;
        placeholder?: string;
    }[];
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
                {props.elements.map((element, index) => (
                    <div key={index} className="form-input">
                        <div>{element.label}</div>
                        <input type={element.type} placeholder={element.placeholder} />
                    </div>
                ))}
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

