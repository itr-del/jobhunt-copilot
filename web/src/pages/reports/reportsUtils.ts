import type { ReportMeta } from '@/lib/api'

/** 每日简报页的纯函数工具：日期格式化、排序、分组、摘要提取（数据全部来自 API，不硬编码） */

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

/** YYYY-MM-DD → Date（当地零点）；非法返回 null */
export function parseDate(date: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

/** YYYY-MM-DD → `07-17 周四` */
export function shortDateLabel(date: string): string {
  const d = parseDate(date)
  if (!d) return date
  return `${date.slice(5)} ${WEEKDAYS[d.getDay()]}`
}

/** Date → YYYY-MM-DD（当地） */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 周报文件名（去扩展名）→ `2025-W28`；日报同理 */
export function baseName(file: string): string {
  return file.replace(/\.md$/i, '')
}

/**
 * 展示/排序用生效日期：日报用自身日期；周报用该周周日（周一 + 6 天），
 * 使周报排在当周日报之后（reports.md S1 演示顺序：07-15、W28、07-14）。
 */
export function effectiveDate(report: ReportMeta): string {
  if (report.type === 'daily') return report.date
  const monday = parseDate(report.date)
  if (!monday) return report.date
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return formatLocalDate(sunday)
}

/** 列表排序：按生效日期倒序（同日期按文件名倒序） */
export function sortReports(list: ReportMeta[]): ReportMeta[] {
  return [...list].sort((a, b) => {
    const da = effectiveDate(a)
    const db = effectiveDate(b)
    return da === db ? b.file.localeCompare(a.file) : db.localeCompare(da)
  })
}

/** 月分组键：`2025 年 7 月` */
export function monthGroupLabel(date: string): string {
  const d = parseDate(date)
  if (!d) return date
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`
}

/** 按月分组（保持 sortReports 顺序；组按时间倒序） */
export function groupByMonth(sorted: ReportMeta[]): { label: string; items: ReportMeta[] }[] {
  const groups: { label: string; items: ReportMeta[] }[] = []
  for (const item of sorted) {
    const label = monthGroupLabel(effectiveDate(item))
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(item)
    else groups.push({ label, items: [item] })
  }
  return groups
}

/** 取 Markdown 中某个 `## 标题` 节的正文（到下一个 ## 或文末） */
export function sectionBody(markdown: string, heading: string): string {
  const re = new RegExp(`^##\\s+${heading}\\s*$`, 'm')
  const m = re.exec(markdown)
  if (!m) return ''
  const rest = markdown.slice(m.index + m[0].length)
  const next = /^##\s+/m.exec(rest)
  return (next ? rest.slice(0, next.index) : rest).trim()
}

/** 提取节正文中的列表项（去掉 `- `/`* ` 前缀与 Markdown 强调） */
export function bulletItems(body: string): string[] {
  return body
    .split('\n')
    .map((line) => /^\s*[-*]\s+(.+)$/.exec(line)?.[1] ?? '')
    .filter((line) => line !== '')
    .map((line) => line.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`(.+?)`/g, '$1').trim())
}

/** 摘要单条压缩：`新增岗位：3（boss 1 / …）` → `新增岗位 3` */
function condense(item: string): string {
  return item
    .replace(/（[^）]*）/g, '')
    .replace(/；.*$/, '')
    .replace(/：\s*/, ' ')
    .trim()
}

/**
 * 列表行 2 摘要（reports.md S1）：
 * 日报取「今日概况」前 4 条压缩后以 ` · ` 连接；周报取标题括号内的日期范围 + 首节首行。
 * 取不到内容时退回标题。
 */
export function summarize(report: ReportMeta, raw: string | undefined): string {
  if (!raw) return report.type === 'weekly' ? '周报' : ''
  if (report.type === 'daily') {
    const items = bulletItems(sectionBody(raw, '今日概况')).slice(0, 4).map(condense)
    if (items.length > 0) return items.join(' · ')
  } else {
    const range = /（([^）]*~[^）]*)）/.exec(report.title)?.[1] ?? ''
    const firstSection = /^##\s+(.+)$/m.exec(raw)
    let firstLine = ''
    if (firstSection) {
      const body = sectionBody(raw, firstSection[1].trim())
      firstLine =
        bulletItems(body)[0] ??
        body
          .split('\n')
          .map((l) => l.trim())
          .find((l) => l !== '' && !l.startsWith('#') && !l.startsWith('|')) ??
        ''
    }
    const tail = firstLine.length > 30 ? `${firstLine.slice(0, 30)}…` : firstLine
    return [range, tail].filter(Boolean).join(' · ')
  }
  return ''
}

/** 列表项搜索匹配（日期 / 星期 / 类型 / 标题） */
export function matchesQuery(report: ReportMeta, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystacks = [
    report.date,
    shortDateLabel(report.date),
    baseName(report.file),
    report.type === 'daily' ? '日报' : '周报',
    report.title,
  ]
  return haystacks.some((h) => h.toLowerCase().includes(q))
}
