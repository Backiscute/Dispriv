import React from "react";
import ReactDOM from "react-dom/client";
import SideBar from "./components/SideBar";
import "./App.scss";
import {
    BrowserRouter,
    Route,
    Routes,
} from "react-router-dom";
import Guild from "./pages/ManageGuilds";
import ServerSetup from "./pages/ServerSetup";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <div
        style={{
            display: "flex",
        }}
    >
        <BrowserRouter>
            <SideBar
                sidebarContent={[
                    {
                        title: "Dispriv",
                        content: [
                            {
                                route: "/dispriv/setup",
                                title: "Server Setup",
                            },
                            {
                                route: "/dispriv/services",
                                title: "Services",
                            },
                            {
                                route: "/dispriv/permissions",
                                title: "Permissions",
                            }
                        ],
                    },
                    {
                        title: "Quick Settings",
                        content: [
                            {
                                route: "/qs/experiments",
                                title: "Experiments",
                            },
                            {
                                route: "/qs/changelogs",
                                title: "Changelogs",
                            }
                        ],
                    },
                    {
                        title: "Global Settings",
                        content: [
                            {
                                route: "/gs/guilds",
                                title: "Guilds",
                            },
                            {
                                route: "/gs/users",
                                title: "Users",
                            },
                            {
                                route: "/gs/sysmessages",
                                title: "System Messages",
                            }
                        ],
                    },
                    {
                        title: "Manage Content",
                        content: [
                            {
                                route: "/mc/guilds",
                                title: "Guilds",
                            },
                            {
                                route: "/mc/badges",
                                title: "Badges",
                            },
                            {
                                route: "/mc/media",
                                title: "Media",
                            },
                            {
                                route: "/mc/users",
                                title: "Users",
                            },
                            {
                                route: "/mc/discovery",
                                title: "Discovery",
                            },
                            {
                                route: "/mc/gifts",
                                title: "Gifts",
                            },
                            {
                                route: "/mc/apps",
                                title: "Applications",
                            }
                        ],
                    }
                ]}
            />
            <Routes>
                <Route path="/" element={<></>} />
                <Route path="/mc/guilds" element={<Guild />} />,
                <Route path="/dispriv/setup" element={<ServerSetup />} />
            </Routes>
        </BrowserRouter>
    </div>
);
