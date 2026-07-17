import type { Stats } from '@/lib/api'

/** 面试档案页的 Markdown 解析与展示工具（数据全部来自 API，解析规则与服务端 server/interviews.ts 对齐） */

/** 公司首字符色块色板（jobs.md：按公司名 hash 取 8 个暖色之一） */
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

export function companyColor(company: string): string {
  let hash = 0
  for (const ch of company) hash = (hash + ch.codePointAt(0)!) % 997
  return COMPANY_COLORS[hash % COMPANY_COLORS.length]
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

export function weekdayLabel(date: Date): string {
  return WEEKDAYS[date.getDay()]
}

/** YYYY-MM-DD → Date（当地零点）；非法返回 null */
export function parseDate(date: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 「今天」锚定：stats.trend14d 末位 = 服务端今天（demo 模式锚定种子最新日期）；失败退回真实今天 */
export function anchorToday(stats: Stats | null): string {
  return stats?.trend14d?.[stats.trend14d.length - 1]?.date ?? formatLocalDate(new Date())
}

/** 与 anchor 今天相差天数（date - today；负数 = 已过去） */
export function daysFromToday(dateStr: string, today: string): number | null {
  const date = parseDate(dateStr)
  const base = parseDate(today)
  if (!date || !base) return null
  return Math.round((date.getTime() - base.getTime()) / 86_400_000)
}

/** 倒计时文案：0=今天，1=明天，其余「N 天后」 */
export function countdownLabel(days: number): string {
  if (days === 0) return '今天'
  if (days === 1) return '明天'
  return `${days} 天后`
}

// ---------------------------------------------------------------------------
// 档案 Markdown 解析
// ---------------------------------------------------------------------------

/** 从档案头部 "- 字段：值" 行解析字段（与 server/interviews.ts parseInterviewField 一致） */
export function parseField(raw: string, field: string): string {
  const re = new RegExp(`^\\s*[-*]?\\s*${field}\\s*[：:]\\s*(.+?)\\s*$`, 'm')
  const m = raw.match(re)
  return m ? m[1].trim() : ''
}

/** 状态字段：去掉尾随括号注释，如 "面试中（与台账 status 同步）" → "面试中" */
export function parseStatus(raw: string): string {
  return parseField(raw, '状态').replace(/[（(].*$/, '').trim()
}

/** 取某个 `## 标题` 节的正文（到下一个 ## 或文末） */
export function sectionBody(raw: string, heading: string): string {
  const re = new RegExp(`^##\\s+${heading}\\s*$`, 'm')
  const m = re.exec(raw)
  if (!m) return ''
  const rest = raw.slice(m.index + m[0].length)
  const next = /^##\s+/m.exec(rest)
  return (next ? rest.slice(0, next.index) : rest).trim()
}

export type ArchiveSection = { heading: string; body: string }

/** 按 `## ` 切分档案：preamble（首个 ## 之前，含 # 标题与字段行）+ 各节 */
export function splitSections(raw: string): { preamble: string; sections: ArchiveSection[] } {
  const re = /^##\s+(.+)$/gm
  const matches = [...raw.matchAll(re)]
  if (matches.length === 0) return { preamble: raw.trim(), sections: [] }
  const preamble = raw.slice(0, matches[0].index).trim()
  const sections: ArchiveSection[] = matches.map((m, i) => {
    const start = m.index + m[0].length
    const end = i + 1 < matches.length ? matches[i + 1].index : raw.length
    return { heading: m[1].trim(), body: raw.slice(start, end).trim() }
  })
  return { preamble, sections }
}

/** preamble 去掉 # 标题与 "- 字段：值" 行后的剩余（如说明性引用块），没有则空串 */
export function preambleRemainder(preamble: string): string {
  return preamble
    .split('\n')
    .filter((line) => {
      const t = line.trim()
      if (t === '') return false
      if (t.startsWith('#')) return false
      if (/^[-*]\s*[^：:]{1,12}[：:]/.test(t)) return false // 字段行
      return true
    })
    .join('\n')
    .trim()
}

// ---------------------------------------------------------------------------
// 轮次
// ---------------------------------------------------------------------------

const ROUND_LABELS: Record<number, string> = {
  1: '一面',
  2: '二面',
  3: '三面',
  4: '四面',
  5: '五面',
  6: '六面',
}

export type Round = {
  /** 节点短标签：一面 / 二面 / HR 面 */
  label: string
  /** 原始标题（### 第 1 轮：视频，业务面（07-12 14:00，45 分钟）） */
  title: string
  /** 该轮正文 */
  body: string
  /** 待进行 = 未来的轮次（正文含「待进行」） */
  pending: boolean
  /** 从标题/正文提取的日期时间文本（如 07-19 14:00 或 2025-07-19 14:00），可空 */
  when: string
}

/** 解析「轮次记录」节下的 ### 轮次块 */
export function parseRounds(raw: string): Round[] {
  const body = sectionBody(raw, '轮次记录')
  if (!body) return []
  const re = /^###\s+(.+)$/gm
  const matches = [...body.matchAll(re)]
  return matches.map((m, i) => {
    const start = m.index + m[0].length
    const end = i + 1 < matches.length ? matches[i + 1].index : body.length
    const title = m[1].trim()
    const roundBody = body.slice(start, end).trim()
    const num = /第\s*(\d+)\s*轮/.exec(title)?.[1]
    const label = num
      ? (ROUND_LABELS[Number(num)] ?? `第 ${num} 轮`)
      : /HR\s*面/i.test(title)
        ? 'HR 面'
        : title.split(/[：:，,（(]/)[0].trim()
    const when =
      /(\d{4}-\d{2}-\d{2}(?:\s+\d{1,2}:\d{2})?)/.exec(title)?.[1] ??
      /(\d{2}-\d{2}(?:\s+\d{1,2}:\d{2})?)/.exec(title)?.[1] ??
      ''
    return { label, title, body: roundBody, pending: /待进行/.test(roundBody), when }
  })
}

/** 「下一轮安排」行内容（"下一轮安排："之后），没有则空串 */
export function nextRoundLine(raw: string): string {
  const m = raw.match(/下一轮安排\s*[：:]\s*(.+?)\s*$/m)
  return m ? m[1].trim() : ''
}

export type Upcoming = {
  /** 轮次标签（二面 / HR 面 / 终面…） */
  round: string
  /** YYYY-MM-DD */
  date: string
  /** HH:mm，可空 */
  time: string
}

/** 从「下一轮安排」行解析日期时间（与服务端 extractDate 一致：仅接受 YYYY-MM-DD 全日期） */
export function parseUpcoming(raw: string): Upcoming | null {
  const line = nextRoundLine(raw)
  if (!line) return null
  const full = /(\d{4})-(\d{2})-(\d{2})/.exec(line)
  if (!full) return null
  const date = `${full[1]}-${full[2]}-${full[3]}`
  const time = /(\d{1,2}:\d{2})/.exec(line)?.[1] ?? ''
  const round = /((?:第?[一二三四五六七八九十\d]+面)|HR\s*面|终面)/.exec(line)?.[1]?.replace(/\s+/g, '') ?? ''
  return { round, date, time }
}

/** 「下一步」节列表项（去 `- ` 前缀） */
export function nextStepItems(raw: string): string[] {
  return sectionBody(raw, '下一步')
    .split('\n')
    .map((line) => /^\s*[-*]\s+(.+)$/.exec(line)?.[1] ?? '')
    .filter((line) => line !== '')
}

/** 「预测问题」节下的 ### 问题块 */
export type QuestionItem = { index: string; question: string; body: string }

export function parseQuestions(body: string): QuestionItem[] {
  const re = /^###\s+(\d+)[.、]?\s*(.+)$/gm
  const matches = [...body.matchAll(re)]
  return matches.map((m, i) => {
    const start = m.index + m[0].length
    const end = i + 1 < matches.length ? matches[i + 1].index : body.length
    return { index: m[1], question: m[2].trim(), body: body.slice(start, end).trim() }
  })
}

/** 「问答库」节列表项原文（保留 Q：… A：… 文本） */
export function parseQALines(body: string): string[] {
  return body
    .split('\n')
    .map((line) => /^\s*[-*]\s+(.+)$/.exec(line)?.[1] ?? '')
    .filter((line) => line !== '')
}

/** 公司卡片「当前：…」：有待进行轮次给「二面 07-19 14:00」，否则取下一步首条首句（去掉「下一轮安排：」前缀） */
export function currentFocus(raw: string, rounds: Round[]): string {
  const pending = rounds.find((r) => r.pending)
  if (pending) return [pending.label, pending.when].filter(Boolean).join(' ')
  const first = nextStepItems(raw)[0] ?? ''
  return first
    .replace(/^下一轮安排\s*[：:]\s*/, '')
    .split(/[；;]/)[0]
    .trim()
}

/** 卡片关键行动：优先「准备：…」条目，否则下一步首条；截 22 字 */
export function keyAction(raw: string): string {
  const items = nextStepItems(raw)
  const prepare = items.find((l) => /^准备/.test(l))
  const text = (prepare ?? items[0] ?? '').replace(/^准备[：:]\s*/, '准备 ')
  return text.length > 22 ? `${text.slice(0, 22)}…` : text
}
