import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const storageDir = path.resolve(process.cwd(), ".local-data");
const dbPath = path.join(storageDir, "prd-copilot.sqlite");

if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);

export function ensureDb() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS history_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            raw_requirement_text TEXT NOT NULL,
            parsed_requirement_json TEXT,
            document_json TEXT,
            diagram_json TEXT,
            quality_report_json TEXT,
            rewrite_style TEXT,
            doc_style TEXT,
            diagram_type TEXT,
            created_at TEXT NOT NULL
        );
    `);
}

export function saveOrUpdateHistoryRecord({
    id,
    rawRequirementText,
    parsedRequirement,
    document,
    diagram,
    qualityReport,
    rewriteStyle,
    docStyle,
    diagramType
}) {
    const now = new Date().toISOString();

    if (id) {
        const stmt = db.prepare(`
            UPDATE history_records
            SET raw_requirement_text = ?,
                parsed_requirement_json = ?,
                document_json = ?,
                diagram_json = ?,
                quality_report_json = ?,
                rewrite_style = ?,
                doc_style = ?,
                diagram_type = ?
            WHERE id = ?
        `);

        stmt.run(
            rawRequirementText || "",
            stringifyOrNull(parsedRequirement),
            stringifyOrNull(document),
            stringifyOrNull(diagram),
            stringifyOrNull(qualityReport),
            rewriteStyle || null,
            docStyle || null,
            diagramType || null,
            Number(id)
        );

        return Number(id);
    }

    const stmt = db.prepare(`
        INSERT INTO history_records (
            raw_requirement_text,
            parsed_requirement_json,
            document_json,
            diagram_json,
            quality_report_json,
            rewrite_style,
            doc_style,
            diagram_type,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
        rawRequirementText || "",
        stringifyOrNull(parsedRequirement),
        stringifyOrNull(document),
        stringifyOrNull(diagram),
        stringifyOrNull(qualityReport),
        rewriteStyle || null,
        docStyle || null,
        diagramType || null,
        now
    );

    return Number(result.lastInsertRowid);
}

export function listHistoryRecords() {
    const stmt = db.prepare(`
        SELECT id, raw_requirement_text, parsed_requirement_json, created_at
        FROM history_records
        ORDER BY id DESC
        LIMIT 12
    `);

    return stmt.all().map((row) => {
        const parsed = parseJson(row.parsed_requirement_json);

        return {
            id: row.id,
            raw_requirement_text: row.raw_requirement_text,
            requirement_name: parsed?.requirement_name || "",
            created_at: row.created_at
        };
    });
}

export function getHistoryRecord(id) {
    const stmt = db.prepare(`
        SELECT *
        FROM history_records
        WHERE id = ?
        LIMIT 1
    `);
    const row = stmt.get(Number(id));

    if (!row) {
        return null;
    }

    return {
        ...row,
        parsed_requirement_json: parseJson(row.parsed_requirement_json),
        document_json: parseJson(row.document_json),
        diagram_json: parseJson(row.diagram_json),
        quality_report_json: parseJson(row.quality_report_json)
    };
}

function stringifyOrNull(value) {
    if (value === undefined || value === null) {
        return null;
    }

    return JSON.stringify(value);
}

function parseJson(value) {
    if (!value) {
        return null;
    }

    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}
