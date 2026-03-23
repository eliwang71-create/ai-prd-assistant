import fs from "node:fs";
import path from "node:path";

const examplesDir = path.resolve(process.cwd(), "examples");

const SAMPLE_PARSED_REQUIREMENT = readJson("parsed-requirement.json");
const SAMPLE_DOCUMENT = readJson("generated-document.json");
const SAMPLE_DIAGRAM = readJson("generated-diagram.json");
const SAMPLE_QUALITY_REPORT = readJson("quality-report.json");
const SAMPLE_ENGINEERING_VIEW = readJson("engineering-view.json");

export function buildSampleParsedRequirement(rawRequirementText, diagramType = "user_flow") {
    const parsed = structuredClone(SAMPLE_PARSED_REQUIREMENT);
    parsed.requirement_name = deriveRequirementName(rawRequirementText) || parsed.requirement_name;
    parsed.diagram_suggestion = diagramType;
    return parsed;
}

export function buildSampleDocument(parsedRequirement) {
    const document = structuredClone(SAMPLE_DOCUMENT);
    document.product_background = `${parsedRequirement.requirement_name || "该需求"} 用来帮助 ${parsedRequirement.target_user || "目标用户"} 更快把零散想法整理成结构化产品文档。`;
    document.user_pain_points = parsedRequirement.user_pain_points?.length
        ? parsedRequirement.user_pain_points
        : document.user_pain_points;
    document.user_persona = `${parsedRequirement.target_user || "产品经理"}，需要频繁撰写 PRD、功能说明或评审文档。`;
    document.core_goal = parsedRequirement.core_goal || document.core_goal;
    document.feature_modules = (parsedRequirement.feature_modules || []).map((item) => ({
        name: item,
        description: `${item}模块用于承接该需求中的关键动作与协作输出。`
    }));
    document.key_pages = (parsedRequirement.key_pages || []).map((item) => ({
        name: item,
        description: `${item}用于承接对应的操作与结果展示。`
    }));
    document.metrics = parsedRequirement.success_metrics?.length ? parsedRequirement.success_metrics : document.metrics;
    return document;
}

export function buildSampleOptimizedDocument(document, rewriteStyle) {
    const nextDocument = structuredClone(document);
    const prefix = getStylePrefix(rewriteStyle);

    nextDocument.product_background = `${prefix}${document.product_background}`;
    nextDocument.user_persona = `${prefix}${document.user_persona}`;
    nextDocument.core_goal = `${prefix}${document.core_goal}`;
    nextDocument.user_pain_points = rewriteList(document.user_pain_points, prefix);
    nextDocument.metrics = rewriteList(document.metrics, prefix);
    nextDocument.user_flow = rewriteList(document.user_flow, prefix);
    nextDocument.feature_modules = (document.feature_modules || []).map((item) => ({
        name: item.name,
        description: `${prefix}${item.description}`
    }));
    nextDocument.key_pages = (document.key_pages || []).map((item) => ({
        name: item.name,
        description: `${prefix}${item.description}`
    }));

    return nextDocument;
}

export function buildSampleDiagram(parsedRequirement, document, diagramType = "user_flow") {
    const diagram = structuredClone(SAMPLE_DIAGRAM);
    diagram.diagram_type = diagramType;
    diagram.title = `${parsedRequirement.requirement_name || "未命名需求"} 用户流程`;

    const labels = Array.isArray(document?.user_flow) && document.user_flow.length
        ? document.user_flow
        : diagram.nodes.map((item) => item.label);

    diagram.nodes = labels.map((label, index) => ({
        id: `n${index + 1}`,
        label
    }));
    diagram.edges = diagram.nodes.slice(0, -1).map((node, index) => ({
        from: node.id,
        to: diagram.nodes[index + 1].id,
        label: index === 0 ? "开始" : ""
    }));
    return diagram;
}

export function getSampleQualityReport() {
    return structuredClone(SAMPLE_QUALITY_REPORT);
}

export function getSampleEngineeringView() {
    return structuredClone(SAMPLE_ENGINEERING_VIEW);
}

function readJson(fileName) {
    return JSON.parse(fs.readFileSync(path.join(examplesDir, fileName), "utf8"));
}

function deriveRequirementName(rawRequirementText = "") {
    const trimmed = rawRequirementText.trim();

    if (!trimmed) {
        return "未命名需求";
    }

    return trimmed.slice(0, 18);
}

function getStylePrefix(rewriteStyle) {
    const labelMap = {
        formal: "【正式版】",
        concise: "【精简版】",
        pm_style: "【产品版】",
        prd_style: "【PRD版】",
        report_style: "【汇报版】"
    };

    return labelMap[rewriteStyle] || "【优化版】";
}

function rewriteList(items, prefix) {
    return (items || []).map((item) => `${prefix}${item}`);
}
