import { useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function Sidebar(props: {
    sidebarContent: {
        title: string;
        content: {
            title: string;
            route: string;
        }[];
    }[];
}) {
    const navigate = useNavigate();
    const selected = useRef<HTMLDivElement | null>(null);
    return (
        <div className="sidebar-container">
            <div className="sidebar-section">
                {props.sidebarContent.map((section) => (
                    <div
                        key={section.title}
                        style={{ display: "flex", flexDirection: "column" }}
                    >
                        <div className="sidebar-section-title">
                            {section.title}
                        </div>
                        <div className="sidebar-section-content">
                            {section.content.map((item) => (
                                <div
                                    key={item.title}
                                    className="sidebar-button"
                                    onClick={(e) => {
                                        if (selected.current) {
                                            selected.current.classList.remove(
                                                "selected"
                                            );
                                        }
                                        navigate(item.route);
                                        selected.current = e.currentTarget;
                                        selected.current.classList.add(
                                            "selected"
                                        );
                                    }}
                                >
                                    {item.title}
                                </div>
                            ))}
                        </div>
                        <div className="sidebar-section-divider"></div>
                    </div>
                ))}
            </div>
        </div>
    );
}
