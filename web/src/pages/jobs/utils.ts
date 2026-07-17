import type { Job, JobSource, JobStatus, MatchGrade } from '@/lib/api'
import { JOB_STATUSES } from '@/lib/meta'

/**
 * 岗位台账页共享常量与纯函数助手（jobs.md）。
 * 筛选 / 排序 / 统计全部在这里实现，Jobs.tsx 与各子组件共用同一口径。
 */

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

/** 排序键（URL ?sort= 值） */
export type SortKey = 'updated_desc' | 'updated_asc' | 'salary_desc' | 'grade_desc' | 'added_desc'

/** 评级筛选（URL ?grade= 值）：'3'|'2'|'1' 星数，'0' 未评级 */
export type GradeFilter = '' | '3' | '2' | '1' | '0'

export type Filters = {
  statuses: JobStatus[]
  grade: GradeFilter
  sources: JobSource[]
  q: string
  addedToday: boolean
}

export const EMPTY_FILTERS: Filters = {
  statuses: [],
  grade: '',
  sources: [],
  q: '',
  addedToday: false,
}

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'updated_desc', label: '更新日期 ↓' },
  { key: 'updated_asc', label: '更新日期 ↑' },
  { key: 'salary_desc', label: '薪资 ↓' },
  { key: 'grade_desc', label: '评级 ↓' },
  { key: 'added_desc', label: '收录日期 ↓' },
]

// ---------------------------------------------------------------------------
// 状态流转
// ---------------------------------------------------------------------------

/** 7 节点正向 pipeline（jobs.md S4） */
export const PIPELINE: JobStatus[] = ['已收藏', '待投递', '已投递', '被查看', '沟通中', '面试中', 'offer']

/** 终态负向（收进步骤条右侧 … 下拉） */
export const TERMINAL_NEGATIVE: JobStatus[] = ['对方已拒', '已放弃', '已结束']

/** 下一合法节点；终态 / 未知返回 null */
export function nextStatus(status: JobStatus): JobStatus | null {
  const i = PIPELINE.indexOf(status)
  if (i < 0 || i >= PIPELINE.length - 1) return null
  return PIPELINE[i + 1]
}

/** 「进行中」口径（与侧栏徽标 / 仪表盘漏斗一致） */
export const IN_PROGRESS: JobStatus[] = ['待投递', '已投递', '被查看', '沟通中', '面试中']

// ---------------------------------------------------------------------------
// 日期
// ---------------------------------------------------------------------------

/** 运行机器当地日期 YYYY-MM-DD */
export function localTodayStr(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** last_action 前缀日期（"2025-07-16 初筛通过" → "2025-07-16"）；取不到返回 '' */
export function datePrefix(s: string): string {
  const m = /^\d{4}-\d{2}-\d{2}/.exec(s)
  return m ? m[0] : ''
}

/**
 * 页面口径的「今天」：demo 模式锚定到台账里出现过的最新日期
 * （与 server/workspace.ts 的 demo 锚定规则一致）；真实工作区用机器当地日期。
 */
export function effectiveToday(rows: Job[], mode: 'demo' | 'workspace' | null): string {
  if (mode !== 'demo') return localTodayStr()
  let max = ''
  for (const r of rows) {
    if (r.date_added > max) max = r.date_added
    const la = datePrefix(r.last_action)
    if (la > max) max = la
  }
  return max || localTodayStr()
}

/** 今天所在周的周一（YYYY-MM-DD） */
export function mondayOf(today: string): string {
  const d = new Date(`${today}T12:00:00`)
  if (Number.isNaN(d.getTime())) return today
  const dow = (d.getDay() + 6) % 7 // 周一 = 0
  d.setDate(d.getDate() - dow)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// ---------------------------------------------------------------------------
// 公司首字符色块（jobs.md S3：按公司名 hash 取 8 个暖色之一）
// ---------------------------------------------------------------------------

export const COMPANY_COLORS = [
  '#7A9E7E',
  '#B07D62',
  '#6E8CA0',
  '#8C7BAB',
  '#A06B7A',
  '#5E8B7E',
  '#937B54',
  '#6B7F9E',
] as const

export function companyColor(name: string): string {
  let hash = 0
  for (const ch of name) hash = (hash + (ch.codePointAt(0) ?? 0)) >>> 0
  return COMPANY_COLORS[hash % COMPANY_COLORS.length]
}

// ---------------------------------------------------------------------------
// 筛选 / 排序
// ---------------------------------------------------------------------------

/** 评级星数（'' → 0） */
export function gradeValue(grade: MatchGrade): number {
  return grade ? grade.length : 0
}

/** 薪资下限（K），"26-38K·14薪" → 26；解析不出返回 null */
export function salaryLow(salary: string): number | null {
  const m = /(\d+(?:\.\d+)?)\s*[Kk]?\s*[-~]/.exec(salary)
  if (m) return Number(m[1])
  const single = /(\d+(?:\.\d+)?)\s*[Kk]/.exec(salary)
  return single ? Number(single[1]) : null
}

/** 关键词匹配域：公司 / 岗位 / 备注（另带上 id / 城市，方便粘贴检索） */
function matchesQ(job: Job, q: string): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  return [job.company, job.position, job.notes, job.id, job.city]
    .join('\n')
    .toLowerCase()
    .includes(needle)
}

export function applyFilters(rows: Job[], f: Filters, today: string): Job[] {
  return rows.filter((r) => {
    if (f.addedToday && r.date_added !== today) return false
    if (f.statuses.length > 0 && !f.statuses.includes(r.status)) return false
    if (f.grade !== '') {
      const v = f.grade === '0' ? 0 : Number(f.grade)
      if (gradeValue(r.match_grade) !== v) return false
    }
    if (f.sources.length > 0 && !f.sources.includes(r.source)) return false
    if (!matchesQ(r, f.q)) return false
    return true
  })
}

/** 更新日期 = last_action 前缀，缺省回退 date_added */
function updatedOf(r: Job): string {
  return datePrefix(r.last_action) || r.date_added
}

export function sortRows(rows: Job[], sort: SortKey): Job[] {
  const arr = [...rows]
  const tie = (a: Job, b: Job) => (b.date_added + b.id).localeCompare(a.date_added + a.id)
  switch (sort) {
    case 'updated_asc':
      return arr.sort((a, b) => updatedOf(a).localeCompare(updatedOf(b)) || tie(a, b))
    case 'salary_desc':
      return arr.sort((a, b) => {
        const sa = salaryLow(a.salary_range)
        const sb = salaryLow(b.salary_range)
        if (sa === null && sb === null) return tie(a, b)
        if (sa === null) return 1
        if (sb === null) return -1
        return sb - sa || tie(a, b)
      })
    case 'grade_desc':
      return arr.sort((a, b) => gradeValue(b.match_grade) - gradeValue(a.match_grade) || tie(a, b))
    case 'added_desc':
      return arr.sort((a, b) => tie(a, b))
    case 'updated_desc':
    default:
      return arr.sort((a, b) => updatedOf(b).localeCompare(updatedOf(a)) || tie(a, b))
  }
}

/** 生效条件数（重置筛选按钮计数 / 结果条显隐） */
export function activeFilterCount(f: Filters): number {
  return (
    (f.statuses.length > 0 ? 1 : 0) +
    (f.grade !== '' ? 1 : 0) +
    (f.sources.length > 0 ? 1 : 0) +
    (f.q.trim() !== '' ? 1 : 0) +
    (f.addedToday ? 1 : 0)
  )
}

// ---------------------------------------------------------------------------
// URL 参数解析（/jobs?status=&grade=&source=&q=&sort=&added=&id=）
// ---------------------------------------------------------------------------

const STATUS_SET = new Set<string>(JOB_STATUSES)
const SOURCE_SET = new Set<string>([
  'boss',
  'liepin',
  'linkedin',
  'lagou',
  '官网',
  '内推',
  '猎头',
  '其他',
])
const SORT_SET = new Set<string>(SORT_OPTIONS.map((o) => o.key))

export function parseStatuses(raw: string | null): JobStatus[] {
  if (!raw) return []
  return raw.split(',').filter((s): s is JobStatus => STATUS_SET.has(s))
}

export function parseSources(raw: string | null): JobSource[] {
  if (!raw) return []
  return raw.split(',').filter((s): s is JobSource => SOURCE_SET.has(s))
}

export function parseGrade(raw: string | null): GradeFilter {
  return raw === '3' || raw === '2' || raw === '1' || raw === '0' ? raw : ''
}

export function parseSort(raw: string | null): SortKey {
  return raw && SORT_SET.has(raw) ? (raw as SortKey) : 'updated_desc'
}

// ---------------------------------------------------------------------------
// CSV 导出（S1 下载 CSV：当前筛选结果）
// ---------------------------------------------------------------------------

const CSV_HEADER = [
  'id',
  'date_added',
  'company',
  'position',
  'source',
  'city',
  'salary_range',
  'jd_file',
  'match_grade',
  'status',
  'last_action',
  'next_step',
  'notes',
] as const

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

export function downloadCsv(rows: Job[]): void {
  const lines = [
    CSV_HEADER.join(','),
    ...rows.map((r) => CSV_HEADER.map((k) => csvCell(String(r[k] ?? ''))).join(',')),
  ]
  const blob = new Blob([`﻿${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'job-ledger.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
