import { useState } from "react";

export const JSONToList = ({
    data,
    isEditing: parentIsEditing,
    handleSave,
}: {
    data: any;
    isEditing?: boolean;
    handleSave?: (e: Object) => void;
}) => {
    const [isEditing, setIsEditing] = useState(parentIsEditing);
    const [editedData, setEditedData] = useState(data);
    const [nestedIsCollapsed, setNestedIsCollapsed] = useState(true);

    const generateListItems = (obj: any) => {
        return Object.keys(obj).map((key) => {
            const value = obj[key];
            if (String(value) === "null") return;
            const isNestedObject = typeof value === "object" && value !== null;

            if (isNestedObject) {
                const toggleNestedCollapse = () => {
                    setNestedIsCollapsed(!nestedIsCollapsed);
                };

                return (
                    <li
                        style={{
                            paddingLeft: 0,
                            padding: 4,
                        }}
                        key={key}
                    >
                        <button onClick={toggleNestedCollapse} className="collapse-button">
                            {nestedIsCollapsed ? "+" : "-"}
                        </button>
                        {key}
                        {!nestedIsCollapsed && (
                            <ul>
                                <JSONToList data={value} isEditing={isEditing} handleSave={handleSave} />
                            </ul>
                        )}
                    </li>
                );
            }

            if (isEditing) {
                const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
                    setEditedData({
                        ...editedData,
                        [key]: event.target.value,
                    });
                };

                return (
                    <li
                        style={{
                            padding: 8,
                        }}
                        key={key}
                    >
                        <span style={{ fontFamily: '"gg sans"' }}>{key}:</span>{" "}
                        <input
                            style={{
                                backgroundColor: "#2f3136",
                                height: 16,
                            }}
                            type="text"
                            value={editedData[key]}
                            onChange={handleInputChange}
                        />
                    </li>
                );
            }

            return (
                <li
                    style={{
                        padding: 8,
                    }}
                    key={key}
                >
                    <span style={{ fontFamily: '"gg sans"' }}>{key}:</span> {value}
                </li>
            );
        });
    };

    const handleEditClick = () => {
        setIsEditing(true);
    };

    const handleSaveClick = () => {
        const jsonData = JSON.stringify(editedData);
        handleSave?.(JSON.parse(jsonData));
        setIsEditing(false);
    };

    return (
        <div>
            {/* {isEditing ? (
                <button
                    style={{
                        position: "absolute",
                        right: 48,
                        width: 100,
                        marginTop: -32,
                    }}
                    onClick={handleSaveClick}
                >
                    Save
                </button>
            ) : (
                <button
                    style={{
                        position: "absolute",
                        right: 48,
                        width: 100,
                        marginTop: -32,
                    }}
                    onClick={handleEditClick}
                >
                    Edit
                </button>
            )} */}
            <ul>{generateListItems(data)}</ul>
        </div>
    );
};

export function JSONToCard({
    data,
    title,
    style,
    children,
    handleSave,
}: {
    data: any;
    title: string;
    style?: React.CSSProperties;
    children?: any;
    handleSave?: (e: any) => void;
}) {
    return (
        <div className="socket-card" style={style}>
            <h3>{title}</h3>
            <div
                style={{
                    marginLeft: -17,
                }}
            >
                <JSONToList data={data} handleSave={handleSave} />
                <div
                    style={{
                        marginLeft: 21,
                        width: "calc(100% - 21px)",
                    }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}

