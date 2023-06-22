import GuildCard, { IServer } from "@/components/GuildCard";
import { req } from "@/util/apiFuncs";
import { useEffect, useState } from "react";

export default function Guild() {
    const [guilds, setGuilds] = useState<IServer[]>();
    return (
        <div className="page-content">
            <h2>Guilds</h2>
            <input
                className="guild-search"
                placeholder="Search for a guild..."
                type="text"
                onChange={(e) => {
                    req(`/guilds?search=${e.target.value}`, "GET").then(
                        (data) => {
                            setGuilds(data);
                        }
                    );
                }}
            />
            {guilds?.map((guild) => (
                <GuildCard key={guild.id} server={guild} />
            ))}
        </div>
    );
}
