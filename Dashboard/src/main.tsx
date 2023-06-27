import React from "react";
import ReactDOM from "react-dom/client";
import SideBar from "./components/SideBar";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Guild from "./pages/ManageGuilds";
import ServerSetup from "./pages/ServerSetup";
import Gifts from "./pages/Gifts";
import Logs from "./pages/Logs";
import Sockets from "./pages/Sockets";
import "react-dropdown/style.css";
import "./App.scss";
import { loader } from "@monaco-editor/react";
import path from "path";
import SystemMessages from "./pages/SystemMessages";
import dotenv from "dotenv";

dotenv.config();

export const ws = new WebSocket(process.env.WS!);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <div
        style={{
            display: "flex",
        }}
    >
        <BrowserRouter>
            <SideBar
                readyState={ws.readyState}
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
                            },
                            {
                                route: "/dispriv/logs",
                                title: "Logs",
                            },
                            {
                                route: "/dispriv/sockets",
                                title: "Gateway Connections",
                            },
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
                            },
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
                            },
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
                                route: "/mc/apps",
                                title: "Applications",
                            },
                        ],
                    },
                    {
                        title: "Manage Gifts",
                        content: [
                            {
                                route: "/mg/gifts",
                                title: "Gifts",
                            },
                            {
                                route: "/mg/skus",
                                title: "SKUs",
                            },
                            {
                                route: "/mg/subscriptionplans",
                                title: "Subscription Plans",
                            },
                        ],
                    },
                ]}
            />
            <Routes>
                <Route path="/" element={<></>} />
                <Route path="/dispriv/setup" element={<ServerSetup />} />
                <Route path="/dispriv/logs" element={<Logs />} />
                <Route path="/dispriv/sockets" element={<Sockets />} />
                <Route path="/gs/sysmessages" element={<SystemMessages />} />
                <Route path="/mc/guilds" element={<Guild />} />,
                <Route path="/mg/gifts" element={<Gifts />} />
            </Routes>
        </BrowserRouter>
    </div>,
);
