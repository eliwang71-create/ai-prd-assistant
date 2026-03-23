const JSON_HEADERS = {
    "Content-Type": "application/json"
};

async function request(path, options = {}) {
    const response = await fetch(path, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || "请求失败");
    }

    return data;
}

export function getHealth() {
    return request("/api/health");
}

export function parseRequirement(payload) {
    return request("/api/parse-requirement", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(payload)
    });
}

export function generateDocument(payload) {
    return request("/api/generate-document", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(payload)
    });
}

export function optimizeDocument(payload) {
    return request("/api/optimize-document", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(payload)
    });
}

export function generateDiagram(payload) {
    return request("/api/generate-diagram", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(payload)
    });
}

export function listHistory() {
    return request("/api/history");
}

export function getHistoryRecord(id) {
    return request(`/api/history/${id}`);
}
