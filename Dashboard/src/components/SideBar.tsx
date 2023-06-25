import { ws } from "@/main";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Sidebar(props: {
    sidebarContent: {
        title: string;
        content: {
            title: string;
            route: string;
        }[];
    }[];
    readyState: number;
}) {
    const navigate = useNavigate();
    const selected = useRef<HTMLDivElement | null>(null);
    const [readyState, setReadyState] = useState(props.readyState);
    useEffect(() => {
        const timer = setInterval(() => {
            setReadyState(ws.readyState);
        }, 100); // Adjust the interval time as per your preference
        return () => {
            clearInterval(timer);
        };
    }, []);
    return (
        <div className="sidebar-container">
            <div className="sidebar-section">
                {props.sidebarContent.map((section) => (
                    <div key={section.title} style={{ display: "flex", flexDirection: "column" }}>
                        <div className="sidebar-section-title">{section.title}</div>
                        <div className="sidebar-section-content">
                            {section.content.map((item) => (
                                <div
                                    key={item.title}
                                    className="sidebar-button"
                                    onClick={(e) => {
                                        if (selected.current) {
                                            selected.current.classList.remove("selected");
                                        }
                                        navigate(item.route);
                                        selected.current = e.currentTarget;
                                        selected.current.classList.add("selected");
                                    }}
                                >
                                    {item.title}
                                </div>
                            ))}
                        </div>
                        <div className="sidebar-section-divider"></div>
                    </div>
                ))}
            </div>
            <div style={{ height: "100%" }}>
                <div
                    style={{
                        position: "absolute",
                        color: "var(--discord-text-muted)",
                        fontSize: 12,
                        left: 28,
                        bottom: 24,
                    }}
                >
                    Dashboard v1 - Made by{" "}
                    <a target="_blank" href="https://moondust.dev/~maddie">
                        Maddie
                    </a>
                    <br />
                    {readyState !== WebSocket.OPEN ? (
                        <div
                            style={{
                                color: "var(--discord-text-muted)",
                                fontSize: 12,
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <div
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 32,
                                    backgroundColor: "#f23f43",
                                    display: "inline",
                                    fontSize: 8,
                                    marginRight: 4,
                                }}
                            ></div>
                            Not connected to server -&nbsp;
                            <a href="#" onClick={() => window.location.reload()}>
                                reload
                            </a>
                        </div>
                    ) : (
                        <div
                            style={{
                                color: "var(--discord-text-muted)",
                                fontSize: 12,
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <div
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 32,
                                    backgroundColor: "#23a55a",
                                    display: "inline",
                                    fontSize: 8,
                                    marginRight: 4,
                                }}
                            ></div>
                            Connected to server
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

