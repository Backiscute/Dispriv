import { req } from "@/util/apiFuncs";
import { GatewayConnection } from "@/util/websocket";
import { useEffect, useState } from "react";

export default function Guild() {
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
                    <table style={{ marginTop: 12 }}>
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
                    </table>
                </div>
            ))}
        </div>
    );
}
