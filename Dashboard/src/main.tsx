import React from "react";
import ReactDOM from "react-dom/client";
import SideBar from "./components/SideBar";
import "./App.scss";
import {
    BrowserRouter,
    createBrowserRouter,
    Route,
    RouterProvider,
    Routes,
} from "react-router-dom";
import Guild from "./pages/ManageGuilds";

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
                        title: "Interactibles",
                        content: [
                            {
                                route: "/guilds",
                                title: "Manage Guilds",
                            },
                        ],
                    },
                ]}
            />
            <Routes>
                <Route path="/" element={<></>} />
                <Route path="/guilds" element={<Guild />} />
            </Routes>
        </BrowserRouter>
    </div>
);
