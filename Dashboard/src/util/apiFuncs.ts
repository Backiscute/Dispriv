import { API_KEY, API_URL } from "./constants";

type HTTPRequestTypes = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD";

export async function req(url: string, method: HTTPRequestTypes, body?: any) {
    const res = await fetch(`${API_URL}${url}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            Authorization: API_KEY,
        },
        body: JSON.stringify(body),
    });
    return await res.json();
}
