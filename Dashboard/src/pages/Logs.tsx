import { ws } from "@/main";
import { useEffect, useRef, useState } from "react";

export interface WebsocketMessage<I> {
    Type: "log";
    Data: I;
}

export default function Logs() {
    const [logs, setLogs] = useState<string[]>([]);
    const codeRef = useRef<HTMLPreElement>(null);

    function handleMsg(e: MessageEvent) {
        const data: WebsocketMessage<string> = JSON.parse(e.data);
        console.log(data);
        if (data.Type === "log") {
            setLogs((prev) => [...prev, data.Data]);
        }
    }

    useEffect(() => {
        ws.addEventListener("message", handleMsg);
        return () => {
            ws.removeEventListener("message", handleMsg);
        };
    }, []);

    useEffect(() => {
        // Scroll to the bottom when logs change
        codeRef.current?.scrollTo(0, codeRef.current.scrollHeight);
    }, [logs]);

    return (
        <div className="page-content">
            <code ref={codeRef} className="logs">
                {logs.map((log, index) => (
                    <div key={index}>{log}</div>
                ))}
            </code>
        </div>
    );
}
