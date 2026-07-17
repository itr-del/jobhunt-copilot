import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Search } from 'lucide-react'
import MarkdownView from '@/pages/reports/MarkdownView'
import { parseQALines } from './interviewUtils'

/**
 * 「问答库」特殊渲染（interviews.md S4）：顶部即时过滤输入框 + 命中高亮（mark 琥珀淡底）。
 * 列表项保持 serif 阅读排版；过滤 150ms 交叉淡入。
 */

/** 把命中 query 的片段包成 <mark>（大小写不敏感） */
function Highlighted({ text, query }: { text: string; query: string }) {
  const q = query.trim()
  if (!q) return <>{text}</>
  const lower = text.toLowerCase()
  const needle = q.toLowerCase()
  const parts: { str: string; hit: boolean }[] = []
  let cursor = 0
  for (;;) {
    const idx = lower.indexOf(needle, cursor)
    if (idx < 0) {
      parts.push({ str: text.slice(cursor), hit: false })
      break
    }
    if (idx > cursor) parts.push({ str: text.slice(cursor, idx), hit: false })
    parts.push({ str: text.slice(idx, idx + needle.length), hit: true })
    cursor = idx + needle.length
  }
  return (
    <>
      {parts.map((p, i) =>
        p.hit ? (
          <mark key={i} className="rounded-sm bg-amber-100 px-0 text-inherit dark:bg-[#D9770640]">
            {p.str}
          </mark>
        ) : (
          <span key={i}>{p.str}</span>
        ),
      )}
    </>
  )
}

export default function QASection({ body }: { body: string }) {
  const reduced = useReducedMotion()
  const [query, setQuery] = useState('')
  const items = parseQALines(body)
  const q = query.trim().toLowerCase()
  const filtered = q ? items.filter((line) => line.toLowerCase().includes(q)) : items

  return (
    <div>
      <div className="mb-3 flex h-8 max-w-[320px] items-center gap-2 rounded-md bg-subtle px-2.5">
        <Search size={14} className="shrink-0 text-ink-3" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索问答…"
          aria-label="搜索问答库"
          className="w-full bg-transparent font-sans text-[12px] text-ink-1 outline-none placeholder:text-ink-4"
        />
      </div>

      <motion.div
        key={q}
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        {filtered.length === 0 ? (
          <p className="font-sans text-[13px] text-ink-3">没有匹配的问答</p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 marker:text-accent-500">
            {filtered.map((line, i) => (
              <li key={i} className="pl-0.5">
                <Highlighted text={line} query={query} />
              </li>
            ))}
          </ul>
        )}
      </motion.div>

      {/* 列表项之外的补充内容（若有）走标准 Markdown 渲染 */}
      {items.length === 0 && <MarkdownView content={body} stagger={false} className="max-w-none" />}
    </div>
  )
}
