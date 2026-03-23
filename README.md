<<<<<<< HEAD
# ai-prd-assistant
AI-powered PRD and flowchart generation assistant for product workflow
=======
# PRD Copilot

面向产品经理的需求文档与流程图生成助手。

## 项目简介

`PRD Copilot` 是一个面向产品经理的需求整理工作台，围绕“输入需求 -> 确认结构 -> 生成文档 -> 导出流程图 -> 回看版本”这条链路来组织页面和功能。

这个项目更关注产品文档的整理和表达过程，而不是单纯生成一段文字。它希望把零散需求收成一份更清楚的文档结果，并在同一个界面里承接流程图、质量检查和历史版本。

## 用户问题与产品价值

目标用户是需要频繁撰写 PRD、功能说明和评审文档的产品经理。

这个项目重点解决 4 个问题：

- 原始需求通常来自会议记录、口头沟通和零散笔记，难以快速收束
- 文档结构不统一，给研发、测试和评审看的内容粒度不同
- 从文字需求到流程图表达需要重复整理
- 评审前改写频繁，缺少统一的版本沉淀入口

对应的产品价值是：把自然语言需求快速整理成可评审、可协作、可继续编辑的结构化结果，并把流程图导出、质量检查和历史版本放进同一个工作台。

## 核心功能

- 输入一句需求或一段需求描述
- 把原始需求整理成结构化字段并支持手动确认
- 输出固定 8 个模块的产品文档
- 提供正式、简洁、PRD、汇报等不同改写方式
- 导出可继续编辑的 `.drawio` 流程图
- 展示质量检查、协作视图和历史版本

固定输出的文档模块包括：

- 产品背景
- 用户痛点
- 用户画像
- 核心目标
- 功能模块
- 用户流程
- 关键页面说明
- 指标建议

## 页面结构

### 首页

- 介绍项目定位
- 提供输入入口和示例需求
- 展示最近生成记录

### 工作台

- 左侧是导航和操作区
- 右侧是当前内容的主预览区
- 支持在需求输入、结构确认、PRD 预览、流程图、质量检查、协作视图、版本记录之间切换

### 历史详情页

- 查看某次需求的原始输入
- 回看结构化拆解结果
- 查看当前文档、流程图和质量检查
- 继续基于历史版本编辑

## 演示流程

推荐按下面这条链路演示：

1. 输入一句产品需求
2. 点击“一键完整生成”
3. 展示结构化拆解结果
4. 展示 8 段产品文档
5. 切换不同改写风格
6. 点击任意改写风格，展示版本变化
7. 切到流程图页，展示 `.drawio` 导出
8. 打开质量检查、协作视图和版本页
9. 进入历史记录详情页，展示版本沉淀

## 使用方式

### Demo Mode

默认推荐使用。  
它使用仓库内置样例跑通完整链路，更适合录屏、截图、面试演示和本地快速体验。

### Live Mode

保留真实服务接入能力，用于补充完整度。  
如果网络或接口配置不可用，仍然可以切回 `Demo Mode` 继续使用。

## 技术实现

- 前端：React + Vite
- 服务层：Node.js + Express
- 数据存储：SQLite
- 流程图导出：结构化节点与连线转换为 `.drawio`
- 历史记录：保存原始输入、当前文档和版本信息

这个项目里，流程图文件不是直接拼接长文本导出，而是先整理成结构化节点，再转换成 draw.io 可以打开的 XML 文件。

## 快速开始

```bash
npm install
npm run dev
```

前端默认运行在 `http://127.0.0.1:5173`，服务端默认运行在 `http://127.0.0.1:3002`。

### 推荐本地演示配置

```env
PRD_COPILOT_DEMO=true
SERVER_PORT=3002
```

### 可选的服务配置示例

```env
LLM_PROVIDER=gemini
LLM_API_KEY=your_api_key
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
LLM_MODEL=gemini-2.5-flash
SERVER_PORT=3002
PRD_COPILOT_DEMO=false
```

如果你使用的是其他兼容接口，只需要替换：

- `LLM_PROVIDER`
- `LLM_API_KEY`
- `LLM_BASE_URL`
- `LLM_MODEL`

即可切换到对应服务。

## 项目结构

```text
prd-copilot
├── README.md
├── docs
│   ├── API_CONTRACT.md
│   ├── DEMO_SCRIPT.md
│   ├── IMPLEMENTATION_PLAN.md
│   ├── PRODUCT_SPEC.md
│   └── RESUME_PITCH.md
├── examples
├── server
├── src
├── .env.example
└── package.json
```

## 相关文档

- 简历项目描述与面试讲法见 [docs/RESUME_PITCH.md](docs/RESUME_PITCH.md)
- 演示顺序与讲解脚本见 [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)
- 固定样例输入输出见 [examples/README.md](examples/README.md)

## 补充说明

- 这版仓库以作品展示和本地演示为主，不追求商用品级稳定性
- 推荐默认使用 `Demo Mode`
- `Live Mode` 依赖接口配置与本机网络环境
- `.drawio` 文件由程序生成，不直接依赖外部服务输出 XML
>>>>>>> 62767ce (feat: add PRD Copilot demo version)
