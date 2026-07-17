import { useEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import type { JobSource, JobStatus } from '@/lib/api'
import GradeStars from '@/components/GradeStars'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { JOB_STATUSES, SOURCE_LABEL, SOURCE_META, STATUS_STYLE } from '@/lib/meta'
import type { MatchGrade } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Filters, GradeFilter, SortKey } from './utils'
import { activeFilterCount, SORT_OPTIONS } from './utils'

/**
 * S2 · 筛选栏（jobs.md）：sticky（top 0 / z-10 / 白底 / 下边框 1px），两行布局。
 * 行 1：关键词搜索（250ms 防抖，回车即搜）+ 排序下拉 + 重置筛选（带计数）；
 * 行 2：状态多选 chip（状态色圆点 + 数量角标，待投递 pulse）/ 评级单选 / 来源多选。
 * 三组 AND，组内 OR；筛选生效时下方 28px 结果条可逐条 × 掉。
 */

const SOURCE_ORDER: JobSource[] = ['boss', 'liepin', 'linkedin', 'lagou', '官网', '内推', '猎头', '其他']

const GRADE_OPTIONS: { value: Exclude<GradeFilter, ''>; grade: MatchGrade; label: string }[] = [
  { value: '3', grade: '⭐⭐⭐', label: '三星' },
  { value: '2', grade: '⭐⭐', label: '二星' },
  { value: '1', grade: '⭐', label: '一星' },
  { value: '0', grade: '', label: '未评级' },
]

function Chip({
  selected,
  onClick,
  children,
  title,
  ariaLabel,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
  title?: string
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={ariaLabel}
      title={title}
      onClick={onClick}
      className={cn(
        'flex h-7 shrink-0 items-center gap-1.5 rounded-pill border px-2.5 text-[12px] font-medium transition-colors duration-instant',
        selected
          ? 'border-transparent bg-accent-100 text-accent-ink'
          : 'border-border bg-surface text-ink-2 hover:bg-subtle hover:text-ink-1',
      )}
    >
      {children}
    </button>
  )
}

export default function FilterBar({
  filters,
  counts,
  sort,
  onChange,
  onSortChange,
  onReset,
  onHeightChange,
  searchInputRef,
}: {
  filters: Filters
  /** 各状态在全量台账中的数量（chip 角标） */
  counts: Record<JobStatus, number>
  sort: SortKey
  onChange: (patch: Partial<Filters>) => void
  onSortChange: (sort: SortKey) => void
  onReset: () => void
  /** sticky 高度上报（表头 sticky top 用） */
  onHeightChange?: (h: number) => void
  searchInputRef: RefObject<HTMLInputElement | null>
}) {
  const reduced = useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const [qLocal, setQLocal] = useState(filters.q)
  const debounceRef = useRef<number | undefined>(undefined)

  const activeCount = activeFilterCount(filters)

  // sticky 高度 → 父级（数据表表头 sticky top）
  useEffect(() => {
    const el = rootRef.current
    if (!el || !onHeightChange) return
    const ro = new ResizeObserver(() => onHeightChange(el.offsetHeight))
    ro.observe(el)
    onHeightChange(el.offsetHeight)
    return () => ro.disconnect()
  }, [onHeightChange])

  // URL q 变化（重置 / 分享链接）→ 同步输入框
  useEffect(() => {
    setQLocal(filters.q)
  }, [filters.q])

  useEffect(() => () => window.clearTimeout(debounceRef.current), [])

  const pushQ = (value: string) => {
    window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => onChange({ q: value }), 250)
  }

  const toggleStatus = (s: JobStatus) => {
    const next = filters.statuses.includes(s)
      ? filters.statuses.filter((x) => x !== s)
      : [...filters.statuses, s]
    // 保持流转序排列，URL 可读
    onChange({ statuses: JOB_STATUSES.filter((x) => next.includes(x)) })
  }

  const toggleSource = (s: JobSource) => {
    const next = filters.sources.includes(s)
      ? filters.sources.filter((x) => x !== s)
      : [...filters.sources, s]
    onChange({ sources: SOURCE_ORDER.filter((x) => next.includes(x)) })
  }

  const toggleGrade = (g: GradeFilter) => {
    onChange({ grade: filters.grade === g ? '' : g })
  }

  return (
    <div
      ref={rootRef}
      className="sticky top-0 z-sticky -mx-8 border-b border-border bg-surface px-8 py-3"
    >
      {/* 行 1：搜索 + 排序 + 重置 */}
      <div className="flex items-center gap-3">
        <div className="relative w-[280px] shrink-0">
          <Search
            size={14}
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3"
          />
          <input
            ref={searchInputRef}
            type="text"
            value={qLocal}
            onChange={(e) => {
              setQLocal(e.target.value)
              pushQ(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                window.clearTimeout(debounceRef.current)
                onChange({ q: qLocal })
              } else if (e.key === 'Escape') {
                e.currentTarget.blur()
              }
            }}
            placeholder="搜索公司 / 岗位 / 备注…"
            aria-label="搜索岗位"
            className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-[13px] text-ink-1 transition-[box-shadow,border-color] duration-instant placeholder:text-ink-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>

        <Select value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
          <SelectTrigger aria-label="排序方式" className="h-8 w-[136px] text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.key} value={o.key} className="text-[13px]">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="btn-ghost ml-auto h-7 px-2 text-[12px]"
          >
            重置筛选
            <span className="tnum font-mono text-[11px] text-ink-3">{activeCount}</span>
          </button>
        )}
      </div>

      {/* 行 2：三组 chip */}
      <motion.div
        className="mt-2.5 flex flex-wrap items-center gap-x-6 gap-y-2"
        initial={reduced ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold tracking-[0.06em] text-ink-3">状态</span>
          {JOB_STATUSES.map((s) => (
            <Chip
              key={s}
              selected={filters.statuses.includes(s)}
              onClick={() => toggleStatus(s)}
              ariaLabel={`按状态 ${s} 筛选`}
            >
              <span
                aria-hidden
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  STATUS_STYLE[s].dot,
                  s === '待投递' && 'motion-safe:animate-pulse-dot',
                )}
              />
              {s}
              <span className="tnum font-mono text-[11px] opacity-70">{counts[s] ?? 0}</span>
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold tracking-[0.06em] text-ink-3">评级</span>
          {GRADE_OPTIONS.map((g) => (
            <Chip
              key={g.value}
              selected={filters.grade === g.value}
              onClick={() => toggleGrade(g.value)}
              ariaLabel={`按评级 ${g.label} 筛选`}
            >
              {g.grade ? <GradeStars grade={g.grade} size={12} /> : g.label}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold tracking-[0.06em] text-ink-3">来源</span>
          {SOURCE_ORDER.map((s) => (
            <Chip
              key={s}
              selected={filters.sources.includes(s)}
              onClick={() => toggleSource(s)}
              ariaLabel={`按来源 ${SOURCE_LABEL[s]} 筛选`}
            >
              <span
                aria-hidden
                className={cn(
                  'flex h-3.5 w-3.5 items-center justify-center rounded-[3px] text-[9px] font-semibold leading-none text-white dark:text-[#141412]',
                  SOURCE_META[s].chip,
                )}
              >
                {SOURCE_LABEL[s].charAt(0)}
              </span>
              {SOURCE_LABEL[s]}
            </Chip>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

/** 结果条（jobs.md S2）：筛选生效时出现 28px，各条件可单独 × 掉 */
export function ResultBar({
  filters,
  resultCount,
  onChange,
  onReset,
}: {
  filters: Filters
  resultCount: number
  onChange: (patch: Partial<Filters>) => void
  onReset: () => void
}) {
  const reduced = useReducedMotion()
  const active = activeFilterCount(filters) > 0

  const items: { key: string; label: ReactNode; remove: () => void }[] = [
    ...filters.statuses.map((s) => ({
      key: `s:${s}`,
      label: <>状态：{s}</>,
      remove: () => onChange({ statuses: filters.statuses.filter((x) => x !== s) }),
    })),
    ...(filters.grade !== ''
      ? [
          {
            key: 'g',
            label: (
              <>
                评级：
                {filters.grade === '0' ? (
                  '未评级'
                ) : (
                  <GradeStars grade={('⭐'.repeat(Number(filters.grade)) || '') as MatchGrade} size={11} />
                )}
              </>
            ),
            remove: () => onChange({ grade: '' as GradeFilter }),
          },
        ]
      : []),
    ...filters.sources.map((s) => ({
      key: `src:${s}`,
      label: <>来源：{SOURCE_LABEL[s]}</>,
      remove: () => onChange({ sources: filters.sources.filter((x) => x !== s) }),
    })),
    ...(filters.q.trim() !== ''
      ? [
          {
            key: 'q',
            label: <>关键词：{filters.q.trim()}</>,
            remove: () => onChange({ q: '' }),
          },
        ]
      : []),
    ...(filters.addedToday
      ? [{ key: 'added', label: <>今日新增</>, remove: () => onChange({ addedToday: false }) }]
      : []),
  ]

  return (
    <motion.div
      aria-hidden={!active}
      initial={false}
      animate={{ height: active ? 28 : 0, opacity: active ? 1 : 0 }}
      transition={{ duration: reduced ? 0.12 : 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden"
    >
      <div className="flex h-7 items-center gap-1.5 text-[12px] text-ink-2">
        <span className="mr-1 shrink-0">
          筛选出 <span className="tnum font-mono text-ink-1">{resultCount}</span> 条
        </span>
        {items.map((item) => (
          <span
            key={item.key}
            className="flex h-5 max-w-[220px] items-center gap-1 rounded-sm bg-subtle px-1.5 text-[11px] text-ink-2"
          >
            <span className="flex items-center gap-0.5 truncate">{item.label}</span>
            <button
              type="button"
              aria-label="移除该筛选条件"
              onClick={item.remove}
              className="shrink-0 rounded-sm p-0.5 text-ink-3 transition-colors duration-instant hover:bg-muted hover:text-ink-1"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        {items.length > 1 && (
          <button
            type="button"
            onClick={onReset}
            className="ml-1 shrink-0 text-[11px] text-accent-500 transition-colors duration-instant hover:text-accent-600 hover:underline"
          >
            清空全部
          </button>
        )}
      </div>
    </motion.div>
  )
}
