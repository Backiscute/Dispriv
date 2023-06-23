import { useEffect, useRef, useState } from "react";

export default function Logs() {
    const [logs, setLogs] = useState<string[]>([]);
    useEffect(() => {
        const ws = new WebSocket("ws://localhost:6970/api/tests/ws");
        ws.onopen = () => {
            console.log("connected");
        };
        ws.onmessage = (e) => {
            setLogs([...logs, e.data]);
        };
        ws.onclose = () => {
            console.log("disconnected");
        };
    }, []);
    return (
        <div className="page-content">
            <code className="logs">
                {logs.map((log) => (
                    <div>{log}</div>
                ))}
            </code>
        </div>
    );
}

