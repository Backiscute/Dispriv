import Dialog from "@/components/Dialog";
import { useRef } from "react";
import murmurhash3 from "murmurhash3js";

export default function Debug() {
    const convertDialog = useRef<HTMLDialogElement>(null);

    return (
        <div className="page-content">
            <h2>Debug Toolset</h2>
            <Dialog 
                title="Murmurhash3 Test"
                elements={[
                    {
                        label: "Text to hash",
                        jsonName: "textToHash",
                        type: "text",
                        placeholder: "2023-07_domain_connections",
                    },
                ]}
                onClose={async d => {
                    await navigator.clipboard.writeText(murmurhash3.x86.hash32(d.textToHash).toString());
                    alert(`murmurhash3.x86.hash32(VALUE): ${murmurhash3.x86.hash32(d.textToHash)}\nmurmurhash3.x86.hash128(VALUE): ${murmurhash3.x86.hash128(d.textToHash)}\nmurmurhash3.x64.hash128(VALUE): ${murmurhash3.x64.hash128(d.textToHash)}`);
                }}
                innerRef={convertDialog}
            />
            <button onClick={() => convertDialog.current?.showModal()} style={{ width: 150 }}>
                Test murmurhash3
            </button>
        </div>
    );
}