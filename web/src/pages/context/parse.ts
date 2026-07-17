/**
 * CONTEXT.md 七节解析 / 重组 / 拍板改写（纯函数，不依赖 React）。
 *
 * 契约只有 GET/PUT /api/context（整文件原文），所以页面把 Markdown 解析成
 * 结构化七节渲染；编辑与「拍板」都在原文上做手术后再整文件 PUT 回去。
 */

export type SectionKey =
  | 'background' // 一、个人背景
  | 'methodology' // 二、求职底层方法论
  | 'rules' // 三、筛选硬规则
  | 'directions' // 四、目标方向与优先级
  | 'glossary' // 五、术语表
  | 'aligned' // 六、已对齐决策
  | 'pending' // 七、待定决策清单
  | 'unknown' // 无法识别的 ## 节（重组时原样保留，不丢内容）

export interface ContextSection {
  key: SectionKey
  /** 中文序号：一 / 二 / …（unknown 为 ''） */
  num: string
  /** 去掉序号后的节标题 */
  title: string
  /** 原始 heading 行（含 '## '） */
  headingLine: string
  /** 该节正文原文（heading 行之后、下一 heading 之前） */
  body: string
  /** 在原文中的出现顺序 */
  order: number
}

export interface ParsedContext {
  /** 第一个 '## ' 之前的全部内容（标题 + 引言） */
  preamble: string
  /** 按原文顺序的全部节（含 unknown） */
  sections: ContextSection[]
}

const NUM_TO_KEY: Record<string, SectionKey> = {
  一: 'background',
  二: 'methodology',
  三: 'rules',
  四: 'directions',
  五: 'glossary',
  六: 'aligned',
  七: 'pending',
}

export const SECTION_ORDER: SectionKey[] = [
  'background',
  'methodology',
  'rules',
  'directions',
  'glossary',
  'aligned',
  'pending',
]

/** 锚点 id（URL #hash 与 scroll-spy 共用） */
export const SECTION_ANCHOR: Record<SectionKey, string> = {
  background: 'background',
  methodology: 'methodology',
  rules: 'hard-rules',
  directions: 'directions',
  glossary: 'glossary',
  aligned: 'aligned',
  pending: 'pending',
  unknown: 'unknown',
}

/** 按 '## ' 行切节 */
export function splitSections(raw: string): ParsedContext {
  const lines = raw.split('\n')
  const preambleLines: string[] = []
  const sections: ContextSection[] = []
  let current: ContextSection | null = null
  let order = 0

  const flush = () => {
    if (!current) return
    current.body = current.body.replace(/^\n+|\n+$/g, '')
    sections.push(current)
  }

  for (const line of lines) {
    const h = /^##\s+(.+)$/.exec(line)
    if (h) {
      flush()
      const m = /^([一二三四五六七])\s*[、.．]?\s*(.*)$/.exec(h[1])
      current = {
        key: m ? (NUM_TO_KEY[m[1]] ?? 'unknown') : 'unknown',
        num: m?.[1] ?? '',
        title: (m?.[2] ?? h[1]).trim(),
        headingLine: line,
        body: '',
        order: order++,
      }
      continue
    }
    if (current) current.body += line + '\n'
    else preambleLines.push(line)
  }
  flush()

  return { preamble: preambleLines.join('\n').replace(/\n+$/g, ''), sections }
}

/** 重组整文件原文；bodies 可覆盖指定节正文 */
export function buildRaw(
  parsed: ParsedContext,
  bodies?: Partial<Record<SectionKey, string>>,
): string {
  const parts: string[] = [parsed.preamble]
  for (const sec of [...parsed.sections].sort((a, b) => a.order - b.order)) {
    const body = (bodies?.[sec.key] ?? sec.body).replace(/^\n+|\n+$/g, '')
    parts.push(body ? `${sec.headingLine}\n\n${body}` : sec.headingLine)
  }
  return parts.filter((p) => p.trim().length > 0).join('\n\n') + '\n'
}

export function getSection(parsed: ParsedContext, key: SectionKey): ContextSection | undefined {
  return parsed.sections.find((s) => s.key === key)
}

// ---------------------------------------------------------------------------
// 各节子解析
// ---------------------------------------------------------------------------

export interface KV {
  key: string
  value: string
}

/** '- key：value' 列表项（个人背景 / 硬规则 / 薪资等通用） */
export function parsePairs(body: string): KV[] {
  const out: KV[] = []
  for (const line of body.split('\n')) {
    const m = /^[-*]\s+([^：:]{1,30})[：:]\s*(.+)$/.exec(line.trim())
    if (m) out.push({ key: m[1].trim(), value: m[2].trim() })
  }
  return out
}

export interface Principle {
  title: string
  desc: string
}

/** '- **标题**：描述'（第二节方法论） */
export function parsePrinciples(body: string): Principle[] {
  const out: Principle[] = []
  for (const line of body.split('\n')) {
    const m = /^[-*]\s+\*\*(.+?)\*\*\s*[：:]\s*(.+)$/.exec(line.trim())
    if (m) out.push({ title: m[1].trim(), desc: m[2].trim() })
  }
  return out
}

export interface RulesContent {
  rules: KV[]
  /** 固定纪律行原文（去掉 '固定纪律（不可删）：' 前缀） */
  discipline: string | null
}

export function parseRules(body: string): RulesContent {
  let discipline: string | null = null
  for (const line of body.split('\n')) {
    const m = /^固定纪律（不可删）[：:]\s*(.+)$/.exec(line.trim())
    if (m) {
      discipline = m[1].trim()
      break
    }
  }
  return { rules: parsePairs(body), discipline }
}

/** Markdown 表格 → 行数组（含首行表头，自动跳过分隔行） */
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
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue // 分隔行
    rows.push(cells)
  }
  return rows
}

/** 去掉行内代码反引号（展示用） */
export function stripTicks(s: string): string {
  return s.replace(/`([^`]*)`/g, '$1')
}

export interface AlignedDecision {
  date: string
  text: string
}

/** 第六节：'- YYYY-MM-DD：内容' */
export function parseAligned(body: string): AlignedDecision[] {
  const out: AlignedDecision[] = []
  for (const line of body.split('\n')) {
    const m = /^[-*]\s+(\d{4}-\d{2}-\d{2})\s*[：:]\s*(.+)$/.exec(line.trim())
    if (m) out.push({ date: m[1], text: m[2].trim() })
  }
  return out
}

export interface PendingDecision {
  /** 稳定 key：原始行 */
  rawLine: string
  /** 决策问题（去掉尾部的（…提出…关联…）） */
  title: string
  /** 括号内完整说明，如 '2025-07-14 提出，07-21 前答复；关联 J-20250628-001' */
  meta: string
  /** 关联对象（J-… 或 公司 ⭐），可为空 */
  related: string
}

/** 第七节：'- 问题（2025-07-14 提出，…；关联 …）' */
export function parsePending(body: string): PendingDecision[] {
  const out: PendingDecision[] = []
  for (const line of body.split('\n')) {
    const t = line.trim()
    if (!/^[-*]\s+/.test(t)) continue
    const m = /^[-*]\s+(.+?)(?:（([^（）]*)）)?\s*$/.exec(t)
    if (!m) continue
    const title = m[1].trim()
    if (!title) continue
    const meta = (m[2] ?? '').trim()
    const rm = /关联\s*(.+)$/.exec(meta)
    out.push({ rawLine: t, title, meta, related: rm ? rm[1].trim() : '' })
  }
  return out
}

// ---------------------------------------------------------------------------
// 拍板改写
// ---------------------------------------------------------------------------

export interface DecideInput {
  decision: PendingDecision
  conclusion: string
  reason: string
  /** 勾选时在第三节硬规则列表末尾追加一条规则 */
  syncRule: boolean
  /** YYYY-MM-DD */
  today: string
}

/**
 * 拍板：第七节移除该待定项；第六节列表顶部插入带今日日期的已对齐决策；
 * 可选在第三节规则列表末尾追加一条规则。返回新的整文件原文。
 */
export function applyDecision(raw: string, input: DecideInput): string {
  const parsed = splitSections(raw)
  const bodies: Partial<Record<SectionKey, string>> = {}

  const pendingSec = getSection(parsed, 'pending')
  if (pendingSec) {
    const kept = pendingSec.body.split('\n').filter((l) => l.trim() !== input.decision.rawLine)
    bodies.pending = kept.join('\n').replace(/\n{3,}/g, '\n\n')
  }

  const alignedSec = getSection(parsed, 'aligned')
  if (alignedSec) {
    const reasonPart = input.reason ? `——${input.reason}` : ''
    const newLine = `- ${input.today}：${input.conclusion}${reasonPart}（拍板自待定：${input.decision.title}）`
    const lines = alignedSec.body.split('\n')
    const firstItem = lines.findIndex((l) => /^[-*]\s+/.test(l.trim()))
    if (firstItem >= 0) lines.splice(firstItem, 0, newLine)
    else lines.push('', newLine)
    bodies.aligned = lines.join('\n').replace(/\n{3,}/g, '\n\n')
  }

  if (input.syncRule) {
    const rulesSec = getSection(parsed, 'rules')
    if (rulesSec) {
      const lines = rulesSec.body.split('\n')
      let lastItem = -1
      lines.forEach((l, i) => {
        if (/^[-*]\s+/.test(l.trim())) lastItem = i
      })
      const ruleLine = `- ${input.conclusion}（${input.today} 拍板）`
      if (lastItem >= 0) lines.splice(lastItem + 1, 0, ruleLine)
      else lines.push('', ruleLine)
      bodies.rules = lines.join('\n')
    }
  }

  return buildRaw(parsed, bodies)
}

/** 第三节是否被清空（保存校验用）：无 rules 节或节内没有任何规则列表项 */
export function hardRulesCleared(raw: string): boolean {
  const parsed = splitSections(raw)
  const sec = getSection(parsed, 'rules')
  if (!sec) return true
  return parseRules(sec.body).rules.length === 0
}

/** 侧锚点「最近更新」：取已对齐决策里最新日期（MM-DD），无则 null */
export function latestAlignedDate(parsed: ParsedContext): string | null {
  const sec = getSection(parsed, 'aligned')
  if (!sec) return null
  const items = parseAligned(sec.body)
  if (items.length === 0) return null
  const latest = items.map((i) => i.date).sort().at(-1)!
  return latest.slice(5) // MM-DD
}

/** 节内容为空（仅剩引言/空行）→ 卡片显示「待梳理」 */
export function isSectionEmpty(body: string): boolean {
  return (
    body
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('>')).length === 0
  )
}

/** 本地日期 YYYY-MM-DD */
export function todayStr(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
