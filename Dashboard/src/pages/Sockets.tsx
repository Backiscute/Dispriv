import { JSONToCard } from "@/components/JSONToCard";
import { req } from "@/util/apiFuncs";
import { GatewayConnection } from "@/util/websocket";
import { useEffect, useState } from "react";

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
                <JSONToCard
                    key={socket.ID}
                    data={socket}
                    title={socket.Account ? `${socket.Account.Username} (${socket.ID})` : socket.ID}
                />
            ))}
        </div>
    );
}
