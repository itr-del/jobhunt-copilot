import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDown, ArrowUp, ChevronsUpDown, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import type { Job, JobStatus } from '@/lib/api'
import GradeStars from '@/components/GradeStars'
import SourceTag from '@/components/SourceTag'
import StatusBadge from '@/components/StatusBadge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { STATUS_COLOR } from '@/lib/meta'
import { cn } from '@/lib/utils'
import CompanyBlock from './CompanyBlock'
import type { SortKey } from './utils'
import { datePrefix } from './utils'

/**
 * S3 · 数据表（jobs.md）：白卡圆角 10px，表头 sticky（36px，白底 + 下边框），
 * 行高 44px / 13px / 悬停 --bg-subtle；待投递行左侧 2px 琥珀竖条；今日新增行公司名旁 4px 青点。
 * 首次进入行 stagger 35ms；筛选变更 150ms 交叉淡入（stagger 20ms 封顶 200ms）；
 * 状态推进后该行底色闪目标状态淡色 600ms + StatusBadge scale 回弹（design.md §6.2-11）。
 */

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

/** 行底色闪：立即染上目标状态淡色，随后 600ms 渐隐；结束还原（不挡 hover） */
function useFlashBg(active: boolean, tint: string): string | undefined {
  const [bg, setBg] = useState<string | undefined>(undefined)
  useEffect(() => {
    if (!active) {
      setBg(undefined)
      return
    }
    setBg(tint)
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setBg('rgba(0,0,0,0)'))
    })
    return () => cancelAnimationFrame(raf)
  }, [active, tint])
  return bg
}

function SortTh({
  label,
  sortKey,
  sort,
  onSortChange,
  className,
  style,
}: {
  label: string
  sortKey: SortKey
  sort: SortKey
  onSortChange: (s: SortKey) => void
  className?: string
  style?: CSSProperties
}) {
  const active = sort === sortKey
  // 更新日期列有双向：desc ↔ asc；其余点击切到该序，再点回默认
  const handleClick = () => {
    if (sortKey === 'updated_desc' || sortKey === 'updated_asc') {
      onSortChange(sort === 'updated_desc' ? 'updated_asc' : 'updated_desc')
    } else {
      onSortChange(active ? 'updated_desc' : sortKey)
    }
  }
  const isUpdatedCol = sortKey === 'updated_desc' || sortKey === 'updated_asc'
  const updatedActive = isUpdatedCol && (sort === 'updated_desc' || sort === 'updated_asc')
  return (
    <th className={className} style={style}>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'inline-flex items-center gap-1 rounded-sm transition-colors duration-instant hover:text-ink-1',
          (active || updatedActive) && 'text-ink-1',
        )}
      >
        {label}
        {active || updatedActive ? (
          sort === 'updated_asc' ? (
            <ArrowUp size={12} aria-hidden />
          ) : (
            <ArrowDown size={12} aria-hidden />
          )
        ) : (
          <ChevronsUpDown size={12} aria-hidden className="opacity-60" />
        )}
      </button>
    </th>
  )
}

function Row({
  job,
  index,
  today,
  focused,
  flashing,
  flashStatus,
  isNew,
  delay,
  reduced,
  onOpen,
  onAbandon,
  onRowFocus,
  rowRef,
}: {
  job: Job
  index: number
  today: string
  focused: boolean
  flashing: boolean
  flashStatus: JobStatus | null
  isNew: boolean
  delay: number
  reduced: boolean
  onOpen: (job: Job) => void
  onAbandon: (job: Job) => void
  onRowFocus: (index: number) => void
  rowRef: (el: HTMLTableRowElement | null) => void
}) {
  const pending = job.status === '待投递'
  const tint = flashStatus ? `${STATUS_COLOR[flashStatus]}24` : 'rgba(0,0,0,0)'
  const bg = useFlashBg(flashing, tint)
  const updated = datePrefix(job.last_action) || job.date_added || '—'
  const addedToday = job.date_added === today

  const copyPair = () => {
    const text = `${job.company} ${job.position}`
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success('已复制', { description: text }))
      .catch(() => toast.error('复制失败'))
  }

  return (
    <motion.tr
      ref={rowRef}
      tabIndex={0}
      aria-label={`${job.company} ${job.position}`}
      initial={reduced ? false : { opacity: 0, y: isNew ? -10 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduced ? 0.12 : isNew ? 0.25 : 0.2,
        ease: EASE_OUT,
        delay: reduced ? 0 : delay,
      }}
      onClick={() => onOpen(job)}
      onFocus={() => onRowFocus(index)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onOpen(job)
        }
      }}
      style={{
        backgroundColor: bg,
        transition: bg && bg !== 'rgba(0,0,0,0)' ? 'none' : 'background-color 600ms ease-out',
      }}
      className={cn(
        'group relative h-11 cursor-pointer border-b border-border text-[13px]',
        !bg && 'transition-colors duration-instant',
        !bg && (focused ? 'bg-accent-50' : 'hover:bg-subtle'),
      )}
    >
      {/* 待投递：左边界 2px 琥珀竖条；焦点行：2px 青色竖条（并列时错位 3px） */}
      {pending && (
        <span aria-hidden className="absolute left-0 top-0 h-full w-[2px] bg-amber-500" />
      )}
      {focused && (
        <span
          aria-hidden
          className="absolute top-0 h-full w-[2px] bg-accent-500"
          style={{ left: pending ? 3 : 0 }}
        />
      )}

      {/* 公司 */}
      <td className="px-4 py-0">
        <div className="flex min-w-0 items-center gap-2.5">
          <CompanyBlock name={job.company} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[13px] font-medium text-ink-1" title={job.company}>
                {job.company}
              </span>
              {addedToday && (
                <span
                  aria-hidden
                  title="今日新增"
                  className="h-1 w-1 shrink-0 rounded-full bg-accent-500"
                />
              )}
            </div>
            <div className="tnum truncate font-mono text-[11px] leading-[1.4] text-ink-3">
              {job.id}
            </div>
          </div>
        </div>
      </td>

      {/* 岗位 */}
      <td className="px-4 py-0">
        <span className="block truncate text-[13px] text-ink-1" title={job.position}>
          {job.position}
        </span>
      </td>

      {/* 来源 */}
      <td className="px-4 py-0">
        <SourceTag source={job.source} />
      </td>

      {/* 城市 */}
      <td className="px-4 py-0">
        <span className="block truncate text-[13px] text-ink-2" title={job.city}>
          {job.city || '—'}
        </span>
      </td>

      {/* 薪资 */}
      <td className="px-4 py-0">
        <span className="tnum block truncate font-mono text-[12.5px] text-ink-1" title={job.salary_range}>
          {job.salary_range || '—'}
        </span>
      </td>

      {/* 评级 */}
      <td className="px-4 py-0">
        <GradeStars grade={job.match_grade} />
      </td>

      {/* 状态 */}
      <td className="px-4 py-0">
        <motion.span
          className="inline-flex"
          animate={flashing && !reduced ? { scale: [1, 1.06, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <StatusBadge status={job.status} pulse={pending} />
        </motion.span>
      </td>

      {/* 下一步 */}
      <td className="px-4 py-0">
        {job.next_step ? (
          <span
            className={cn(
              'block truncate text-[13px]',
              job.next_step.includes('待用户确认') ? 'font-medium text-amber-600' : 'text-ink-2',
            )}
            title={job.next_step}
          >
            {job.next_step}
          </span>
        ) : (
          <span className="text-[13px] text-ink-4">—</span>
        )}
      </td>

      {/* 更新日期 */}
      <td className="px-4 py-0 text-right">
        <span className="tnum font-mono text-[12px] text-ink-3">{updated}</span>
      </td>

      {/* 操作 */}
      <td className="px-1.5 py-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`${job.company} 更多操作`}
              onClick={(e) => e.stopPropagation()}
              className="btn-icon h-7 w-7 opacity-0 transition-opacity duration-instant focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreHorizontal size={16} aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onSelect={() => onOpen(job)}>打开详情</DropdownMenuItem>
            <DropdownMenuItem onSelect={copyPair}>复制公司+岗位</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-[#DC2626]" onSelect={() => onAbandon(job)}>
              标记放弃…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </motion.tr>
  )
}

export default function JobsTable({
  rows,
  total,
  listKey,
  firstLoad,
  today,
  focusIndex,
  flashRow,
  newRowId,
  stickyTop,
  sort,
  onSortChange,
  onOpen,
  onAbandon,
  onFocusRow,
}: {
  rows: Job[]
  total: number
  /** 筛选/排序签名：变化时行整体交叉淡入重排 */
  listKey: string
  firstLoad: boolean
  today: string
  focusIndex: number
  flashRow: { id: string; status: JobStatus } | null
  newRowId: string | null
  /** 表头 sticky top（= 筛选栏高度） */
  stickyTop: number
  sort: SortKey
  onSortChange: (s: SortKey) => void
  onOpen: (job: Job) => void
  onAbandon: (job: Job) => void
  onFocusRow: (index: number) => void
}) {
  const reduced = useReducedMotion()
  const cardRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([])
  const [stuck, setStuck] = useState(false)

  // 表头 sticky 吸顶后加 0 1px 0 阴影（design.md §6.3）
  useEffect(() => {
    const card = cardRef.current
    const main = card?.closest('main')
    if (!card || !main) return
    const onScroll = () => {
      setStuck(card.getBoundingClientRect().top <= main.getBoundingClientRect().top + stickyTop + 1)
    }
    onScroll()
    main.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      main.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [stickyTop])

  // j/k 焦点行滚动到可视区
  useEffect(() => {
    if (focusIndex < 0) return
    rowRefs.current[focusIndex]?.scrollIntoView({ block: 'nearest' })
  }, [focusIndex])

  // 说明：表头 sticky 需 main 为滚动容器，卡片不能用 overflow-hidden（否则 sticky 失效），
  // 圆角改由首尾 th / 表尾承担；border-collapse 下 border 不随 sticky 移动，改用下缘 1px 阴影线。
  const thClass = cn(
    'sticky z-sticky h-9 bg-surface px-4 text-left text-[12px] font-semibold text-ink-3',
    stuck
      ? 'shadow-[0_1px_0_0_var(--border),0_2px_4px_rgba(27,27,24,0.06)]'
      : 'shadow-[0_1px_0_0_var(--border)]',
  )

  return (
    <div ref={cardRef} className="card-base overflow-x-auto">
      <table className="w-full min-w-[920px] table-fixed border-collapse">
        <colgroup>
          <col style={{ width: 150 }} />
          <col style={{ width: 180 }} />
          <col style={{ width: 100 }} />
          <col style={{ width: 70 }} />
          <col style={{ width: 110 }} />
          <col style={{ width: 80 }} />
          <col style={{ width: 100 }} />
          <col />
          <col style={{ width: 92 }} />
          <col style={{ width: 44 }} />
        </colgroup>
        <thead>
          <tr>
            <th className={cn(thClass, 'rounded-tl-xl')} style={{ top: stickyTop }}>
              公司
            </th>
            <th className={thClass} style={{ top: stickyTop }}>
              岗位
            </th>
            <th className={thClass} style={{ top: stickyTop }}>
              来源
            </th>
            <th className={thClass} style={{ top: stickyTop }}>
              城市
            </th>
            <SortTh
              label="薪资"
              sortKey="salary_desc"
              sort={sort}
              onSortChange={onSortChange}
              className={thClass}
              style={{ top: stickyTop }}
            />
            <SortTh
              label="评级"
              sortKey="grade_desc"
              sort={sort}
              onSortChange={onSortChange}
              className={thClass}
              style={{ top: stickyTop }}
            />
            <th className={thClass} style={{ top: stickyTop }}>
              状态
            </th>
            <th className={thClass} style={{ top: stickyTop }}>
              下一步
            </th>
            <SortTh
              label="更新日期"
              sortKey="updated_desc"
              sort={sort}
              onSortChange={onSortChange}
              className={cn(thClass, 'text-right')}
              style={{ top: stickyTop }}
            />
            <th
              className={cn(thClass, 'rounded-tr-xl px-1.5')}
              style={{ top: stickyTop }}
              aria-label="操作"
            />
          </tr>
        </thead>
        <motion.tbody
          key={listKey}
          initial={reduced ? false : { opacity: firstLoad ? 1 : 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: firstLoad ? 0 : 0.15 }}
        >
          {rows.map((job, i) => (
            <Row
              key={job.id}
              job={job}
              index={i}
              today={today}
              focused={focusIndex === i}
              flashing={flashRow?.id === job.id}
              flashStatus={flashRow?.status ?? null}
              isNew={newRowId === job.id}
              delay={
                firstLoad
                  ? Math.min(i * 0.035, 0.45)
                  : Math.min(i * 0.02, 0.2)
              }
              reduced={!!reduced}
              onOpen={onOpen}
              onAbandon={onAbandon}
              onRowFocus={onFocusRow}
              rowRef={(el) => {
                rowRefs.current[i] = el
              }}
            />
          ))}
        </motion.tbody>
      </table>
      {/* 表尾计数（最后一行已有 border-b，此处不再重复上边框） */}
      <div className="flex h-9 items-center justify-center text-[12px] text-ink-3">
        显示 <span className="tnum mx-1 font-mono">{rows.length}</span> / 共{' '}
        <span className="tnum mx-1 font-mono">{total}</span> 条
      </div>
    </div>
  )
}
