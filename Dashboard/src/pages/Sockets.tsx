import { req } from "@/util/apiFuncs";
import { GatewayConnection } from "@/util/websocket";
import { useEffect, useState } from "react";

const JSONToList = ({ data }: { data: any }) => {
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

export default function Sockets() {
    const [sockets, setSockets] = useState<GatewayConnection[]>();

    useEffect(() => {
        req("/websockets", "GET").then((res) => {
            setSockets(res);
        });
    }, []);
    return (
        <div className="page-content">
            <div
                style={{
                    marginTop: 20,
                }}
            >
                <h2 style={{ display: "inline" }}>Sockets</h2>
            </div>
            {sockets?.map((socket) => (
                <div className="socket-card" key={JSON.stringify(socket)}>
                    <h3>{socket.Account ? `${socket.Account.Username} (${socket.ID})` : socket.ID}</h3>
                    <div
                        style={{
                            marginLeft: -17,
                        }}
                    >
                        <JSONToList data={socket.Account} />
                    </div>
                    {/* <table style={{ marginTop: 12 }}>
                        <tbody>
                            <tr>
                                <td>Username</td>
                                <td>{`${socket.Account?.Username}#${socket.Account?.Discriminator}`}</td>
                            </tr>
                            <tr>
                                <td>Token</td>
                                <td>{socket.UserToken}</td>
                            </tr>
                        </tbody>
                    </table> */}
                </div>
            ))}
        </div>
    );
}
