# PRD Copilot 实现路线

## 架构建议

### 前端

- `React + Vite`
- 单页应用，核心页面为首页、工作台、历史详情
- 结果展示区使用 Tab 切换：文档 / 流程图 / 质量检查 / 协作视图 / 历史版本

### 服务层

- `Node.js`
- 负责提示词编排、模型调用、版本存储、`.drawio` 生成

### 数据层

- 开发阶段：`SQLite`
- 后续可切换 `MySQL`

## 核心模块拆分

### 前端模块

- `RequirementInputPanel`
- `ParsedRequirementEditor`
- `DocumentResultPanel`
- `DiagramExportPanel`
- `QualityCheckPanel`
- `CollaborationViewPanel`
- `HistoryTimeline`

### 服务端模块

- `parseRequirement`
- `generateDocument`
- `optimizeDocument`
- `generateDiagramGraph`
- `buildDrawioXml`
- `runQualityCheck`
- `buildEngineeringView`
- `buildTestingView`

## 推荐开发顺序

### 阶段 1：先跑通主链路

- 一句话需求输入
- 结构化拆解
- 文档生成
- 基础结果展示

### 阶段 2：补充导出能力

- 图结构生成
- `.drawio` XML 生成
- 文件下载

### 阶段 3：补充质量和协作能力

- 质量检查
- 研发视图
- 测试视图

### 阶段 4：补充历史记录

- 保存需求输入
- 保存生成版本
- 历史查看和回溯

## 为什么这样实现

- 用户入口要简单，所以保留自然语言输入
- 结果要稳定，所以中间要经过结构化拆解
- 大模型适合生成结构，不适合直接输出严格格式文件
- `.drawio` 文件由应用端模板生成，更可控也更稳定

## 验收标准

- 输入一句需求后，系统能返回结构化拆解结果
- 文档生成结果始终包含固定 8 个模块
- 文档优化可对当前结果做稳定改写
- 导出的 `.drawio` 文件可在 draw.io 中打开
- 质量检查至少覆盖目标用户、问题、目标、指标、边界说明
