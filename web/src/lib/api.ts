/**
 * jobhunt-copilot 网页工作台 — 类型化 API client（contracts/api.md v1）
 *
 * 所有页面一律经 `api` 取数，不硬编码演示数据。
 * 每个方法与契约端点一一对应；失败统一抛中文 Error。
 */

// ---------------------------------------------------------------------------
// 数据类型（与 contracts/api.md「数据类型」一节保持一致，不得擅自改字段名）
// ---------------------------------------------------------------------------

/** 岗位来源（存储值） */
export type JobSource =
  | 'boss'
  | 'liepin'
  | 'linkedin'
  | 'lagou'
  | '官网'
  | '内推'
  | '猎头'
  | '其他'

/** 岗位状态（10 态，全站唯一状态语言） */
export type JobStatus =
  | '已收藏'
  | '待投递'
  | '已投递'
  | '被查看'
  | '沟通中'
  | '面试中'
  | 'offer'
  | '对方已拒'
  | '已放弃'
  | '已结束'

/** 匹配评级（空串 = 未评级） */
export type MatchGrade = '' | '⭐' | '⭐⭐' | '⭐⭐⭐'

/** 面试问答条目（与 server/data/qa.json 字段一一对应） */
export type QaItem = {
  /** 序号 */
  id: number
  /** 分类（政策章节 / Agent 工程等） */
  cat: string
  /** 维度（政策解读 / 公司背景 / 项目经历 / 岗位认知 / 行业趋势） */
  dim: string
  /** 问题 */
  q: string
  /** 答案 */
  a: string
  /** 信源 */
  src: string
}

/** 岗位台账行（与 02-jobs/job-ledger.csv 一一对应） */
export type Job = {
  /** J-YYYYMMDD-NN，如 J-20260717-03 */
  id: string
  /** YYYY-MM-DD */
  date_added: string
  company: string
  position: string
  source: JobSource
  city: string
  /** 原文如 "25-40K·14薪" */
  salary_range: string
  /** 相对 02-jobs/jd/ 的文件名，可为空 */
  jd_file: string
  match_grade: MatchGrade
  status: JobStatus
  /** YYYY-MM-DD 或 '' */
  last_action: string
  next_step: string
  notes: string
}

/** 工作区健康信息；mode='demo' 时前端显示 DemoRibbon */
export type Health = {
  ok: true
  mode: 'demo' | 'workspace'
  workspaceDir: string
  version: string
}

/** 仪表盘统计数据（服务端从台账 + CONTEXT 计算） */
export type Stats = {
  today: { added: number; passed: number; pendingConfirm: number; applied: number }
  /** 10 态全给，含 0 */
  funnel: { status: JobStatus; count: number }[]
  /** 近 14 天 */
  trend14d: { date: string; added: number; applied: number }[]
  upcomingInterviews: { company: string; position: string; round: string; datetime: string }[]
  recentActivity: { time: string; text: string; kind: 'ledger' | 'report' | 'interview' | 'context' }[]
  /** decisions 来自 CONTEXT.md 第七节，每行一条原文 */
  pending: { confirmJobs: Job[]; decisions: string[] }
}

export type ReportMeta = { file: string; type: 'daily' | 'weekly'; date: string; title: string }
export type InterviewMeta = {
  file: string
  company: string
  position: string
  status: string
  updated: string
  snippet: string
}
export type ResumeMeta = { file: string; company: string; role: string; updated: string }

/** 新增岗位入参（POST /api/ledger） */
export type CreateJobInput = {
  company: string
  position: string
  source: JobSource
  city?: string
  salary_range?: string
  jd_text?: string
  notes?: string
}

/** 岗位局部更新入参（PATCH /api/ledger/:id） */
export type UpdateJobInput = {
  status?: JobStatus
  next_step?: string
  notes?: string
  match_grade?: MatchGrade
  last_action?: string
}

// ---------------------------------------------------------------------------
// fetch 封装
// ---------------------------------------------------------------------------

/** 服务端错误体约定：{ "error": "中文描述" } */
type ErrorBody = { error?: string }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
      ...init,
    })
  } catch {
    throw new Error('无法连接后端服务，请确认服务已启动（默认端口 8787）')
  }

  if (!res.ok) {
    let message = `请求失败（HTTP ${res.status}）`
    try {
      const body = (await res.json()) as ErrorBody
      if (body && typeof body.error === 'string' && body.error) message = body.error
    } catch {
      // 非 JSON 错误体，沿用默认提示
    }
    throw new Error(message)
  }
  return (await res.json()) as T
}

const get = <T>(path: string) => request<T>(path)
const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) })
const patch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
const put = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PUT', body: JSON.stringify(body) })

// ---------------------------------------------------------------------------
// api 对象：每端点一个方法
// ---------------------------------------------------------------------------

export const api = {
  /** GET /api/health — 模式与工作区路径；据此显示/隐藏 DemoRibbon */
  health: () => get<Health>('/api/health'),

  /** GET /api/stats — 仪表盘数据（服务端从台账 + CONTEXT 计算） */
  stats: () => get<Stats>('/api/stats'),

  /** GET /api/ledger — 全量台账 */
  listLedger: () => get<{ rows: Job[] }>('/api/ledger'),

  /**
   * POST /api/ledger — 新增岗位：status=已收藏、date_added/last_action=今天、id 自增；
   * company+position 重复 → 409（错误信息含冲突说明）
   */
  createJob: (input: CreateJobInput) => post<{ row: Job }>('/api/ledger', input),

  /** PATCH /api/ledger/:id — 局部更新；改 status 时服务端自动把 last_action 设为今天（除非显式传） */
  updateJob: (id: string, input: UpdateJobInput) =>
    patch<{ row: Job }>(`/api/ledger/${encodeURIComponent(id)}`, input),

  /** GET /api/jd/:file — JD Markdown 原文；file = Job.jd_file */
  getJd: (file: string) => get<{ raw: string }>(`/api/jd/${encodeURIComponent(file)}`),

  /** GET /api/reports — 日报 + 周报列表，按日期倒序 */
  listReports: () => get<{ list: ReportMeta[] }>('/api/reports'),

  /** GET /api/reports/:file — 报告 Markdown 原文 */
  getReport: (file: string) => get<{ raw: string }>(`/api/reports/${encodeURIComponent(file)}`),

  /** GET /api/interviews — 面试档案列表 */
  listInterviews: () => get<{ list: InterviewMeta[] }>('/api/interviews'),

  /** GET /api/interviews/:file — 档案 Markdown 原文 */
  getInterview: (file: string) => get<{ raw: string }>(`/api/interviews/${encodeURIComponent(file)}`),

  /** PUT /api/interviews/:file — 整文件覆写 */
  putInterview: (file: string, raw: string) =>
    put<{ ok: true }>(`/api/interviews/${encodeURIComponent(file)}`, { raw }),

  /** GET /api/context — CONTEXT.md 原文（求职标准，唯一事实源） */
  getContext: () => get<{ raw: string }>('/api/context'),

  /** PUT /api/context — 整文件覆写 */
  putContext: (raw: string) => put<{ ok: true }>('/api/context', { raw }),

  /** GET /api/profile/master — 主简历 */
  getMasterResume: () => get<{ raw: string }>('/api/profile/master'),

  /** PUT /api/profile/master — 整文件覆写 */
  putMasterResume: (raw: string) => put<{ ok: true }>('/api/profile/master', { raw }),

  /** GET /api/profile/strategy — 对内策略笔记（内部文件，⚠️ 不外发） */
  getStrategy: () => get<{ raw: string }>('/api/profile/strategy'),

  /** PUT /api/profile/strategy — 整文件覆写 */
  putStrategy: (raw: string) => put<{ ok: true }>('/api/profile/strategy', { raw }),

  /** GET /api/resumes — runtime/resumes/ 定制版本列表 */
  listResumes: () => get<{ list: ResumeMeta[] }>('/api/resumes'),

  /** GET /api/resumes/:file — 单个定制简历 Markdown 原文 */
  getResume: (file: string) => get<{ raw: string }>(`/api/resumes/${encodeURIComponent(file)}`),

  // ── 面试问答（/api/qa，数据源：server/data/qa.json ← 飞书「面试问答准备」）──

  /** GET /api/qa — 问答列表（可选 cat/dim/q 过滤） */
  listQa: (params?: { cat?: string; dim?: string; q?: string }) => {
    const sp = new URLSearchParams()
    if (params?.cat) sp.set('cat', params.cat)
    if (params?.dim) sp.set('dim', params.dim)
    if (params?.q) sp.set('q', params.q)
    const qs = sp.toString()
    return get<{ count: number; questions: QaItem[] }>(`/api/qa${qs ? `?${qs}` : ''}`)
  },

  /** GET /api/qa/meta — 分类/维度选项 + 总数 */
  qaMeta: () => get<{ count: number; cats: string[]; dims: string[] }>('/api/qa/meta'),

  /** GET /api/qa/random — 随机抽题 */
  qaRandom: (n = 5, cat?: string, dim?: string) => {
    const sp = new URLSearchParams({ n: String(n) })
    if (cat) sp.set('cat', cat)
    if (dim) sp.set('dim', dim)
    return get<{ count: number; questions: QaItem[] }>(`/api/qa/random?${sp.toString()}`)
  },
}

export default api
