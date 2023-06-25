import GuildCard, { IServer } from "@/components/GuildCard";
import { req } from "@/util/apiFuncs";
import { useState } from "react";

export default function Guild() {
    const [guilds, setGuilds] = useState<IServer[]>();
    // let value;
    // function FilterGuilds(Search: string) {
    //     const G = (guilds ?? []).filter((G) =>
    //         /^\d+$/.test(Search) ? G.id.startsWith(Search) : G.name.toLowerCase().includes(Search.trim().toLowerCase()),
    //     );
    //     if (G.length === 0) {
    //         req(`/guilds?search=${Search}`, "GET").then((data) => {
    //             setGuilds(data);
    //         });
    //     }
    // }

    return (
        <div className="page-content">
            <div
                style={{
                    marginTop: 20,
                }}
            >
                <h2 style={{ display: "inline" }}>Guilds </h2>
                <span
                    style={{
                        color: "var(--discord-text-muted)",
                        fontSize: 12,
                    }}
                >{`(${guilds?.length || 0} result${guilds && guilds.length !== 1 ? "s" : ""})`}</span>
            </div>
            <input
                className="guild-search"
                placeholder="Search for a guild..."
                type="text"
                // value={value}
                onChange={(e) => {
                    req(`/guilds?search=${e.target.value}`, "GET").then((data) => {
                        setGuilds(data);
                    });
                }}
            />
            {guilds?.map((guild) => (
                <GuildCard key={guild.id} server={guild} />
            ))}
        </div>
    );
}
