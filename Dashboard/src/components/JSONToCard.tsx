import { useState } from "react";

export const JSONToList = ({ data }: { data: any }) => {
    const generateListItems = (obj: any) => {
        return Object.keys(obj).map((key) => {
            const value = obj[key];
            if (String(value) === "null") return;
            const isNestedObject = typeof value === "object" && value !== null;

            if (isNestedObject) {
                const [nestedIsCollapsed, setNestedIsCollapsed] = useState(true);

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
                                <JSONToList data={value} />
                            </ul>
                        )}
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

    return <ul>{generateListItems(data)}</ul>;
};

export function JSONToCard({
    data,
    title,
    style,
    children,
}: {
    data: any;
    title: string;
    style?: React.CSSProperties;
    children?: any;
}) {
    return (
        <div className="socket-card" style={style}>
            <h3>{title}</h3>
            <div
                style={{
                    marginLeft: -17,
                }}
            >
                <JSONToList data={data} />
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

