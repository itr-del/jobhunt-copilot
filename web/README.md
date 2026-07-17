# web/ —— 求职副驾网页工作台

jobhunt-copilot 的网页交互层：在浏览器里完成「看」和「记」——看今天筛出的岗位、拍板投不投、
记进度、翻面试档案、调整求职标准。**AI 对话部分（梳理目标、每日筛选）仍由 AI 工具完成**，
网页是它的工作台与展示层：本地文件依然是唯一事实源，网页只是读写这些文件。

## 页面

| 路由 | 页面 | 干什么 |
|---|---|---|
| `/` | 仪表盘 | 今日概况、求职漏斗、待办清单（待你拍板）、面试日程、最近动态 |
| `/jobs` | 岗位台账 | 全量岗位表格、筛选、详情抽屉（状态推进/JD/备注）、新增岗位 |
| `/reports` | 每日简报 | 日报/周报阅读 |
| `/interviews` | 面试档案 | 公司卡片、档案查看与编辑 |
| `/context` | 求职标准 | CONTEXT.md 七节结构化展示与编辑（唯一事实源） |
| `/strategy` | 策略与简历 | 对内策略（⚠️ 不外发）/ 对外主简历 / 定制版本 |
| `/settings` | 设置 | 工作区与模式、使用指引、外观、红线 |

## 本地运行（配合你的真实工作区）

前置：Node.js ≥ 20。先按仓库根 README 用 AI 工具完成「初始化求职工作区」。

```bash
cd web
npm install
npm run build
WORKSPACE_DIR=/path/to/你的求职工作区 npm start
# 打开 http://localhost:8787
```

开发模式（前后端热更新）：

```bash
npm run dev:server   # 终端 1：后端，8787
npm run dev          # 终端 2：前端，5173（/api 已代理到 8787）
```

## 演示模式

不设置 `WORKSPACE_DIR` 时，自动使用内置 `demo-workspace/`（16 条示例岗位、日报、面试档案），
页面顶部出现「演示模式」细条。演示模式下"今天"锚定到示例数据的最新日期，数字永远自洽。

## Docker

```bash
docker build -t jobhunt-copilot-web .
docker run -p 8787:8787 jobhunt-copilot-web                       # 演示模式
docker run -p 8787:8787 -e WORKSPACE_DIR=/workspace \
  -v /path/to/你的求职工作区:/workspace jobhunt-copilot-web        # 真实工作区
```

## 架构

- `server/`：Hono + @hono/node-server，REST API（契约见 `contracts/api.md`），
  直接读写工作区文件（CSV/Markdown），无数据库——**本地文件是唯一事实源**。
- `src/`：React 19 + Vite + Tailwind + shadcn/ui 前端。
- `demo-workspace/`：演示种子数据，同时是真实工作区缺文件时的补齐模板。
- 红线在网页层同样生效：投递类动作只有"标记"，真实投递永远由你本人在平台上完成；
  `_internal` 内容页面有警示带，但不会出现在任何对外材料里。
