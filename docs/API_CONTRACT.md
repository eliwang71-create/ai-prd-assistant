# PRD Copilot 接口与数据约束

## 1. 原始输入

### Request

```json
{
  "raw_requirement_text": "做一个帮助产品经理自动生成 PRD 和流程图的工具，支持文档优化和 drawio 导出",
  "doc_style": "prd",
  "rewrite_style": "pm_style",
  "diagram_type": "user_flow"
}
```

### 字段说明

- `raw_requirement_text`: 必填，用户自然语言需求
- `doc_style`: 文档风格，默认 `prd`
- `rewrite_style`: 改写风格
- `diagram_type`: 流程图类型，默认 `user_flow`

## 2. 结构化拆解输出

### Response

```json
{
  "requirement_name": "PRD Copilot",
  "target_user": "产品经理",
  "user_pain_points": [
    "需求信息零散",
    "文档结构不统一",
    "流程图整理成本高"
  ],
  "core_goal": "根据自然语言需求快速生成结构化产品文档与流程图",
  "feature_modules": [
    "需求输入",
    "AI 拆解",
    "文档生成",
    "文档优化",
    "drawio 导出"
  ],
  "key_pages": [
    "首页",
    "工作台",
    "历史记录"
  ],
  "success_metrics": [
    "文档初稿生成时间缩短",
    "流程图绘制时间缩短"
  ],
  "diagram_suggestion": "user_flow",
  "missing_items": [
    "异常流程说明",
    "约束条件"
  ]
}
```

## 3. 文档生成输出

### 固定模块

输出必须始终包含以下 8 个字段：

- `product_background`
- `user_pain_points`
- `user_persona`
- `core_goal`
- `feature_modules`
- `user_flow`
- `key_pages`
- `metrics`

### Response Shape

```json
{
  "product_background": "......",
  "user_pain_points": [
    "......"
  ],
  "user_persona": "......",
  "core_goal": "......",
  "feature_modules": [
    {
      "name": "需求输入",
      "description": "......"
    }
  ],
  "user_flow": [
    "输入需求",
    "确认拆解",
    "生成文档"
  ],
  "key_pages": [
    {
      "name": "工作台",
      "description": "......"
    }
  ],
  "metrics": [
    "......"
  ]
}
```

## 4. 流程图生成输出

模型只输出结构化图数据，不输出原始 `.drawio` XML。

### Response Shape

```json
{
  "title": "PRD Copilot 用户流程",
  "diagram_type": "user_flow",
  "nodes": [
    {
      "id": "n1",
      "label": "输入需求"
    },
    {
      "id": "n2",
      "label": "AI 拆解需求"
    }
  ],
  "edges": [
    {
      "from": "n1",
      "to": "n2",
      "label": ""
    }
  ]
}
```

## 5. 质量检查输出

```json
{
  "score": 82,
  "missing_items": [
    "异常流程说明"
  ],
  "weak_items": [
    "成功指标较抽象"
  ],
  "notes": [
    "建议补充边界条件"
  ]
}
```

## 6. 协作视图输出

### 研发视图

- 功能点
- 主流程
- 边界条件
- 待确认项

### 测试视图

- 验收点
- 异常流程
- 风险点

## 7. 约束规则

- 文档输出不可缺少 8 个固定模块
- 当输入过少时必须返回 `missing_items`
- 文档优化基于当前版本文本，不重新从原始需求生成
- 流程图节点名称要与文档中的用户流程或功能模块语义一致
