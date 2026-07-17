import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Search } from 'lucide-react'
import type { ReportMeta } from '@/lib/api'
import { cn } from '@/lib/utils'
import { baseName, groupByMonth, matchesQuery, shortDateLabel, summarize } from './reportsUtils'

/**
 * S1 · 左栏：简报列表（reports.md）
 * 顶部搜索框（250ms 防抖）+ 按月分组列表；组标题 sticky；选中项 accent-50 底 + 左 2px 青条（layoutId 位移）。
 */

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

function TypePill({ type }: { type: ReportMeta['type'] }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-[4px] px-1 py-px text-[11px] font-medium leading-[1.5]',
        type === 'daily'
          ? 'bg-accent-100 text-accent-ink'
          : 'bg-[#F1ECFD] text-[#7C3AED] dark:bg-[#7C3AED24] dark:text-[#A375F2]',
      )}
    >
      {type === 'daily' ? '日报' : '周报'}
    </span>
  )
}

type ReportListProps = {
  sorted: ReportMeta[]
  /** 当前选中 file */
  selected: string | null
  onSelect: (report: ReportMeta) => void
  /** 已缓存的原文（用于行 2 摘要） */
  contents: Record<string, string | undefined>
  /** 「今日」锚定日期（YYYY-MM-DD），命中日报显示「今日」小标 */
  today: string
  /** 搜索框 ref（快捷键 `/` 聚焦） */
  inputRef?: React.RefObject<HTMLInputElement | null>
  query: string
  onQueryChange: (query: string) => void
  /** 列表滚动容器 ref（j/k 移动时 scrollIntoView 用） */
  scrollRef?: React.RefObject<HTMLDivElement | null>
}

export default function ReportList({
  sorted,
  selected,
  onSelect,
  contents,
  today,
  inputRef,
  query,
  onQueryChange,
  scrollRef,
}: ReportListProps) {
  const reduced = useReducedMotion()
  /** 输入框即时值；250ms 防抖后写入 onQueryChange */
  const [draft, setDraft] = useState(query)
  const timer = useRef<number | undefined>(undefined)
  /** 首次入场 stagger 只播一次（之后搜索过滤走容器 150ms 交叉淡入） */
  const [entered, setEntered] = useState(false)

  // query 仅由本组件防抖后回写，draft 始终不落后，无需反向同步
  useEffect(() => () => window.clearTimeout(timer.current), [])
  useEffect(() => {
    const t = window.setTimeout(() => setEntered(true), 600)
    return () => window.clearTimeout(t)
  }, [])

  const handleInput = (value: string) => {
    setDraft(value)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => onQueryChange(value), 250)
  }

  const filtered = sorted.filter((r) => matchesQuery(r, draft))
  const groups = groupByMonth(filtered)
  /** 列表 stagger 延时表（跨月分组连续编号 30ms；>12 条直接显示，§6.2-2） */
  const staggerDelays = new Map<string, number>()
  {
    let idx = -1
    for (const g of groups)
      for (const r of g.items) {
        idx += 1
        staggerDelays.set(r.file, idx <= 12 ? idx * 0.03 : 0)
      }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 搜索框（顶部 padding 16px，下边框 1px） */}
      <div className="shrink-0 border-b border-border p-4">
        <div className="flex h-8 items-center gap-2 rounded-md bg-subtle px-2.5">
          <Search size={14} className="shrink-0 text-ink-3" aria-hidden />
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="按日期搜索，如 07-15"
            aria-label="按日期搜索简报"
            className="w-full bg-transparent font-mono text-[12px] text-ink-1 outline-none placeholder:text-ink-4"
          />
          <kbd className="kbd shrink-0">/</kbd>
        </div>
      </div>

      {/* 列表（按月分组，组标题 sticky） */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto" role="listbox" aria-label="简报列表">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <img src="/empty-search.svg" alt="" width={120} height={83} className="opacity-90" />
            <p className="text-[13px] text-ink-3">没有匹配的简报</p>
          </div>
        ) : (
          <motion.div
            key={draft.trim()}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            {groups.map((group) => (
              <div key={group.label}>
                <div className="sticky top-0 z-sticky flex h-[26px] items-center bg-subtle px-4 text-[11px] font-semibold tracking-[0.06em] text-ink-3">
                  {group.label}
                </div>
                <ul>
                  {group.items.map((report) => {
                    const active = report.file === selected
                    const isToday = report.type === 'daily' && report.date === today
                    const delay = staggerDelays.get(report.file) ?? 0
                    return (
                      <motion.li
                        key={report.file}
                        initial={reduced || entered ? false : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, ease: EASE_OUT, delay }}
                      >
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          data-report-file={report.file}
                          onClick={() => onSelect(report)}
                          className={cn(
                            'relative flex h-16 w-full flex-col justify-center gap-1 border-b border-border px-4 py-[10px] text-left transition-colors duration-instant',
                            active ? 'bg-accent-50' : 'hover:bg-subtle',
                          )}
                        >
                          {active && (
                            <motion.span
                              layoutId="reports-active-bar"
                              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                              className="absolute left-0 top-1/2 h-[22px] w-[2px] -translate-y-1/2 rounded-full bg-accent-500"
                            />
                          )}
                          <span className="flex items-center gap-2">
                            <span className="tnum font-mono text-[13px] font-semibold text-ink-1">
                              {report.type === 'daily'
                                ? shortDateLabel(report.date)
                                : baseName(report.file)}
                            </span>
                            <TypePill type={report.type} />
                            {isToday && (
                              <span className="ml-auto flex shrink-0 items-center gap-1 text-[11px] font-medium text-amber-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                今日
                              </span>
                            )}
                          </span>
                          <span className="truncate text-[12px] text-ink-3" title={summarize(report, contents[report.file])}>
                            {summarize(report, contents[report.file]) || '\u00A0'}
                          </span>
                        </button>
                      </motion.li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}

