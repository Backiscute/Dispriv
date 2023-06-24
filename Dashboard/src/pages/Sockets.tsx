import Dialog from "@/components/Dialog";
import { JSONToCard } from "@/components/JSONToCard";
import { req } from "@/util/apiFuncs";
import { GatewayConnection } from "@/util/websocket";
import { useEffect, useRef, useState } from "react";

export enum OpCodes {
    DISPATCH = 0,
    HEARTBEAT = 1,
    IDENTIFY = 2,
    PRESENCE_UPDATE = 3,
    VOICE_STATE_UPDATE = 4,
    VOICE_PING = 5,
    RESUME = 6,
    RECONNECT = 7,
    REQUEST_GUILD_MEMBERS = 8,
    INVALID_SESSION = 9,
    HELLO = 10,
    HEARTBEAT_ACK = 11,
    CALL_CONNECT = 13,
    REGISTER_GUILD_EVENTS = 14,
    LOBBY_CONNECT = 15,
    LOBBY_DISCONNECT = 16,
    LOBBY_VOICE_STATES_UPDATE = 17,
    STREAM_CREATE = 18,
    STREAM_DELETE = 19,
    STREAM_WATCH = 20,
    STREAM_PING = 21,
    STREAM_SET_PAUSED = 22,
    EMBEDDED_ACTIVITY_CREATE = 25,
    EMBEDDED_ACTIVITY_DELETE = 26,
    EMBEDDED_ACTIVITY_UPDATE = 27,
    REQUEST_FORUM_UNREADS = 28,
    REMOTE_COMMAND = 29,
    REQUEST_DELETED_ENTITY_IDS = 30,
    REQUEST_SOUNDBOARD_SOUNDS = 31,
    CLIENT_SPEEDTEST_CREATE = 32,
    CLIENT_SPEEDTEST_DELETE = 33,
}

export default function Sockets() {
    const [sockets, setSockets] = useState<GatewayConnection[]>();
    const dialog = useRef<HTMLDialogElement>(null);
    const [title, setTitle] = useState("");
    useEffect(() => {
        req("/websockets", "GET").then((res) => {
            setSockets(res);
        });
    }, []);
    return (
        <div className="page-content">
            <Dialog
                innerRef={dialog}
                title={title}
                elements={[
                    {
                        label: "Event",
                        type: "text",
                        placeholder: "MESSAGE_CREATE",
                    },
                    {
                        type: "select",
                        label: "Sequence",
                        options: [
                            {
                                label: "0",
                                value: "0",
                            },
                        ],
                    },
                ]}
            />
            <div
                style={{
                    marginTop: 20,
                }}
            >
                <h2 style={{ display: "inline" }}>Sockets</h2>
            </div>
            {sockets?.map((socket) => {
                return (
                    <div key={socket.ID}>
                        <JSONToCard
                            data={socket}
                            title={socket.Account ? `${socket.Account.Username} (${socket.ID})` : socket.ID}
                        >
                            <button
                                onClick={() => {
                                    setTitle(socket.ID);
                                    dialog.current?.showModal();
                                }}
                            >
                                Construct packet
                            </button>
                        </JSONToCard>
                    </div>
                );
            })}
        </div>
    );
}
