/**
 * 对内策略笔记 strategy.md 解析（纯函数）。
 * 契约 GET/PUT /api/profile/strategy 只给原文，页面把六节解析成结构化内容渲染。
 */

export type StrategySectionKey =
  | 'strengths' // 一、命脉卖点与证据
  | 'weakness' // 二、短板与应对话术
  | 'salary' // 三、薪资底线与期望
  | 'leave' // 四、真实离职原因
  | 'targets' // 五、目标公司清单
  | 'keywords' // 六、关键词迭代表
  | 'unknown'

export interface StrategySection {
  key: StrategySectionKey
  num: string
  title: string
  body: string
  order: number
}

const NUM_TO_KEY: Record<string, StrategySectionKey> = {
  一: 'strengths',
  二: 'weakness',
  三: 'salary',
  四: 'leave',
  五: 'targets',
  六: 'keywords',
}

export function splitStrategy(raw: string): StrategySection[] {
  const sections: StrategySection[] = []
  let current: StrategySection | null = null
  let order = 0
  for (const line of raw.split('\n')) {
    const h = /^##\s+(.+)$/.exec(line)
    if (h) {
      if (current) {
        current.body = current.body.replace(/^\n+|\n+$/g, '')
        sections.push(current)
      }
      const m = /^([一二三四五六])\s*[、.．]?\s*(.*)$/.exec(h[1])
      current = {
        key: m ? (NUM_TO_KEY[m[1]] ?? 'unknown') : 'unknown',
        num: m?.[1] ?? '',
        title: (m?.[2] ?? h[1]).trim(),
        body: '',
        order: order++,
      }
      continue
    }
    if (current) current.body += line + '\n'
  }
  if (current) {
    current.body = current.body.replace(/^\n+|\n+$/g, '')
    sections.push(current)
  }
  return sections
}

export function getSection(sections: StrategySection[], key: StrategySectionKey) {
  return sections.find((s) => s.key === key)
}

// ---------------------------------------------------------------------------

export interface SellingPoint {
  title: string
  evidence: string
}

/** '1. **卖点**：标题 ｜ 证据：……' */
export function parseSellingPoints(body: string): SellingPoint[] {
  const out: SellingPoint[] = []
  for (const line of body.split('\n')) {
    const m = /^\d+\.\s*\*\*(.+?)\*\*\s*[：:]\s*(.+?)\s*｜\s*证据\s*[：:]\s*(.+)$/.exec(line.trim())
    if (m) out.push({ title: m[2].trim(), evidence: m[3].trim() })
  }
  return out
}

/** Markdown 表格 → 行数组（含表头） */
export function parseTable(body: string): string[][] {
  const rows: string[][] = []
  for (const line of body.split('\n')) {
    const t = line.trim()
    if (!t.startsWith('|')) continue
    const cells = t
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim())
    if (cells.length === 0) continue
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue
    rows.push(cells)
  }
  return rows
}

export interface SalaryRow {
  label: string
  note: string
  value: string
}

/** '- 底线（低于此免谈）：25K' → { label: 底线, note: 低于此免谈, value: 25K } */
export function parseSalary(body: string): SalaryRow[] {
  const out: SalaryRow[] = []
  for (const line of body.split('\n')) {
    const m = /^[-*]\s+([^（）(：:]+?)\s*(?:（([^（）]*)）)?\s*[：:]\s*(.+)$/.exec(line.trim())
    if (m) {
      let label = m[1].trim()
      if (label.includes('口径')) label = '对外口径'
      out.push({ label, note: (m[2] ?? '').trim(), value: m[3].trim() })
    }
  }
  return out
}

/** 真实离职原因：第一节非引用非空段落 */
export function parseLeaveReason(body: string): string {
  for (const line of body.split('\n')) {
    const t = line.trim()
    if (t && !t.startsWith('>')) return t
  }
  return ''
}

export interface KeywordRound {
  round: string
  date: string
  effective: string[]
  ineffective: string[]
  positive: string
  rejection: string
}

/** 关键词迭代表（第六节） */
export function parseKeywords(body: string): KeywordRound[] {
  const rows = parseTable(body)
  if (rows.length < 2) return []
  const split = (s: string) =>
    s && s !== '—'
      ? s
          .split('、')
          .map((w) => w.trim())
          .filter(Boolean)
      : []
  return rows.slice(1).map((r) => ({
    round: r[0] ?? '',
    date: r[1] ?? '',
    effective: split(r[2] ?? ''),
    ineffective: split(r[3] ?? ''),
    positive: r[4] ?? '',
    rejection: r[5] ?? '',
  }))
}

/** 节正文是否没有实质内容（仅引言或空） */
export function isBodyEmpty(body: string): boolean {
  return body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('>')).length === 0
}

/** 策略笔记是否整体未初始化 */
export function strategyUninitialized(raw: string, sections: StrategySection[]): boolean {
  if (raw.includes('待梳理')) return true
  return sections.every((s) => isBodyEmpty(s.body))
}
