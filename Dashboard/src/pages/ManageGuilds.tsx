import GuildCard, { IServer } from "@/components/GuildCard";
import { req } from "@/util/apiFuncs";
import { useEffect, useState } from "react";

export default function Guild() {
    const [guilds, setGuilds] = useState<IServer[]>();
    let value;
    useEffect(() => {
        console.log("effect");
        req("/guilds", "GET").then(
            (data) => {
                setGuilds(data);
            }
        );
    }, [value]);

    function FilterGuilds(Search: string) {
        const G = (guilds ?? []).filter((G) => /^\d+$/.test(Search) ? G.id.startsWith(Search) : G.name.toLowerCase().includes(Search.trim().toLowerCase()));
        if (G.length === 0) {
            req(`/guilds?search=${Search}`, "GET").then(
                (data) => {
                    setGuilds(data);
                }
            );
        }
    }
    
    return (
        <div className="page-content">
            <h2>Guilds {guilds?.length ?? 0} {(guilds?.length ?? 0) === 1 ? "Result" : "Results"}</h2>
            <input
                className="guild-search"
                placeholder="Search for a guild..."
                type="text"
                value={value}
                onChange={(e) => {
                    FilterGuilds(e.target.value);
                }}
            />
            {guilds?.map((guild) => (
                <GuildCard key={guild.id} server={guild} />
            ))}
        </div>
    );
}