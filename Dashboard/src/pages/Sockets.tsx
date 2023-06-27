import Dialog, { ElementType } from "@/components/Dialog";
import { JSONToCard } from "@/components/JSONToCard";
import { req } from "@/util/apiFuncs";
import { GatewayConnection } from "@/util/websocket";
import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import MonacoEditorComponent from "@/components/MonacoEditor";
import UserCard from "@/components/UserCard";

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

enum DiscordGatewayEvent {
    HELLO = "Hello",
    HEARTBEAT_ACK = "Heartbeat ACK",
    RECONNECT = "Reconnect",
    INVALID_SESSION = "Invalid Session",
    READY = "Ready",
    READY_SUPPLEMENTAL = "Ready Supplemental",
    RESUMED = "Resumed",
    AUTH_SESSION_CHANGE = "Auth Session Change",
    APPLICATION_COMMAND_PERMISSIONS_UPDATE = "Application Command Permissions Update",
    CALL_CREATE = "Call Create",
    CALL_UPDATE = "Call Update",
    CALL_DELETE = "Call Delete",
    CHANNEL_CREATE = "Channel Create",
    CHANNEL_UPDATE = "Channel Update",
    CHANNEL_DELETE = "Channel Delete",
    CHANNEL_PINS_UPDATE = "Channel Pins Update",
    CHANNEL_RECIPIENT_ADD = "Channel Recipient Add",
    CHANNEL_RECIPIENT_REMOVE = "Channel Recipient Remove",
    THREAD_CREATE = "Thread Create",
    THREAD_UPDATE = "Thread Update",
    THREAD_DELETE = "Thread Delete",
    THREAD_LIST_SYNC = "Thread List Sync",
    THREAD_MEMBER_UPDATE = "Thread Member Update",
    THREAD_MEMBERS_UPDATE = "Thread Members Update",
    GUILD_CREATE = "Guild Create",
    GUILD_UPDATE = "Guild Update",
    GUILD_DELETE = "Guild Delete",
    GUILD_AUDIT_LOG_ENTRY_CREATE = "Guild Audit Log Entry Create",
    GUILD_BAN_ADD = "Guild Ban Add",
    GUILD_BAN_REMOVE = "Guild Ban Remove",
    GUILD_EMOJIS_UPDATE = "Guild Emojis Update",
    GUILD_STICKERS_UPDATE = "Guild Stickers Update",
    GUILD_MEMBER_ADD = "Guild Member Add",
    GUILD_MEMBER_REMOVE = "Guild Member Remove",
    GUILD_MEMBER_UPDATE = "Guild Member Update",
    GUILD_MEMBERS_CHUNK = "Guild Members Chunk",
    GUILD_ROLE_CREATE = "Guild Role Create",
    GUILD_ROLE_UPDATE = "Guild Role Update",
    GUILD_ROLE_DELETE = "Guild Role Delete",
    GUILD_SCHEDULED_EVENT_CREATE = "Guild Scheduled Event Create",
    GUILD_SCHEDULED_EVENT_UPDATE = "Guild Scheduled Event Update",
    GUILD_SCHEDULED_EVENT_DELETE = "Guild Scheduled Event Delete",
    GUILD_SCHEDULED_EVENT_USER_ADD = "Guild Scheduled Event User Add",
    GUILD_SCHEDULED_EVENT_USER_REMOVE = "Guild Scheduled Event User Remove",
    GUILD_INTEGRATIONS_UPDATE = "Guild Integrations Update",
    INTEGRATION_CREATE = "Integration Create",
    INTEGRATION_UPDATE = "Integration Update",
    INTEGRATION_DELETE = "Integration Delete",
    INTERACTION_CREATE = "Interaction Create",
    INVITE_CREATE = "Invite Create",
    INVITE_DELETE = "Invite Delete",
    MESSAGE_CREATE = "Message Create",
    MESSAGE_UPDATE = "Message Update",
    MESSAGE_DELETE = "Message Delete",
    MESSAGE_DELETE_BULK = "Message Delete Bulk",
    MESSAGE_REACTION_ADD = "Message Reaction Add",
    MESSAGE_REACTION_REMOVE = "Message Reaction Remove",
    MESSAGE_REACTION_REMOVE_ALL = "Message Reaction Remove All",
    MESSAGE_REACTION_REMOVE_EMOJI = "Message Reaction Remove Emoji",
    RECENT_MENTION_DELETE = "Recent Mention Delete",
    PRESENCE_UPDATE = "Presence Update",
    RELATIONSHIP_ADD = "Relationship Add",
    RELATIONSHIP_UPDATE = "Relationship Update",
    RELATIONSHIP_REMOVE = "Relationship Remove",
    STAGE_INSTANCE_CREATE = "Stage Instance Create",
    STAGE_INSTANCE_UPDATE = "Stage Instance Update",
    STAGE_INSTANCE_DELETE = "Stage Instance Delete",
    TYPING_START = "Typing Start",
    USER_UPDATE = "User Update",
    USER_NOTE_UPDATE = "User Note Update",
    USER_REQUIRED_ACTION_UPDATE = "User Required Action Update",
    VOICE_STATE_UPDATE = "Voice State Update",
    VOICE_SERVER_UPDATE = "Voice Server Update",
    WEBHOOKS_UPDATE = "Webhooks Update",
}

export default function Sockets() {
    const [sockets, setSockets] = useState<GatewayConnection[]>();
    const dialog = useRef<HTMLDialogElement>(null);
    const [title, setTitle] = useState("");
    const payload = useRef<string>("");
    const [elements, setElements] = useState<ElementType[]>([
        {
            jsonName: "op",
            label: "Opcode",
            type: "select",
            options: Object.keys(OpCodes)
                .splice(Object.keys(OpCodes).indexOf("DISPATCH"))
                .map((key) => {
                    return {
                        label: key,
                        value: OpCodes[key as any],
                    };
                }),
            onChange: (v) => {
                if (v === 0) {
                    setElements((prev) => {
                        const el = prev.find((e) => e.label === "Event");
                        if (!el) {
                            return [
                                ...prev,
                                {
                                    jsonName: "t",
                                    label: "Event",
                                    type: "select",
                                    options: Object.keys(DiscordGatewayEvent).map((key) => {
                                        return {
                                            label: key,
                                            value: (DiscordGatewayEvent as any)[key as any],
                                        };
                                    }),
                                },
                            ];
                        } else {
                            return prev;
                        }
                    });
                } else {
                    // check if the element exists
                    setElements((prev) => {
                        const el = prev.find((e) => e.label === "Event");
                        console.log(el);
                        if (el) {
                            const copy = [...prev];
                            copy.splice(elements.indexOf(el), 1);
                            console.log(copy);
                            return copy;
                        } else {
                            return prev;
                        }
                    });
                }
            },
        },
        {
            label: "Payload",
            type: "custom",
            jsonName: "d",
            element: (
                <MonacoEditorComponent
                    onChange={(v) => {
                        console.log(v);
                        if (!v) return;
                        payload.current = v;
                    }}
                    theme="vs-dark"
                    defaultLanguage="json"
                    height={150}
                    className="editor"
                />
            ),
            grabValue: () => {
                return JSON.parse(payload.current || "{}");
            },
        },
    ]);
    useEffect(() => {
        req("/websockets", "GET").then((res) => {
            setSockets(res);
        });
    }, []);
    return (
        <div className="page-content">
            <Dialog
                onClose={(d: { op: OpCodes; d: any; t?: DiscordGatewayEvent }) => {
                    req(`/ws/${title}`, "POST", {
                        d: d.d,
                        op: OpCodes[d.op],
                        t: (OpCodes as any)[d.op] === OpCodes.DISPATCH ? d.t : undefined,
                    });
                }}
                innerRef={dialog}
                title={title}
                elements={elements}
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
						{ socket.PackagedAccount ? (<UserCard style={{ width: "calc(100% + 36px)", borderRadius: "10px 10px 0px 0px"}} displayMode="GENERAL_INFO" user={socket.PackagedAccount} />) : null }
                        <JSONToCard
                        style={{
                            borderRadius: "0px 0px 10px 10px"
                        }}
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
