import { getConfiguredModel, getConfiguredProvider, hasApiKey, isDemoModeEnabled } from "./lib/env.js";
import express from "express";
import { ensureDb, getHistoryRecord, listHistoryRecords, saveOrUpdateHistoryRecord } from "./lib/db.js";
import {
    generateDiagramPayload,
    generateDocumentPayload,
    generateOptimizationPayload,
    parseRequirementPayload
} from "./lib/openai.js";
import { buildDrawioXml } from "./lib/drawio.js";
import {
    assertRawRequirementText,
    buildCollaborationView,
    buildQualityReport,
    normalizeDiagram,
    normalizeDocument,
    normalizeParsedRequirement,
    parseRequestBody
} from "./lib/transformers.js";

const app = express();
const port = Number(process.env.SERVER_PORT || 3001);

ensureDb();

app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_request, response) => {
    response.json({
        ok: true,
        mode: isDemoModeEnabled() ? "demo" : "live",
        has_api_key: hasApiKey(),
        provider: getConfiguredProvider(),
        model: getConfiguredModel()
    });
});

app.get("/api/history", (_request, response) => {
    response.json({
        items: listHistoryRecords()
    });
});

app.get("/api/history/:id", (request, response) => {
    const record = getHistoryRecord(request.params.id);

    if (!record) {
        response.status(404).json({ error: "未找到对应历史记录" });
        return;
    }

    response.json(buildHistoryResponse(record));
});

app.post("/api/parse-requirement", async (request, response) => {
    try {
        const body = parseRequestBody(request.body);
        assertRawRequirementText(body.raw_requirement_text);

        const parsedRequirement = normalizeParsedRequirement(await parseRequirementPayload(body), {
            rawRequirementText: body.raw_requirement_text,
            diagramType: body.diagram_type
        });

        response.json(parsedRequirement);
    } catch (error) {
        respondWithError(response, error, "需求拆解失败");
    }
});

app.post("/api/generate-document", async (request, response) => {
    try {
        const body = parseRequestBody(request.body);
        assertRawRequirementText(body.raw_requirement_text);

        const previousRecord = body.history_id ? getHistoryRecord(body.history_id) : null;
        const parsedRequirement = normalizeParsedRequirement(
            body.parsed_requirement || previousRecord?.parsed_requirement_json || (await parseRequirementPayload(body)),
            {
                rawRequirementText: body.raw_requirement_text,
                diagramType: body.diagram_type
            }
        );

        const document = normalizeDocument(
            await generateDocumentPayload({
                ...body,
                parsed_requirement: parsedRequirement
            }),
            parsedRequirement
        );

        const qualityReport = buildQualityReport({ parsedRequirement, document });
        const collaborationView = buildCollaborationView(document, parsedRequirement);
        const previousVersions = previousRecord?.document_json?.versions || [];
        const versions = [
            ...previousVersions,
            {
                type: body.rewrite_style || "initial",
                created_at: new Date().toISOString(),
                document
            }
        ];

        const historyId = saveOrUpdateHistoryRecord({
            id: body.history_id,
            rawRequirementText: body.raw_requirement_text,
            parsedRequirement,
            document: {
                current: document,
                versions
            },
            diagram: previousRecord?.diagram_json || null,
            qualityReport,
            rewriteStyle: body.rewrite_style,
            docStyle: body.doc_style,
            diagramType: body.diagram_type
        });

        response.json({
            history_id: historyId,
            parsed_requirement: parsedRequirement,
            document,
            versions,
            quality_report: qualityReport,
            collaboration_view: collaborationView
        });
    } catch (error) {
        respondWithError(response, error, "文档生成失败");
    }
});

app.post("/api/optimize-document", async (request, response) => {
    try {
        const body = parseRequestBody(request.body);
        const previousRecord = body.history_id ? getHistoryRecord(body.history_id) : null;
        const parsedRequirement = normalizeParsedRequirement(body.parsed_requirement || previousRecord?.parsed_requirement_json, {
            rawRequirementText: body.raw_requirement_text || previousRecord?.raw_requirement_text || "",
            diagramType: body.diagram_type
        });
        const currentDocument = body.document || previousRecord?.document_json?.current;

        if (!currentDocument) {
            response.status(400).json({ error: "缺少 document" });
            return;
        }

        const optimizedDocument = normalizeDocument(
            await generateOptimizationPayload({
                rewrite_style: body.rewrite_style,
                document: currentDocument
            }),
            parsedRequirement
        );

        const qualityReport = buildQualityReport({
            parsedRequirement,
            document: optimizedDocument
        });
        const collaborationView = buildCollaborationView(optimizedDocument, parsedRequirement);
        const previousVersions = previousRecord?.document_json?.versions || [];
        const versions = [
            ...previousVersions,
            {
                type: body.rewrite_style || "optimized",
                created_at: new Date().toISOString(),
                document: optimizedDocument
            }
        ];

        const historyId = saveOrUpdateHistoryRecord({
            id: body.history_id,
            rawRequirementText: body.raw_requirement_text || previousRecord?.raw_requirement_text || "",
            parsedRequirement,
            document: {
                current: optimizedDocument,
                versions
            },
            diagram: previousRecord?.diagram_json || null,
            qualityReport,
            rewriteStyle: body.rewrite_style,
            docStyle: previousRecord?.doc_style || body.doc_style || "prd",
            diagramType: previousRecord?.diagram_type || body.diagram_type || "user_flow"
        });

        response.json({
            history_id: historyId,
            parsed_requirement: parsedRequirement,
            document: optimizedDocument,
            versions,
            quality_report: qualityReport,
            collaboration_view: collaborationView
        });
    } catch (error) {
        respondWithError(response, error, "文档优化失败");
    }
});

app.post("/api/generate-diagram", async (request, response) => {
    try {
        const body = parseRequestBody(request.body);
        const previousRecord = body.history_id ? getHistoryRecord(body.history_id) : null;
        const parsedRequirement = normalizeParsedRequirement(body.parsed_requirement || previousRecord?.parsed_requirement_json, {
            rawRequirementText: body.raw_requirement_text || previousRecord?.raw_requirement_text || "",
            diagramType: body.diagram_type
        });
        const document = normalizeDocument(body.document || previousRecord?.document_json?.current, parsedRequirement);
        const diagram = normalizeDiagram(
            await generateDiagramPayload({
                history_id: body.history_id,
                diagram_type: body.diagram_type,
                parsed_requirement: parsedRequirement,
                document
            }),
            {
                title: `${parsedRequirement.requirement_name || "未命名需求"} 用户流程`,
                diagramType: body.diagram_type
            }
        );
        const drawioXml = buildDrawioXml(diagram);
        const historyId = saveOrUpdateHistoryRecord({
            id: body.history_id,
            rawRequirementText: body.raw_requirement_text || previousRecord?.raw_requirement_text || "",
            parsedRequirement,
            document: previousRecord?.document_json || { current: document, versions: [] },
            diagram,
            qualityReport: previousRecord?.quality_report_json || buildQualityReport({ parsedRequirement, document }),
            rewriteStyle: previousRecord?.rewrite_style || body.rewrite_style || "pm_style",
            docStyle: previousRecord?.doc_style || body.doc_style || "prd",
            diagramType: body.diagram_type || previousRecord?.diagram_type || "user_flow"
        });

        response.json({
            history_id: historyId,
            diagram,
            drawio_xml: drawioXml,
            file_name: `prd-copilot-${Date.now()}.drawio`
        });
    } catch (error) {
        respondWithError(response, error, "流程图生成失败");
    }
});

app.listen(port, () => {
    console.log(`PRD Copilot server listening on http://127.0.0.1:${port}`);
});

function buildHistoryResponse(record) {
    return {
        ...record,
        drawio_xml: record.diagram_json ? buildDrawioXml(record.diagram_json) : null,
        versions: record.document_json?.versions || []
    };
}

function respondWithError(response, error, fallbackMessage) {
    const message = error?.message || fallbackMessage;
    const status = message.includes("请输入更完整") || message.includes("缺少 document") ? 400 : 500;
    response.status(status).json({ error: message });
}
