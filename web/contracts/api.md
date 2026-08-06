# REST API 契约 —— jobhunt-copilot 网页工作台（v1，所有实现者必读）

> 唯一基准。前端（scaffold/页面代理）与后端（backend 代理）都按本文件实现，不得擅自改字段名。
> Base：同源 `/api`。全部 JSON。错误统一 `{ "error": "中文描述" }` + 合适 HTTP 码。
> 后端 = Hono + @hono/node-server，读写求职工作区文件（唯一事实源）；前端 = fetch 封装（scaffold 产出 `src/lib/api.ts` 类型化 client）。

## 数据类型

```ts
// 岗位台账行（与 02-jobs/job-ledger.csv 一一对应）
type Job = {
  id: string            // J-YYYYMMDD-NN，如 J-20260717-03
  date_added: string    // YYYY-MM-DD
  company: string
  position: string
  source: 'boss'|'liepin'|'linkedin'|'lagou'|'官网'|'内推'|'猎头'|'其他'
  city: string
  salary_range: string  // 原文如 "25-40K·14薪"
  jd_file: string       // 相对 02-jobs/jd/ 的文件名，可为空
  match_grade: ''|'⭐'|'⭐⭐'|'⭐⭐⭐'
  status: '已收藏'|'待投递'|'已投递'|'被查看'|'沟通中'|'面试中'|'offer'|'对方已拒'|'已放弃'|'已结束'
  last_action: string   // YYYY-MM-DD 或 ''
  next_step: string
  notes: string
}

type Health = { ok: true, mode: 'demo'|'workspace', workspaceDir: string, version: string }

type Stats = {
  today: { added: number, passed: number, pendingConfirm: number, applied: number }
  funnel: { status: Job['status'], count: number }[]   // 10 态全给，含 0
  trend14d: { date: string, added: number, applied: number }[]  // 近14天
  upcomingInterviews: { company: string, position: string, round: string, datetime: string }[]
  recentActivity: { time: string, text: string, kind: 'ledger'|'report'|'interview'|'context' }[]
  pending: { confirmJobs: Job[], decisions: string[] }  // decisions 来自 CONTEXT.md 第七节，每行一条原文
}

type ReportMeta = { file: string, type: 'daily'|'weekly', date: string, title: string }
type InterviewMeta = { file: string, company: string, position: string, status: string, updated: string, snippet: string }
type ResumeMeta = { file: string, company: string, role: string, updated: string }
```

## 端点

| 方法/路径 | 入参 | 返回 | 说明 |
|---|---|---|---|
| GET `/api/health` | — | `Health` | 模式与工作区路径；前端据此显示/隐藏 DemoRibbon |
| GET `/api/stats` | — | `Stats` | 仪表盘数据（服务端从台账+CONTEXT 计算） |
| GET `/api/ledger` | — | `{ rows: Job[] }` | 全量台账 |
| POST `/api/ledger` | `{ company*, position*, source*, city?, salary_range?, jd_text?, notes? }` | `{ row: Job }` | 新行：status=已收藏、date_added/last_action=今天、id 自增；jd_text 非空则写 `02-jobs/jd/<company>-<position>.md` 并回填 jd_file；company+position 重复 → 409 `{ error, existing: Job }` |
| PATCH `/api/ledger/:id` | `{ status?, next_step?, notes?, match_grade?, last_action? }` | `{ row: Job }` | 局部更新；改 status 时服务端自动把 last_action 设为今天（除非显式传）；id 不存在 → 404 |
| GET `/api/jd/:file` | file = jd_file 值 | `{ raw: string }` | JD Markdown 原文；空/不存在 → 404 |
| GET `/api/reports` | — | `{ list: ReportMeta[] }` | 日报+周报，按日期倒序 |
| GET `/api/reports/:file` | — | `{ raw }` | 报告 Markdown |
| GET `/api/interviews` | — | `{ list: InterviewMeta[] }` | 面试档案列表（company/position/status 从文件头解析，解析不出给空串） |
| GET `/api/interviews/:file` | — | `{ raw }` | 档案 Markdown |
| PUT `/api/interviews/:file` | `{ raw }` | `{ ok: true }` | 整文件覆写 |
| GET `/api/context` | — | `{ raw }` | CONTEXT.md 原文 |
| PUT `/api/context` | `{ raw }` | `{ ok: true }` | 整文件覆写 |
| GET `/api/profile/master` | — | `{ raw }` | 主简历 |
| PUT `/api/profile/master` | `{ raw }` | `{ ok: true }` | |
| GET `/api/profile/strategy` | — | `{ raw }` | 对内策略笔记（内部文件） |
| PUT `/api/profile/strategy` | `{ raw }` | `{ ok: true }` | |
| GET `/api/resumes` | — | `{ list: ResumeMeta[] }` | runtime/resumes/ 定制版本列表 |
| GET `/api/resumes/:file` | — | `{ raw }` | 单个定制简历 Markdown 原文；不存在 → 404 |

## 服务端规则

1. **工作区解析**：`WORKSPACE_DIR` 环境变量 → 未设置用仓库内置 `demo-workspace/`（demo 模式）。
   启动时校验关键文件（CONTEXT.md、02-jobs/job-ledger.csv）存在；缺失自动用模板种子补齐（只补缺不覆盖）。
2. **CSV 读写**：支持引号转义的标准 CSV 小解析器；写回时保持列表头原顺序：
   `id,date_added,company,position,source,city,salary_range,jd_file,match_grade,status,last_action,next_step,notes`
3. **路径安全**：所有 `:file` 参数禁止 `..` 与绝对路径；只允许读对应目录下的 `.md`/`.csv`。
4. **静态托管**：生产模式托管 `dist/` + SPA fallback（除 `/api` 外全部回退 index.html）。
5. **并发**：单用户本地工具，写操作串行化即可（进程内互斥锁）。
6. **今天的日期**：服务端用运行机器当地日期（YYYY-MM-DD）。

## 前端规则

1. scaffold 产出 `src/lib/api.ts`：导出上述 `Job/Stats/...` 类型与 `api` 对象（每端点一个方法，fetch 封装，统一错误抛 `Error(中文)`）。
2. 页面组件一律经 `api` 取数，不硬编码演示数据；加载中骨架屏、失败 Toast。
3. 写操作成功后刷新本地缓存（页面自管 state 或简单失效重取）。

### 面试问答（v1，2026-08-06 新增）

```ts
// 问答条目（与 server/data/qa.json 字段一一对应）
type QaItem = {
  id: number        // 序号
  cat: string       // 分类（政策基础 / AI+商品消费 / AI+服务消费 / AI+商业创新 / 推广与环境 / Agent 工程）
  dim: string       // 维度（政策解读 / 公司背景 / 项目经历 / 岗位认知 / 行业趋势）
  q: string         // 问题
  a: string         // 答案
  src: string       // 信源
}
```

| 方法/路径 | 入参 | 返回 | 说明 |
|---|---|---|---|
| GET `/api/qa` | `cat?` `dim?` `q?`（关键词，匹配问题+答案） | `{ count, questions: QaItem[] }` | 问答列表，三个过滤均可选 |
| GET `/api/qa/meta` | — | `{ count, cats: string[], dims: string[] }` | 分类/维度选项（前端 Tab 与筛选用） |
| GET `/api/qa/random` | `n?`（默认 5，上限 50）`cat?` `dim?` | `{ count, questions: QaItem[] }` | 随机抽题（自测模式） |

> 数据源：`server/data/qa.json`（飞书多维表格「面试问答准备」导出，同步脚本见 `scripts/qa_sync.py`；OpenClaw 侧 feishu_bitable 工具可随时重新导出）。
