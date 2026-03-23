# 服务层规划

建议在这里实现模型调用、导出和存储逻辑。

## 推荐模块

- `parseRequirement`
- `generateDocument`
- `optimizeDocument`
- `generateDiagramGraph`
- `buildDrawioXml`
- `runQualityCheck`
- `buildEngineeringView`
- `buildTestingView`
- `saveHistoryRecord`
- `getHistoryRecord`

## 核心约束

- 模型只输出结构化 JSON
- `.drawio` 由服务层模板转换生成
- 质量检查只做提示，不直接覆盖最终文档
- 历史版本按输入、拆解、文档、流程图分别保存
