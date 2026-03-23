import { getConfiguredApiKey, getConfiguredBaseUrl, getConfiguredModel, getConfiguredProvider, isDemoModeEnabled } from "./env.js";
import {
    buildSampleDiagram,
    buildSampleDocument,
    buildSampleOptimizedDocument,
    buildSampleParsedRequirement
} from "./sample-data.js";

export async function parseRequirementPayload(body) {
    if (shouldUseDemo(body)) {
        return buildSampleParsedRequirement(body.raw_requirement_text, body.diagram_type);
    }

    const schema = {
        requirement_name: "",
        target_user: "",
        user_pain_points: [],
        core_goal: "",
        feature_modules: [],
        key_pages: [],
        success_metrics: [],
        diagram_suggestion: body.diagram_type || "user_flow",
        missing_items: []
    };

    const systemPrompt = `
你是一个产品需求拆解助手。把用户输入的中文需求拆成稳定 JSON。
不要输出 markdown，不要解释，只输出 JSON。
如果某些关键字段缺失，请在 missing_items 中指出，不要编造过满信息。
JSON 字段必须包含：
requirement_name, target_user, user_pain_points, core_goal, feature_modules, key_pages, success_metrics, diagram_suggestion, missing_items
`;

    const userPrompt = `
原始需求：
${body.raw_requirement_text}

输出结构参考：
${JSON.stringify(schema, null, 2)}
`;

    return callJsonModel({ systemPrompt, userPrompt, body });
}

export async function generateDocumentPayload(body) {
    if (shouldUseDemo(body)) {
        return buildSampleDocument(body.parsed_requirement);
    }

    const schema = {
        product_background: "",
        user_pain_points: [],
        user_persona: "",
        core_goal: "",
        feature_modules: [{ name: "", description: "" }],
        user_flow: [],
        key_pages: [{ name: "", description: "" }],
        metrics: []
    };

    const systemPrompt = `
你是一个产品文档生成助手。根据结构化需求，输出固定 8 个模块的 JSON。
不要输出 markdown，不要解释，只输出 JSON。
字段必须包含：
product_background, user_pain_points, user_persona, core_goal, feature_modules, user_flow, key_pages, metrics
内容要偏产品经理表达，不要太空，不要重复。
`;

    const userPrompt = `
结构化需求：
${JSON.stringify(body.parsed_requirement, null, 2)}

输出结构参考：
${JSON.stringify(schema, null, 2)}
`;

    return callJsonModel({ systemPrompt, userPrompt, body });
}

export async function generateOptimizationPayload(body) {
    if (shouldUseDemo(body)) {
        return buildSampleOptimizedDocument(body.document, body.rewrite_style);
    }

    const styleMap = {
        formal: "更正式",
        concise: "更简洁",
        pm_style: "更偏产品经理表达",
        prd_style: "更偏 PRD 格式",
        report_style: "更适合汇报"
    };

    const systemPrompt = `
你是一个产品文档改写助手。
基于已有 JSON 文档结果做改写，不要改变字段结构，只调整表达方式。
不要输出 markdown，不要解释，只输出 JSON。
`;

    const userPrompt = `
改写目标：${styleMap[body.rewrite_style] || "保持结构，优化表达"}

当前文档：
${JSON.stringify(body.document, null, 2)}
`;

    return callJsonModel({ systemPrompt, userPrompt, body });
}

export async function generateDiagramPayload(body) {
    if (shouldUseDemo(body)) {
        return buildSampleDiagram(body.parsed_requirement, body.document, body.diagram_type);
    }

    const schema = {
        title: `${body.parsed_requirement?.requirement_name || "未命名需求"} 用户流程`,
        diagram_type: body.diagram_type || "user_flow",
        nodes: [{ id: "n1", label: "输入需求" }],
        edges: [{ from: "n1", to: "n2", label: "" }]
    };

    const systemPrompt = `
你是一个流程图结构生成助手。根据产品文档内容输出流程图 JSON。
不要输出 markdown，不要解释，不要输出 drawio XML，只输出 JSON。
要求：
1. nodes 和 edges 必须可直接用于生成流程图。
2. 节点名称使用中文，简洁清晰。
3. id 必须使用 n1, n2 这样的稳定格式。
4. edges 中的 from 和 to 必须引用已存在节点。
`;

    const userPrompt = `
结构化需求：
${JSON.stringify(body.parsed_requirement, null, 2)}

产品文档：
${JSON.stringify(body.document, null, 2)}

输出结构参考：
${JSON.stringify(schema, null, 2)}
`;

    return callJsonModel({ systemPrompt, userPrompt, body });
}

async function callJsonModel({ systemPrompt, userPrompt, body }) {
    const provider = resolveProvider(body);
    const apiKey = getConfiguredApiKey();
    const baseUrl = getConfiguredBaseUrl(provider);
    const model = resolveModel(body, provider);

    if (!apiKey) {
        throw new Error("缺少模型 API Key。请在 .env.local 中配置 LLM_API_KEY，或继续使用演示模式。");
    }

    let response;

    try {
        response = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                temperature: 0.3,
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: systemPrompt.trim() },
                    { role: "user", content: userPrompt.trim() }
                ]
            })
        });
    } catch (error) {
        throw new Error(`模型请求失败：${provider} / ${model}。请检查网络、Base URL 和 API Key 是否可用。`);
    }

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result?.error?.message || "模型调用失败");
    }

    const content = result?.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error("模型返回为空");
    }

    try {
        return JSON.parse(content);
    } catch {
        throw new Error("模型返回的内容不是合法 JSON");
    }
}

function resolveProvider(body) {
    const provider = String(body?.provider || "").trim().toLowerCase();
    return provider || getConfiguredProvider();
}

function resolveModel(body, provider) {
    const selectedModel = String(body?.selected_model || "").trim();
    return selectedModel || getConfiguredModel(provider);
}

function shouldUseDemo(body) {
    return body?.run_mode === "demo" || isDemoModeEnabled();
}
