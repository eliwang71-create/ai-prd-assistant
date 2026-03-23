import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { generateDiagram, generateDocument, getHealth, getHistoryRecord, listHistory, optimizeDocument, parseRequirement } from "./api";

const DOC_SECTIONS = [
    ["product_background", "产品背景"],
    ["user_pain_points", "用户痛点"],
    ["user_persona", "用户画像"],
    ["core_goal", "核心目标"],
    ["feature_modules", "功能模块"],
    ["user_flow", "用户流程"],
    ["key_pages", "关键页面说明"],
    ["metrics", "指标建议"]
];

const REWRITE_STYLES = [
    { value: "pm_style", label: "更偏产品经理表达" },
    { value: "formal", label: "更正式" },
    { value: "concise", label: "更简洁" },
    { value: "prd_style", label: "更偏 PRD 格式" },
    { value: "report_style", label: "更适合汇报" }
];

const MODEL_OPTIONS = [
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" }
];

const RUN_MODE_OPTIONS = [
    { value: "demo", label: "Demo Mode" },
    { value: "live", label: "Live Mode" }
];

const EXAMPLES = [
    "做一个帮助产品经理自动生成 PRD 和流程图的工具，支持文档优化和 drawio 导出，适合在评审前快速整理需求。",
    "做一个面向求职用户的 JD 匹配助手，输入岗位描述和简历内容后输出匹配度、缺口和改写建议。",
    "做一个内容整理后台，把零散的项目、照片、视频和链接自动整理成作品集卡片和介绍文案。"
];

const DRAFT_STORAGE_KEY = "prd-copilot:draft";

function App() {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="/history/:id" element={<HistoryDetailPage />} />
        </Routes>
    );
}

function HomePage() {
    const navigate = useNavigate();
    const [rawRequirementText, setRawRequirementText] = useState(() => loadLocalDraft() || EXAMPLES[0]);
    const [historyItems, setHistoryItems] = useState([]);
    const [health, setHealth] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        Promise.all([getHealth(), listHistory()])
            .then(([healthResult, historyResult]) => {
                setHealth(healthResult);
                setHistoryItems(historyResult.items || []);
            })
            .catch((err) => setError(err.message));
    }, []);

    useEffect(() => {
        saveLocalDraft(rawRequirementText);
    }, [rawRequirementText]);

    const handleStart = () => {
        const query = new URLSearchParams({ q: rawRequirementText });
        navigate(`/workspace?${query.toString()}`);
    };

    return (
        <main className="page page--home">
            <section className="hero-card">
                <div className="hero-row">
                    <div className="hero-copy">
                        <div className="hero-eyebrow">PRD Copilot</div>
                        <h1>一句需求，生成文档与流程图。</h1>
                        <p>面向产品经理的需求文档与流程图生成助手。它聚焦需求整理、文档初稿生成、流程图导出和版本沉淀，适合放在简历和面试场景里演示。</p>
                    </div>
                    <HealthBadge health={health} />
                </div>
                <div className="hero-summary-grid">
                    <div className="summary-card">
                        <span>解决什么问题</span>
                        <p>把零散需求整理成结构化文档，减少 PRD 改写和流程图手工整理成本。</p>
                    </div>
                    <div className="summary-card">
                        <span>用户是谁</span>
                        <p>适合需要频繁写 PRD、功能说明和评审材料的产品经理。</p>
                    </div>
                    <div className="summary-card">
                        <span>核心流程</span>
                        <p>输入需求，结构化拆解，生成文档，优化表达，导出 draw.io，回看历史版本。</p>
                    </div>
                    <div className="summary-card">
                        <span>怎么演示</span>
                        <p>推荐默认使用 Demo Mode，真实模型接入作为 Live Mode 保留，用来补充技术完整度。</p>
                    </div>
                </div>
                <textarea
                    className="hero-textarea"
                    value={rawRequirementText}
                    onChange={(event) => setRawRequirementText(event.target.value)}
                    placeholder="输入一句需求或一段需求描述"
                />
                <div className="hero-actions">
                    <button type="button" className="btn btn--primary" onClick={handleStart}>
                        进入工作台
                    </button>
                    <button type="button" className="btn" onClick={() => setRawRequirementText(EXAMPLES[0])}>
                        使用示例
                    </button>
                </div>
                <div className="example-row">
                    {EXAMPLES.map((item) => (
                        <button key={item} type="button" className="chip" onClick={() => setRawRequirementText(item)}>
                            {item.slice(0, 22)}...
                        </button>
                    ))}
                </div>
                {error ? <div className="inline-error">{error}</div> : null}
            </section>

            <section className="panel">
                <div className="panel-header">
                    <h2>最近记录</h2>
                    <span>{historyItems.length} 条</span>
                </div>
                {historyItems.length === 0 ? (
                    <p className="muted">还没有历史记录。先在工作台生成一版文档。</p>
                ) : (
                    <HistoryList items={historyItems} />
                )}
            </section>
        </main>
    );
}

function WorkspacePage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialRequirement = searchParams.get("q") || loadLocalDraft() || EXAMPLES[0];
    const initialHistoryId = searchParams.get("history") || "";
    const [rawRequirementText, setRawRequirementText] = useState(initialRequirement);
    const [docStyle] = useState("prd");
    const [rewriteStyle, setRewriteStyle] = useState("pm_style");
    const [diagramType] = useState("user_flow");
    const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
    const [runMode, setRunMode] = useState("demo");
    const [parsedRequirement, setParsedRequirement] = useState(null);
    const [documentResult, setDocumentResult] = useState(null);
    const [diagramResult, setDiagramResult] = useState(null);
    const [historyId, setHistoryId] = useState(initialHistoryId || null);
    const [activeTab, setActiveTab] = useState("document");
    const [busyStep, setBusyStep] = useState("");
    const [error, setError] = useState("");
    const [health, setHealth] = useState(null);
    const [historyItems, setHistoryItems] = useState([]);
    const [copyHint, setCopyHint] = useState("");

    useEffect(() => {
        Promise.all([getHealth(), listHistory()])
            .then(([healthResult, historyResult]) => {
                setHealth(healthResult);
                if (healthResult?.model) {
                    setSelectedModel(healthResult.model);
                }
                setHistoryItems(historyResult.items || []);
            })
            .catch((err) => setError(err.message));
    }, []);

    useEffect(() => {
        saveLocalDraft(rawRequirementText);
    }, [rawRequirementText]);

    useEffect(() => {
        const nextRequirement = searchParams.get("q");
        if (nextRequirement) {
            setRawRequirementText(nextRequirement);
        }
    }, [searchParams]);

    useEffect(() => {
        const nextHistoryId = searchParams.get("history");
        if (!nextHistoryId) {
            return;
        }

        let cancelled = false;
        setBusyStep("载入历史记录...");
        getHistoryRecord(nextHistoryId)
            .then((record) => {
                if (cancelled) {
                    return;
                }

                hydrateFromRecord(record, {
                    setRawRequirementText,
                    setParsedRequirement,
                    setDocumentResult,
                    setDiagramResult,
                    setHistoryId,
                    setActiveTab,
                    setRewriteStyle
                });
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err.message);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setBusyStep("");
                }
            });

        return () => {
            cancelled = true;
        };
    }, [searchParams]);

    const canParse = rawRequirementText.trim().length >= 8;
    const canGenerateDocument = Boolean(parsedRequirement);
    const canGenerateDiagram = Boolean(documentResult?.document);
    const canOptimize = Boolean(documentResult?.document);
    const workspaceSections = [
        { key: "input", label: "需求输入", helper: "输入一句需求或载入示例", disabled: false },
        { key: "structure", label: "结构确认", helper: "确认 AI 拆出的结构化字段", disabled: !parsedRequirement },
        { key: "document", label: "PRD 预览", helper: "查看生成后的产品文档", disabled: !documentResult?.document },
        { key: "diagram", label: "流程图", helper: "查看并导出 draw.io 流程图", disabled: !diagramResult?.diagram },
        { key: "quality", label: "质量检查", helper: "查看缺失项、弱项和建议", disabled: !documentResult?.quality_report },
        { key: "collaboration", label: "协作视图", helper: "给研发和测试看的派生结果", disabled: !documentResult?.collaboration_view },
        { key: "versions", label: "版本记录", helper: "回看改写和历史版本", disabled: !(documentResult?.versions || []).length }
    ];
    const activeSectionMeta = workspaceSections.find((item) => item.key === activeTab) || workspaceSections[0];

    const handleParse = async () => {
        setBusyStep("解析中...");
        setError("");

        try {
            const result = await parseRequirement({
                raw_requirement_text: rawRequirementText,
                doc_style: docStyle,
                rewrite_style: rewriteStyle,
                diagram_type: diagramType,
                provider: "gemini",
                selected_model: selectedModel,
                run_mode: runMode
            });
            setParsedRequirement(result);
            setDocumentResult(null);
            setDiagramResult(null);
            setHistoryId(null);
            setActiveTab("document");
            clearHistoryParam(searchParams, setSearchParams);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusyStep("");
        }
    };

    const handleGenerateDocument = async (overrideParsedRequirement = parsedRequirement) => {
        setBusyStep("生成文档中...");
        setError("");

        try {
            const result = await generateDocument({
                history_id: historyId,
                raw_requirement_text: rawRequirementText,
                doc_style: docStyle,
                rewrite_style: rewriteStyle,
                diagram_type: diagramType,
                provider: "gemini",
                selected_model: selectedModel,
                run_mode: runMode,
                parsed_requirement: overrideParsedRequirement
            });

            setParsedRequirement(result.parsed_requirement || overrideParsedRequirement);
            setDocumentResult(result);
            setHistoryId(result.history_id);
            setActiveTab("document");
            syncHistoryParam(searchParams, setSearchParams, result.history_id);
            refreshHistory(setHistoryItems, setError);
            return result;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setBusyStep("");
        }
    };

    const handleOptimize = async (style) => {
        if (!documentResult?.document) {
            return;
        }

        setBusyStep("优化文档中...");
        setError("");

        try {
            const result = await optimizeDocument({
                history_id: historyId,
                rewrite_style: style,
                raw_requirement_text: rawRequirementText,
                provider: "gemini",
                selected_model: selectedModel,
                run_mode: runMode,
                parsed_requirement: parsedRequirement,
                document: documentResult.document
            });

            setRewriteStyle(style);
            setParsedRequirement(result.parsed_requirement || parsedRequirement);
            setDocumentResult(result);
            setHistoryId(result.history_id);
            setActiveTab("document");
            refreshHistory(setHistoryItems, setError);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusyStep("");
        }
    };

    const handleGenerateDiagram = async (documentPayload = documentResult?.document) => {
        if (!documentPayload) {
            return;
        }

        setBusyStep("生成流程图中...");
        setError("");

        try {
            const result = await generateDiagram({
                history_id: historyId,
                raw_requirement_text: rawRequirementText,
                diagram_type: diagramType,
                provider: "gemini",
                selected_model: selectedModel,
                run_mode: runMode,
                parsed_requirement: parsedRequirement,
                document: documentPayload
            });

            setDiagramResult(result);
            setHistoryId(result.history_id);
            setActiveTab("diagram");
            syncHistoryParam(searchParams, setSearchParams, result.history_id);
            refreshHistory(setHistoryItems, setError);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusyStep("");
        }
    };

    const handleGenerateAll = async () => {
        setBusyStep("完整生成中...");
        setError("");

        try {
            const parsed = await parseRequirement({
                raw_requirement_text: rawRequirementText,
                doc_style: docStyle,
                rewrite_style: rewriteStyle,
                diagram_type: diagramType,
                provider: "gemini",
                selected_model: selectedModel,
                run_mode: runMode
            });
            setParsedRequirement(parsed);

            const documentResponse = await generateDocument({
                history_id: historyId,
                raw_requirement_text: rawRequirementText,
                doc_style: docStyle,
                rewrite_style: rewriteStyle,
                diagram_type: diagramType,
                provider: "gemini",
                selected_model: selectedModel,
                run_mode: runMode,
                parsed_requirement: parsed
            });
            setDocumentResult(documentResponse);
            setHistoryId(documentResponse.history_id);

            const diagramResponse = await generateDiagram({
                history_id: documentResponse.history_id,
                raw_requirement_text: rawRequirementText,
                diagram_type: diagramType,
                provider: "gemini",
                selected_model: selectedModel,
                run_mode: runMode,
                parsed_requirement: parsed,
                document: documentResponse.document
            });
            setDiagramResult(diagramResponse);
            setHistoryId(diagramResponse.history_id);
            setActiveTab("document");
            syncHistoryParam(searchParams, setSearchParams, diagramResponse.history_id);
            refreshHistory(setHistoryItems, setError);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusyStep("");
        }
    };

    const handleParsedChange = (field, value) => {
        setParsedRequirement((current) => ({
            ...current,
            [field]: value
        }));
    };

    const handleDownloadDrawio = () => {
        if (!diagramResult?.drawio_xml) {
            return;
        }

        downloadTextFile(diagramResult.drawio_xml, diagramResult.file_name || `prd-copilot-${Date.now()}.drawio`, "application/xml;charset=utf-8");
    };

    const handleCopyDocument = async () => {
        if (!documentResult?.document) {
            return;
        }

        try {
            await navigator.clipboard.writeText(JSON.stringify(documentResult.document, null, 2));
            setCopyHint("文档 JSON 已复制");
            window.setTimeout(() => setCopyHint(""), 1800);
        } catch {
            setCopyHint("复制失败，请手动选择内容");
        }
    };

    const handleLoadVersion = (version) => {
        const nextDocument = {
            history_id: historyId,
            parsed_requirement: parsedRequirement,
            document: version.document,
            versions: documentResult?.versions || [],
            quality_report: documentResult?.quality_report,
            collaboration_view: documentResult?.collaboration_view
        };

        setDocumentResult(nextDocument);
        setActiveTab("document");
    };

    return (
        <main className="page page--workspace">
            <header className="workspace-header">
                <div>
                    <div className="hero-eyebrow">Workspace</div>
                    <h1>PRD Copilot 工作台</h1>
                    <p className="workspace-intro">
                        <strong>左侧切换步骤，右侧集中预览。</strong>
                        Demo Mode 用于稳定演示，Live Mode 用于展示真实模型接入能力。
                    </p>
                </div>
                <div className="header-actions">
                    <HealthBadge health={health} compact />
                    {historyId ? (
                        <button type="button" className="btn" onClick={() => navigate(`/history/${historyId}`)}>
                            查看当前记录
                        </button>
                    ) : null}
                    <Link className="btn" to="/">
                        返回首页
                    </Link>
                </div>
            </header>

            {busyStep ? <div className="status-banner">{busyStep}</div> : null}
            {error ? <div className="inline-error">{error}</div> : null}
            {copyHint ? <div className="status-banner">{copyHint}</div> : null}
            <ModeGuidance
                runMode={runMode}
                health={health}
                error={error}
                onSwitchToDemo={() => setRunMode("demo")}
                onLoadExample={() => setRawRequirementText(EXAMPLES[0])}
            />

            <section className="workspace-shell">
                <aside className="panel panel--column panel--sticky workspace-sidebar">
                    <div className="workspace-sidebar__section">
                        <div className="panel-header">
                            <h2>导航</h2>
                            <span>按步骤浏览</span>
                        </div>
                        <nav className="workspace-nav">
                            {workspaceSections.map((item, index) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    className={`workspace-nav__item ${activeTab === item.key ? "is-active" : ""}`}
                                    onClick={() => !item.disabled && setActiveTab(item.key)}
                                    disabled={item.disabled}
                                >
                                    <span className="workspace-nav__index">{String(index + 1).padStart(2, "0")}</span>
                                    <span className="workspace-nav__copy">
                                        <strong>{item.label}</strong>
                                        <small>{item.helper}</small>
                                    </span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="workspace-sidebar__section">
                        <label className="form-field">
                            <span>运行模式</span>
                            <div className="mode-switch">
                                {RUN_MODE_OPTIONS.map((item) => (
                                    <button
                                        key={item.value}
                                        type="button"
                                        className={`mode-chip ${runMode === item.value ? "is-active" : ""}`}
                                        onClick={() => setRunMode(item.value)}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </label>
                        <label className="form-field">
                            <span>改写风格</span>
                            <select value={rewriteStyle} onChange={(event) => setRewriteStyle(event.target.value)}>
                                {REWRITE_STYLES.map((item) => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="form-field">
                            <span>输出模型</span>
                            <select value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)} disabled={runMode !== "live"}>
                                {MODEL_OPTIONS.map((item) => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="workspace-sidebar__section">
                        <div className="subsection-header">
                            <h3>快速操作</h3>
                            <span>先生成，再预览</span>
                        </div>
                        <div className="stack-actions">
                            <button type="button" className="btn btn--primary" onClick={handleGenerateAll} disabled={!canParse}>
                                一键完整生成
                            </button>
                            <button type="button" className="btn" onClick={handleParse} disabled={!canParse}>
                                仅拆解需求
                            </button>
                            <button type="button" className="btn" onClick={() => setRawRequirementText(EXAMPLES[0])}>
                                使用示例
                            </button>
                        </div>
                    </div>

                    <div className="workspace-sidebar__section">
                        <div className="subsection-header">
                            <h3>最近记录</h3>
                            <span>{historyItems.length} 条</span>
                        </div>
                        <CompactHistoryList items={historyItems} />
                    </div>
                </aside>

                <section className="panel panel--column workspace-main">
                    <div className="panel-header">
                        <div>
                            <h2>{activeSectionMeta.label}</h2>
                            <p className="workspace-main__hint">{activeSectionMeta.helper}</p>
                        </div>
                        <span>{runMode === "demo" ? "Demo Mode" : selectedModel}</span>
                    </div>

                    <div className="workspace-main__toolbar">
                        <button type="button" className="btn" onClick={() => handleGenerateDocument()} disabled={!canGenerateDocument}>
                            生成文档
                        </button>
                        <button type="button" className="btn" onClick={() => handleGenerateDiagram()} disabled={!canGenerateDiagram}>
                            生成流程图
                        </button>
                        <button type="button" className="btn" onClick={handleDownloadDrawio} disabled={!diagramResult?.drawio_xml}>
                            下载 .drawio
                        </button>
                        <button type="button" className="btn" onClick={handleCopyDocument} disabled={!documentResult?.document}>
                            复制文档 JSON
                        </button>
                    </div>

                    {activeTab === "input" ? (
                        <div className="workspace-stage">
                            <label className="form-field">
                                <span>自然语言需求</span>
                                <textarea
                                    className="form-textarea"
                                    value={rawRequirementText}
                                    onChange={(event) => setRawRequirementText(event.target.value)}
                                />
                            </label>
                            <div className="example-row">
                                {EXAMPLES.map((item) => (
                                    <button key={item} type="button" className="chip" onClick={() => setRawRequirementText(item)}>
                                        {item.slice(0, 18)}...
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {activeTab === "structure" ? (
                        <div className="workspace-stage">
                            {!parsedRequirement ? (
                                <p className="muted">先点击“一键完整生成”或“仅拆解需求”，系统会生成可确认的结构化字段。</p>
                            ) : (
                                <>
                                    <ParsedRequirementEditor value={parsedRequirement} onChange={handleParsedChange} />
                                    {parsedRequirement.missing_items?.length ? (
                                        <div className="hint-card">
                                            <strong>仍待补充：</strong>
                                            <span>{parsedRequirement.missing_items.join("、")}</span>
                                        </div>
                                    ) : null}
                                </>
                            )}
                            <button type="button" className="btn btn--primary" onClick={() => handleGenerateDocument()} disabled={!canGenerateDocument}>
                                基于当前结构生成文档
                            </button>
                        </div>
                    ) : null}

                    {activeTab === "document" ? (
                        <div className="workspace-stage">
                            <DocumentPanel document={documentResult?.document} />
                            <div className="rewrite-actions">
                                {REWRITE_STYLES.map((item) => (
                                    <button key={item.value} type="button" className="chip" onClick={() => handleOptimize(item.value)} disabled={!canOptimize}>
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {activeTab === "diagram" ? <DiagramPanel diagram={diagramResult?.diagram} /> : null}
                    {activeTab === "quality" ? <QualityPanel report={documentResult?.quality_report} /> : null}
                    {activeTab === "collaboration" ? <CollaborationPanel view={documentResult?.collaboration_view} /> : null}
                    {activeTab === "versions" ? <VersionsPanel versions={documentResult?.versions} onLoadVersion={handleLoadVersion} /> : null}
                </section>
            </section>
        </main>
    );
}

function HistoryDetailPage() {
    const { id } = useParams();
    const [record, setRecord] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        getHistoryRecord(id)
            .then((data) => setRecord(data))
            .catch((err) => setError(err.message));
    }, [id]);

    return (
        <main className="page page--history">
            <div className="panel panel--column">
                <div className="panel-header">
                    <h1>历史记录详情</h1>
                    <div className="header-actions">
                        <Link className="btn" to={buildWorkspaceLink(record?.id || id)}>
                            继续编辑
                        </Link>
                        <Link className="btn" to="/">
                            返回首页
                        </Link>
                    </div>
                </div>
                {error ? <div className="inline-error">{error}</div> : null}
                {!record ? (
                    <p className="muted">正在加载记录...</p>
                ) : (
                    <div className="history-layout">
                        <section className="detail-block">
                            <h2>原始需求</h2>
                            <p>{record.raw_requirement_text}</p>
                            <div className="detail-meta">
                                <span>创建时间：{formatDate(record.created_at)}</span>
                                <span>历史版本：{record.versions?.length || 0}</span>
                            </div>
                        </section>
                        <section className="detail-block">
                            <h2>结构化拆解</h2>
                            <ParsedRequirementSummary value={record.parsed_requirement_json} />
                        </section>
                        <section className="detail-block">
                            <h2>当前文档</h2>
                            <DocumentPanel document={record.document_json?.current} />
                        </section>
                        <section className="detail-block">
                            <h2>流程图</h2>
                            <DiagramPanel diagram={record.diagram_json} />
                        </section>
                        <section className="detail-block">
                            <h2>质量检查</h2>
                            <QualityPanel report={record.quality_report_json} />
                        </section>
                        <section className="detail-block">
                            <h2>版本记录</h2>
                            <VersionsPanel versions={record.versions} />
                        </section>
                    </div>
                )}
            </div>
        </main>
    );
}

function ParsedRequirementEditor({ value, onChange }) {
    return (
        <div className="editor-grid">
            <label className="form-field">
                <span>需求名称</span>
                <input value={value.requirement_name || ""} onChange={(event) => onChange("requirement_name", event.target.value)} />
            </label>
            <label className="form-field">
                <span>目标用户</span>
                <input value={value.target_user || ""} onChange={(event) => onChange("target_user", event.target.value)} />
            </label>
            <label className="form-field form-field--full">
                <span>核心目标</span>
                <textarea value={value.core_goal || ""} onChange={(event) => onChange("core_goal", event.target.value)} />
            </label>
            <JsonArrayField label="用户痛点" value={value.user_pain_points} onChange={(next) => onChange("user_pain_points", next)} />
            <JsonArrayField label="功能模块" value={value.feature_modules} onChange={(next) => onChange("feature_modules", next)} />
            <JsonArrayField label="关键页面" value={value.key_pages} onChange={(next) => onChange("key_pages", next)} />
            <JsonArrayField label="指标建议" value={value.success_metrics} onChange={(next) => onChange("success_metrics", next)} />
            <JsonArrayField label="缺失项" value={value.missing_items} onChange={(next) => onChange("missing_items", next)} />
        </div>
    );
}

function ParsedRequirementSummary({ value }) {
    if (!value) {
        return <p className="muted">暂无拆解结果。</p>;
    }

    return (
        <div className="summary-grid">
            <SummaryField label="需求名称" value={value.requirement_name} />
            <SummaryField label="目标用户" value={value.target_user} />
            <SummaryField label="核心目标" value={value.core_goal} full />
            <SummaryField label="用户痛点" value={value.user_pain_points} full />
            <SummaryField label="功能模块" value={value.feature_modules} full />
            <SummaryField label="关键页面" value={value.key_pages} full />
            <SummaryField label="指标建议" value={value.success_metrics} full />
            <SummaryField label="缺失项" value={value.missing_items} full />
        </div>
    );
}

function SummaryField({ label, value, full = false }) {
    return (
        <div className={`summary-card ${full ? "summary-card--full" : ""}`}>
            <span>{label}</span>
            <RichValue value={value} />
        </div>
    );
}

function JsonArrayField({ label, value = [], onChange }) {
    const textValue = useMemo(() => value.join("\n"), [value]);

    return (
        <label className="form-field form-field--full">
            <span>{label}</span>
            <textarea
                value={textValue}
                onChange={(event) =>
                    onChange(
                        event.target.value
                            .split("\n")
                            .map((item) => item.trim())
                            .filter(Boolean)
                    )
                }
            />
        </label>
    );
}

function ResultTabs({ activeTab, setActiveTab, documentResult, diagramResult }) {
    const tabs = [
        { key: "document", label: "文档" },
        { key: "diagram", label: "流程图", disabled: !diagramResult?.diagram },
        { key: "quality", label: "质量检查", disabled: !documentResult?.quality_report },
        { key: "collaboration", label: "协作视图", disabled: !documentResult?.collaboration_view },
        { key: "versions", label: "版本", disabled: !(documentResult?.versions || []).length }
    ];

    return (
        <div className="tab-row">
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    type="button"
                    className={`tab-btn ${activeTab === tab.key ? "is-active" : ""}`}
                    onClick={() => !tab.disabled && setActiveTab(tab.key)}
                    disabled={tab.disabled}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

function DocumentPanel({ document }) {
    if (!document) {
        return <p className="muted">文档结果会显示在这里。</p>;
    }

    return (
        <div className="doc-sections">
            {DOC_SECTIONS.map(([key, label]) => (
                <section key={key} className="doc-card">
                    <h3>{label}</h3>
                    <RichValue value={document[key]} />
                </section>
            ))}
        </div>
    );
}

function DiagramPanel({ diagram }) {
    if (!diagram) {
        return <p className="muted">先生成文档，再生成流程图。</p>;
    }

    return (
        <div className="doc-sections">
            <section className="doc-card">
                <h3>{diagram.title}</h3>
                <div className="diagram-flow">
                    {(diagram.nodes || []).map((node, index) => (
                        <Fragment key={node.id}>
                            <div className="diagram-node">
                                <span>{node.id}</span>
                                <strong>{node.label}</strong>
                            </div>
                            {index < diagram.nodes.length - 1 ? <div className="diagram-arrow">→</div> : null}
                        </Fragment>
                    ))}
                </div>
            </section>
            <section className="doc-card">
                <h3>连线关系</h3>
                <ul>
                    {(diagram.edges || []).map((edge, index) => (
                        <li key={`${edge.from}-${edge.to}-${index}`}>
                            {edge.from} → {edge.to} {edge.label ? `(${edge.label})` : ""}
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}

function QualityPanel({ report }) {
    if (!report) {
        return <p className="muted">文档生成后会出现质量检查结果。</p>;
    }

    return (
        <div className="quality-grid">
            <section className="doc-card quality-card">
                <h3>评分</h3>
                <p className="quality-score">{report.score}</p>
            </section>
            <section className="doc-card">
                <h3>缺失项</h3>
                <RichValue value={report.missing_items} />
            </section>
            <section className="doc-card">
                <h3>弱项</h3>
                <RichValue value={report.weak_items} />
            </section>
            <section className="doc-card">
                <h3>建议</h3>
                <RichValue value={report.notes} />
            </section>
        </div>
    );
}

function CollaborationPanel({ view }) {
    if (!view) {
        return <p className="muted">生成文档后会同步派生研发和测试视图。</p>;
    }

    return (
        <div className="quality-grid">
            <section className="doc-card">
                <h3>研发视图</h3>
                <RichValue value={view.engineering_view} />
            </section>
            <section className="doc-card">
                <h3>测试视图</h3>
                <RichValue value={view.testing_view} />
            </section>
        </div>
    );
}

function VersionsPanel({ versions = [], onLoadVersion }) {
    if (!versions.length) {
        return <p className="muted">当前还没有版本记录。</p>;
    }

    return (
        <div className="versions-list">
            {versions.map((version, index) => (
                <section key={`${version.type}-${version.created_at}-${index}`} className="doc-card version-card">
                    <div className="version-header">
                        <div>
                            <strong>{version.type}</strong>
                            <p>{formatDate(version.created_at)}</p>
                        </div>
                        {onLoadVersion ? (
                            <button type="button" className="btn" onClick={() => onLoadVersion(version)}>
                                载入此版本
                            </button>
                        ) : null}
                    </div>
                    <RichValue value={version.document?.core_goal || version.document?.product_background || "暂无摘要"} />
                </section>
            ))}
        </div>
    );
}

function CompactHistoryList({ items }) {
    if (!items.length) {
        return <p className="muted">暂无历史记录。</p>;
    }

    return (
        <div className="compact-history-list">
            {items.slice(0, 6).map((item) => (
                <Link key={item.id} className="compact-history-item" to={buildWorkspaceLink(item.id)}>
                    <strong>{item.requirement_name || "未命名需求"}</strong>
                    <span>{formatDate(item.created_at)}</span>
                </Link>
            ))}
        </div>
    );
}

function HistoryList({ items }) {
    return (
        <div className="history-list">
            {items.map((item) => (
                <article key={item.id} className="history-item">
                    <div>
                        <strong>{item.requirement_name || "未命名需求"}</strong>
                        <p>{item.raw_requirement_text}</p>
                    </div>
                    <div className="history-actions">
                        <span>{formatDate(item.created_at)}</span>
                        <div className="header-actions">
                            <Link className="btn" to={`/history/${item.id}`}>
                                查看详情
                            </Link>
                            <Link className="btn" to={buildWorkspaceLink(item.id)}>
                                继续编辑
                            </Link>
                        </div>
                    </div>
                </article>
            ))}
        </div>
    );
}

function HealthBadge({ health, compact = false }) {
    if (!health) {
        return <div className="health-badge">状态读取中...</div>;
    }

    const modeLabel = health.mode === "demo" ? "Demo Mode" : "Live Mode";

    return (
        <div className={`health-badge ${compact ? "health-badge--compact" : ""}`}>
            <strong>{modeLabel}</strong>
            <span>{health.has_api_key ? `${health.provider || "llm"} / ${health.model}` : "未配置模型 API Key，可直接使用 Demo Mode"}</span>
        </div>
    );
}

function ModeGuidance({ runMode, health, error, onSwitchToDemo, onLoadExample }) {
    const showFallback = runMode === "live" && Boolean(error);

    return (
        <section className="panel mode-panel">
            <div className="panel-header">
                <h2>演示说明</h2>
                <span>{runMode === "demo" ? "推荐用于简历展示" : "用于展示真实模型能力"}</span>
            </div>
            <p className="muted">
                {runMode === "demo"
                    ? "Demo Mode 使用仓库内置样例数据，优先保证演示稳定性。"
                    : "Live Mode 会发起真实模型请求。如果网络或 API 不可用，切回 Demo Mode 仍可完整展示产品流程。"}
            </p>
            {health ? <p className="muted">当前服务能力：{health.mode === "demo" ? "后端默认 Demo" : "后端支持 Live"}，{health.provider || "llm"} / {health.model}</p> : null}
            {showFallback ? (
                <div className="stack-actions">
                    <button type="button" className="btn btn--primary" onClick={onSwitchToDemo}>
                        切回 Demo Mode
                    </button>
                    <button type="button" className="btn" onClick={onLoadExample}>
                        加载示例需求
                    </button>
                </div>
            ) : null}
        </section>
    );
}

function RichValue({ value }) {
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return <p>暂无内容</p>;
        }

        if (value.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
            return (
                <div className="object-list">
                    {value.map((item, index) => (
                        <div key={`${item.name || item.title || index}`} className="object-item">
                            <strong>{item.name || item.title || `项目 ${index + 1}`}</strong>
                            <p>{item.description || item.label || JSON.stringify(item, null, 2)}</p>
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <ul>
                {value.map((item, index) => (
                    <li key={`${index}-${typeof item === "string" ? item : "item"}`}>
                        {typeof item === "object" ? JSON.stringify(item, null, 2) : String(item)}
                    </li>
                ))}
            </ul>
        );
    }

    if (value && typeof value === "object") {
        return (
            <div className="object-list">
                {Object.entries(value).map(([key, item]) => (
                    <div key={key} className="object-item">
                        <strong>{key}</strong>
                        <RichValue value={item} />
                    </div>
                ))}
            </div>
        );
    }

    return <p>{value || "暂无内容"}</p>;
}

function hydrateFromRecord(record, setters) {
    setters.setRawRequirementText(record.raw_requirement_text || "");
    setters.setParsedRequirement(record.parsed_requirement_json || null);
    setters.setDocumentResult(
        record.document_json
            ? {
                  history_id: record.id,
                  document: record.document_json.current,
                  versions: record.document_json.versions || [],
                  quality_report: record.quality_report_json,
                  collaboration_view: null
              }
            : null
    );
    setters.setDiagramResult(
        record.diagram_json
            ? {
                  history_id: record.id,
                  diagram: record.diagram_json,
                  drawio_xml: record.drawio_xml,
                  file_name: `prd-copilot-history-${record.id}.drawio`
              }
            : null
    );
    setters.setHistoryId(record.id);
    setters.setActiveTab(record.diagram_json ? "diagram" : "document");
}

function refreshHistory(setHistoryItems, setError) {
    listHistory()
        .then((data) => setHistoryItems(data.items || []))
        .catch((err) => setError(err.message));
}

function buildWorkspaceLink(id) {
    const query = new URLSearchParams({ history: String(id) });
    return `/workspace?${query.toString()}`;
}

function syncHistoryParam(searchParams, setSearchParams, historyId) {
    const next = new URLSearchParams(searchParams);
    next.set("history", String(historyId));
    setSearchParams(next, { replace: true });
}

function clearHistoryParam(searchParams, setSearchParams) {
    const next = new URLSearchParams(searchParams);
    next.delete("history");
    setSearchParams(next, { replace: true });
}

function downloadTextFile(content, fileName, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

function saveLocalDraft(value) {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, value);
}

function loadLocalDraft() {
    return window.localStorage.getItem(DRAFT_STORAGE_KEY);
}

function formatDate(value) {
    try {
        return new Date(value).toLocaleString("zh-CN");
    } catch {
        return value;
    }
}

export default App;
