import Dialog from "@/components/Dialog";
import UserCard, { IUser } from "@/components/UserCard";
import { req } from "@/util/apiFuncs";
import { useEffect, useRef, useState } from "react";

export default function SystemMessages() {
    const sendDialog = useRef<HTMLDialogElement>(null);
    const [account, setAccount] = useState<IUser>();

    useEffect(() => {
        req("/SystemAccount", "GET").then((v) => {
            setAccount(v.data);
        });
    }, []);

    return (
        <div className="page-content">
            <h2>System Messages</h2>
            {account !== undefined ? (
                <UserCard displayMode="DETAILS" user={account} style={{ maxWidth: "700px" }} />
            ) : null}
            <h3>All Messages</h3>
            <button
                onClick={(e) => {
                    e.preventDefault();
                    sendDialog.current?.showModal();
                }}
                style={{
                    width: 100,
                }}
            >
                Create
            </button>

            <Dialog
                title="Send a System Message"
                elements={[
                    {
                        label: "Message Content",
                        type: "text",
                        jsonName: "Content",
                        placeholder: "Hello, {USER}!",
                    },
                    {
                        label: "Recipient (optional)",
                        type: "text",
                        jsonName: "Recipient",
                        placeholder: "123456789012345678",
                    },
                ]}
                innerRef={sendDialog}
                onClose={(data) => {
                    req("/SystemMessages", "POST", data);
                }}
            />
        </div>
    );
}
