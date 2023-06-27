import Dialog from "@/components/Dialog";
import { JSONToCard } from "@/components/JSONToCard";
import { req } from "@/util/apiFuncs";
import { useEffect, useRef, useState } from "react";

export default function Gifts() {
    const dialog = useRef<HTMLDialogElement>(null);
    const [gifts, setGifts] = useState<any[]>([]);
    useEffect(() => {
        req("/gifts/gifts", "GET").then((res) => setGifts(res));
    }, []);

    return (
        <div className="page-content">
            <h2>Gifts</h2>
            <button
                onClick={(e) => {
                    e.preventDefault();
                    dialog.current?.showModal();
                }}
                style={{
                    width: 100,
                }}
            >
                Add a gift
            </button>
            <Dialog
                title="Add a gift"
                elements={[
                    {
                        label: "Gift ID",
						jsonName: "giftId",
                        type: "text",
                        placeholder: "1234567890123456789",
                    },
                ]}
                innerRef={dialog}
            />
            <div className="gifts">
                {gifts.map((gift, index) => (
                    <JSONToCard
                        style={{
                            marginBottom: 28,
                        }}
                        handleSave={(e) => {
                            req(`/gifts/gifts/${gift.Code}`, "PATCH", {
                                Code: e.Code,
                                ...e,
                            }).then(() => {
                                setGifts((prev) => {
                                    prev[index] = e;
                                    return [...prev];
                                });
                            });
                        }}
                        key={index}
                        data={gift}
                        title={gift.Code}
                    >
                        <button
                            style={{
                                float: "right",
                            }}
                            onClick={() => {
                                navigator.clipboard.writeText(`discord.gift/${gift.Code}`);
                            }}
                        >
                            Copy gift link to clipboard
                        </button>
                    </JSONToCard>
                ))}
            </div>
        </div>
    );
}
