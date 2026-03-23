const DEFAULT_DOC = {
    product_background: "",
    user_pain_points: [],
    user_persona: "",
    core_goal: "",
    feature_modules: [],
    user_flow: [],
    key_pages: [],
    metrics: []
};

export function parseRequestBody(body) {
    return {
        raw_requirement_text: typeof body?.raw_requirement_text === "string" ? body.raw_requirement_text.trim() : "",
        doc_style: typeof body?.doc_style === "string" ? body.doc_style : "prd",
        rewrite_style: typeof body?.rewrite_style === "string" ? body.rewrite_style : "pm_style",
        diagram_type: typeof body?.diagram_type === "string" ? body.diagram_type : "user_flow",
        provider: typeof body?.provider === "string" ? body.provider : "",
        selected_model: typeof body?.selected_model === "string" ? body.selected_model : "",
        run_mode: typeof body?.run_mode === "string" ? body.run_mode : "demo",
        parsed_requirement: body?.parsed_requirement || null,
        document: body?.document || null,
        history_id: body?.history_id || null
    };
}

export function assertRawRequirementText(rawRequirementText) {
    if (!rawRequirementText || rawRequirementText.trim().length < 8) {
        throw new Error("请输入更完整的需求描述，至少包含目标或功能信息。");
    }
}

export function normalizeParsedRequirement(value, { rawRequirementText = "", diagramType = "user_flow" } = {}) {
    const normalized = {
        requirement_name: normalizeString(value?.requirement_name) || deriveRequirementName(rawRequirementText),
        target_user: normalizeString(value?.target_user),
        user_pain_points: normalizeStringArray(value?.user_pain_points),
        core_goal: normalizeString(value?.core_goal),
        feature_modules: normalizeStringArray(value?.feature_modules),
        key_pages: normalizeStringArray(value?.key_pages),
        success_metrics: normalizeStringArray(value?.success_metrics),
        diagram_suggestion: normalizeString(value?.diagram_suggestion) || diagramType,
        missing_items: normalizeStringArray(value?.missing_items)
    };

    if (!normalized.target_user) {
        normalized.missing_items = mergeUnique(normalized.missing_items, ["目标用户"]);
    }

    if (!normalized.core_goal) {
        normalized.missing_items = mergeUnique(normalized.missing_items, ["核心目标"]);
    }

    if (normalized.feature_modules.length === 0) {
        normalized.missing_items = mergeUnique(normalized.missing_items, ["功能模块"]);
    }

    return normalized;
}

export function normalizeDocument(value, parsedRequirement) {
    const document = value || DEFAULT_DOC;

    return {
        product_background: normalizeString(document.product_background) || `${parsedRequirement?.requirement_name || "该需求"} 需要被整理成一份可评审、可协作的产品文档。`,
        user_pain_points: normalizeStringArray(document.user_pain_points).length
            ? normalizeStringArray(document.user_pain_points)
            : normalizeStringArray(parsedRequirement?.user_pain_points),
        user_persona: normalizeString(document.user_persona) || `${parsedRequirement?.target_user || "目标用户"}，需要更快完成需求初稿和协作对齐。`,
        core_goal: normalizeString(document.core_goal) || normalizeString(parsedRequirement?.core_goal),
        feature_modules: normalizeNamedList(document.feature_modules, "description", "用于承接该需求中的关键功能模块。", parsedRequirement?.feature_modules),
        user_flow: normalizeStringArray(document.user_flow).length
            ? normalizeStringArray(document.user_flow)
            : ["输入需求", "确认结构", "生成文档", "继续优化", "导出流程图"],
        key_pages: normalizeNamedList(document.key_pages, "description", "用于展示或承接对应阶段的内容。", parsedRequirement?.key_pages),
        metrics: normalizeStringArray(document.metrics).length
            ? normalizeStringArray(document.metrics)
            : normalizeStringArray(parsedRequirement?.success_metrics)
    };
}

export function normalizeDiagram(diagram, { title = "PRD Copilot 流程图", diagramType = "user_flow" } = {}) {
    const rawNodes = Array.isArray(diagram?.nodes) ? diagram.nodes : [];
    const nodes = rawNodes
        .map((node, index) => ({
            id: normalizeString(node?.id) || `n${index + 1}`,
            label: normalizeString(node?.label) || `步骤 ${index + 1}`
        }))
        .filter((node) => node.label);

    const edges = (Array.isArray(diagram?.edges) ? diagram.edges : [])
        .map((edge) => ({
            from: normalizeString(edge?.from),
            to: normalizeString(edge?.to),
            label: normalizeString(edge?.label)
        }))
        .filter((edge) => edge.from && edge.to && nodes.some((node) => node.id === edge.from) && nodes.some((node) => node.id === edge.to));

    const safeNodes = nodes.length
        ? nodes
        : [
              { id: "n1", label: "输入需求" },
              { id: "n2", label: "生成结果" }
          ];

    const safeEdges = edges.length
        ? edges
        : safeNodes.slice(0, -1).map((node, index) => ({
              from: node.id,
              to: safeNodes[index + 1].id,
              label: ""
          }));

    return {
        title: normalizeString(diagram?.title) || title,
        diagram_type: normalizeString(diagram?.diagram_type) || diagramType,
        nodes: safeNodes,
        edges: safeEdges
    };
}

export function buildQualityReport({ parsedRequirement, document }) {
    const missingItems = [];
    const weakItems = [];
    const notes = [];

    if (!parsedRequirement?.target_user) {
        missingItems.push("缺少目标用户");
    }

    if (!parsedRequirement?.core_goal) {
        missingItems.push("缺少核心目标");
    }

    if (!Array.isArray(document?.metrics) || document.metrics.length === 0) {
        missingItems.push("缺少指标建议");
    }

    if (!Array.isArray(document?.user_flow) || document.user_flow.length < 4) {
        weakItems.push("用户流程偏短，建议补充更多关键步骤");
    }

    if (!Array.isArray(document?.feature_modules) || document.feature_modules.length < 3) {
        weakItems.push("功能模块偏少，建议补充核心模块和边界能力");
    }

    if (!Array.isArray(document?.key_pages) || document.key_pages.length < 2) {
        weakItems.push("关键页面说明较少");
    }

    if (Array.isArray(parsedRequirement?.missing_items) && parsedRequirement.missing_items.length) {
        notes.push(`输入阶段仍缺少：${parsedRequirement.missing_items.join("、")}`);
    }

    if (missingItems.length === 0) {
        notes.push("基础结构完整，可以继续进入评审或协作视图。")
;    }

    const score = Math.max(52, 100 - missingItems.length * 12 - weakItems.length * 5);

    return {
        score,
        missing_items: missingItems,
        weak_items: weakItems,
        notes
    };
}

export function buildCollaborationView(document, parsedRequirement) {
    const featureNames = normalizeNamedList(document?.feature_modules).map((item) => item.name);
    const openQuestions = [];

    if (parsedRequirement?.missing_items?.length) {
        openQuestions.push(...parsedRequirement.missing_items.map((item) => `待补充：${item}`));
    }

    if (openQuestions.length === 0) {
        openQuestions.push("是否需要继续细化异常流程和验收边界");
    }

    return {
        engineering_view: {
            feature_points: featureNames,
            main_flow: normalizeStringArray(document?.user_flow),
            edge_cases: [
                "输入内容过短时无法稳定识别目标用户",
                "流程图节点过多时需要折叠展示",
                "文档优化后需要保持字段结构不变"
            ],
            open_questions: openQuestions
        },
        testing_view: {
            acceptance_points: [
                "能稳定生成固定 8 个模块",
                "输入过少时会明确提示缺失项",
                "导出的 drawio 文件可以直接打开"
            ],
            exception_flows: [
                "模型返回非法 JSON",
                "未配置 API Key 且未开启演示模式",
                "历史记录读取失败"
            ],
            risk_points: [
                "模型补全过满导致业务失真",
                "改写后语义偏移",
                "流程图节点与文档流程不一致"
            ]
        }
    };
}

function normalizeNamedList(value, descriptionKey = "description", fallbackDescription = "", fallbackNames = []) {
    const items = Array.isArray(value) ? value : [];
    const normalized = items
        .map((item) => {
            if (typeof item === "string") {
                return {
                    name: item.trim(),
                    [descriptionKey]: fallbackDescription || `${item.trim()}需要进一步补充说明。`
                };
            }

            if (!item || typeof item !== "object") {
                return null;
            }

            const name = normalizeString(item.name || item.title);
            const description = normalizeString(item[descriptionKey]) || fallbackDescription || `${name || "该项"}需要进一步补充说明。`;

            if (!name) {
                return null;
            }

            return {
                name,
                [descriptionKey]: description
            };
        })
        .filter(Boolean);

    if (normalized.length > 0) {
        return normalized;
    }

    return normalizeStringArray(fallbackNames).map((name) => ({
        name,
        [descriptionKey]: fallbackDescription || `${name}需要进一步补充说明。`
    }));
}

function normalizeString(value) {
    return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item) => normalizeString(typeof item === "string" ? item : item?.name || item?.label || ""))
        .filter(Boolean);
}

function deriveRequirementName(rawRequirementText) {
    const trimmed = normalizeString(rawRequirementText);
    return trimmed ? trimmed.slice(0, 18) : "未命名需求";
}

function mergeUnique(baseItems, nextItems) {
    return [...new Set([...(baseItems || []), ...(nextItems || [])])];
}
