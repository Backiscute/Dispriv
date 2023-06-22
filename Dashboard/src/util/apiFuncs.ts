import { API_KEY, API_URL } from "./constants";

export async function req(url: string, method: string, body?: any) {
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
