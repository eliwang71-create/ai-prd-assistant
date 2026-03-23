import fs from "node:fs";
import path from "node:path";

const ENV_FILES = [".env.local", ".env"];
const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
const OPENAI_BASE_URL = "https://api.openai.com/v1";

loadEnvFiles();

export function isDemoModeEnabled() {
    return TRUE_VALUES.has(String(process.env.PRD_COPILOT_DEMO || "").trim().toLowerCase()) || !hasApiKey();
}

export function hasApiKey() {
    return Boolean(getConfiguredApiKey());
}

export function getConfiguredApiKey() {
    return String(process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || "").trim();
}

export function getConfiguredProvider() {
    const explicitProvider = String(process.env.LLM_PROVIDER || "").trim().toLowerCase();

    if (explicitProvider) {
        return explicitProvider;
    }

    const configuredBaseUrl = String(process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL || "").trim().toLowerCase();
    const configuredModel = String(process.env.LLM_MODEL || process.env.OPENAI_MODEL || "").trim().toLowerCase();

    if (configuredBaseUrl.includes("generativelanguage.googleapis.com") || configuredModel.startsWith("gemini")) {
        return "gemini";
    }

    return "openai";
}

export function getConfiguredBaseUrl(provider = getConfiguredProvider()) {
    const explicitBaseUrl = String(process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL || "").trim();

    if (explicitBaseUrl) {
        return explicitBaseUrl;
    }

    return provider === "gemini" ? GEMINI_BASE_URL : OPENAI_BASE_URL;
}

export function getConfiguredModel(provider = getConfiguredProvider()) {
    const explicitModel = String(process.env.LLM_MODEL || process.env.OPENAI_MODEL || "").trim();

    if (explicitModel) {
        return explicitModel;
    }

    return provider === "gemini" ? "gemini-2.5-flash" : "gpt-4.1-mini";
}

function loadEnvFiles() {
    for (const fileName of ENV_FILES) {
        const filePath = path.resolve(process.cwd(), fileName);

        if (!fs.existsSync(filePath)) {
            continue;
        }

        const content = fs.readFileSync(filePath, "utf8");

        for (const line of content.split(/\r?\n/)) {
            const trimmed = line.trim();

            if (!trimmed || trimmed.startsWith("#")) {
                continue;
            }

            const equalIndex = trimmed.indexOf("=");

            if (equalIndex === -1) {
                continue;
            }

            const key = trimmed.slice(0, equalIndex).trim();
            const rawValue = trimmed.slice(equalIndex + 1).trim();
            const normalizedValue = rawValue.replace(/^['"]|['"]$/g, "");

            if (key && process.env[key] === undefined) {
                process.env[key] = normalizedValue;
            }
        }
    }
}
