import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, Copy, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Job, JobStatus, Stats } from '@/lib/api'
import { api } from '@/lib/api'
import GradeStars from '@/components/GradeStars'
import SourceTag from '@/components/SourceTag'
import StatusBadge from '@/components/StatusBadge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import { STATUS_COLOR, STATUS_STYLE } from '@/lib/meta'
import { cn } from '@/lib/utils'
import CompanyBlock from './CompanyBlock'
import MarkdownView from './MarkdownView'
import { nextStatus, PIPELINE, TERMINAL_NEGATIVE } from './utils'

/**
 * S4 · 岗位详情抽屉（jobs.md）：右侧 560px spring 滑入，Esc / 点遮罩关闭。
 * 头部（色块 + 公司 + StatusBadge + chips）→ 状态推进条 Pipeline（7 节点 stepper，
 * 终态负向收进右侧 … 下拉）→ Tab（JD 原文 / 备注 / 动态）→ 底部操作条
 * （放弃… / 编辑基本信息 / 语境主按钮：待投递→确认投递 Amber，其余→标记下一状态）。
 */

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

/** 动态时间线节点色（复用 dashboard S6） */
const KIND_COLOR: Record<Stats['recentActivity'][number]['kind'], string> = {
  ledger: '#0D7377',
  report: '#7C3AED',
  interview: '#C2410C',
  context: '#D97706',
}

type TabKey = 'jd' | 'notes' | 'activity'

// ---------------------------------------------------------------------------
// 状态推进条 Pipeline
// ---------------------------------------------------------------------------

function Pipeline({
  job,
  onPickNext,
  onPickTerminal,
}: {
  job: Job
  onPickNext: (target: JobStatus) => void
  onPickTerminal: (target: JobStatus) => void
}) {
  const reduced = useReducedMotion()
  const currentIdx = PIPELINE.indexOf(job.status) // 终态负向 = -1
  const next = nextStatus(job.status)

  const handleNode = (s: JobStatus, i: number) => {
    if (currentIdx < 0 || i <= currentIdx) return
    if (s === next) {
      onPickNext(s)
    } else {
      toast('状态只能逐级推进', { description: `请先推进到「${next}」` })
    }
  }

  return (
    <div className="flex items-start bg-subtle px-6 py-4">
      {PIPELINE.map((s, i) => {
        const done = currentIdx > i
        const current = currentIdx === i
        const clickable = currentIdx >= 0 && i > currentIdx
        const color = STATUS_COLOR[s]
        return (
          <div key={s} className="flex flex-1 items-start last:flex-none">
            {/* 节点 */}
            <button
              type="button"
              disabled={!clickable}
              onClick={() => handleNode(s, i)}
              title={clickable ? (s === next ? `推进到「${s}」` : '状态只能逐级推进') : s}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-sm',
                clickable ? 'cursor-pointer' : 'cursor-default',
              )}
            >
              <motion.span
                key={`${s}-${current || done}`}
                initial={reduced ? false : current ? { scale: 0.6 } : false}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                className={cn(
                  'h-3 w-3 rounded-full',
                  current && s === '待投递' && 'motion-safe:animate-pulse-dot',
                  !done && !current && 'border-2 border-strong bg-transparent',
                  clickable && 'transition-transform duration-instant hover:scale-125',
                )}
                style={
                  done || current
                    ? {
                        backgroundColor: color,
                        boxShadow: current ? `0 0 0 2px ${color}40` : undefined,
                      }
                    : undefined
                }
              />
              <span
                className={cn(
                  'whitespace-nowrap text-[10px] leading-none',
                  current ? 'font-semibold text-ink-1' : done ? 'text-ink-2' : 'text-ink-4',
                )}
              >
                {s}
              </span>
            </button>
            {/* 连接线（已过 = 前一节点状态色，未过 = --border） */}
            {i < PIPELINE.length - 1 && (
              <span className="mx-1 mt-[5px] h-[2px] flex-1 overflow-hidden rounded-full bg-border">
                <motion.span
                  key={currentIdx > i ? 'passed' : 'idle'}
                  className="block h-full w-full origin-left rounded-full"
                  style={{ backgroundColor: currentIdx > i ? STATUS_COLOR[PIPELINE[i]] : 'transparent' }}
                  initial={reduced ? false : { scaleX: currentIdx > i ? 0 : 1 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.3, ease: EASE_OUT }}
                />
              </span>
            )}
          </div>
        )
      })}

      {/* 终态负向：… 下拉；当前为终态负向时展示其徽标 */}
      <div className="ml-2 flex shrink-0 items-center gap-1.5">
        {currentIdx < 0 && <StatusBadge status={job.status} />}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="标记终态" className="btn-icon h-6 w-6">
              <ChevronDown size={14} aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {TERMINAL_NEGATIVE.map((s) => (
              <DropdownMenuItem key={s} onSelect={() => onPickTerminal(s)}>
                <span aria-hidden className={cn('mr-1 h-2 w-2 rounded-full', STATUS_STYLE[s].dot)} />
                标记为{s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// JD 原文 Tab
// ---------------------------------------------------------------------------

function JdTab({ job }: { job: Job }) {
  const [state, setState] = useState<'loading' | 'ready' | 'empty'>('loading')
  const [raw, setRaw] = useState('')

  useEffect(() => {
    let alive = true
    setRaw('')
    if (!job.jd_file) {
      setState('empty')
      return
    }
    setState('loading')
    api
      .getJd(job.jd_file)
      .then(({ raw }) => {
        if (!alive) return
        setRaw(raw)
        setState(raw.trim() ? 'ready' : 'empty')
      })
      .catch(() => {
        // 契约：jd_file 为空 / 不存在 → 404，统一按空态处理
        if (alive) setState('empty')
      })
    return () => {
      alive = false
    }
  }, [job.id, job.jd_file])

  const copyPath = () => {
    const path = `02-jobs/jd/${job.jd_file}`
    navigator.clipboard
      .writeText(path)
      .then(() => toast.success('已复制', { description: path }))
      .catch(() => toast.error('复制失败'))
  }

  if (state === 'loading') {
    return (
      <div className="flex flex-col gap-3" aria-label="JD 加载中">
        <div className="h-5 w-1/3 animate-breathe rounded-md bg-subtle" />
        <div className="h-3.5 w-full animate-breathe rounded-md bg-subtle" />
        <div className="h-3.5 w-11/12 animate-breathe rounded-md bg-subtle" />
        <div className="h-3.5 w-4/5 animate-breathe rounded-md bg-subtle" />
        <div className="h-3.5 w-full animate-breathe rounded-md bg-subtle" />
        <div className="h-3.5 w-2/3 animate-breathe rounded-md bg-subtle" />
      </div>
    )
  }

  if (state === 'empty') {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <img src="/empty-jobs.svg" alt="" width={160} height={107} className="opacity-90" />
        <p className="mt-1 text-[14px] font-semibold text-ink-1">还未存档 JD 原文</p>
        <p className="max-w-[320px] text-[13px] leading-[1.7] text-ink-3">
          在 AI 工具里收藏岗位时会自动写入
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* 路径 chip：唯一事实源可见（design.md 原则 5） */}
      <button
        type="button"
        onClick={copyPath}
        title="点击复制路径"
        className="mb-4 flex max-w-full items-center gap-1.5 rounded-sm bg-subtle px-2 py-1 font-mono text-[12px] text-ink-2 transition-colors duration-instant hover:bg-muted hover:text-ink-1"
      >
        <span className="truncate">02-jobs/jd/{job.jd_file}</span>
        <Copy size={12} aria-hidden className="shrink-0" />
      </button>
      <MarkdownView raw={raw} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// 备注 Tab
// ---------------------------------------------------------------------------

function NotesTab({
  job,
  onSaveNotes,
}: {
  job: Job
  onSaveNotes: (job: Job, notes: string) => Promise<boolean>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(job.notes)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    const ok = await onSaveNotes(job, draft.trim())
    setBusy(false)
    if (ok) setEditing(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-ink-1">备注</h3>
        {!editing && (
          <button type="button" className="btn-ghost h-7 px-2 text-[12px]" onClick={() => {
            setDraft(job.notes)
            setEditing(true)
          }}
          >
            <Pencil size={12} aria-hidden />
            编辑
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-2">
          <textarea
            autoFocus
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="记一笔：内推人、薪资底线、面试感受…"
            className="w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-[13px] leading-[1.6] text-ink-1 placeholder:text-ink-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" className="btn-ghost h-7 px-2 text-[12px]" onClick={() => setEditing(false)} disabled={busy}>
              取消
            </button>
            <button type="button" className="btn-primary h-7 px-2.5 text-[12px]" onClick={() => void save()} disabled={busy}>
              {busy && <Spinner className="size-3" aria-hidden />}
              保存备注
            </button>
          </div>
        </div>
      ) : (
        <p className={cn(
          'mt-2 whitespace-pre-wrap text-[13px] leading-[1.7]',
          job.notes ? 'text-ink-1' : 'text-ink-4',
        )}
        >
          {job.notes || '还没有备注，点「编辑」记一笔。'}
        </p>
      )}

      <p className="tnum mt-5 border-t border-border pt-3 font-mono text-[12px] text-ink-3">
        最近动作：{job.last_action || '—'}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 动态 Tab（该岗位事件时间线，复用 dashboard S6 样式）
// ---------------------------------------------------------------------------

function ActivityTab({ job, active }: { job: Job; active: boolean }) {
  const [items, setItems] = useState<Stats['recentActivity'] | null>(null)

  useEffect(() => {
    if (!active || items !== null) return
    let alive = true
    api
      .stats()
      .then((s) => {
        if (alive) setItems(s.recentActivity.filter((a) => a.text.includes(job.company)))
      })
      .catch(() => {
        if (alive) setItems([])
      })
    return () => {
      alive = false
    }
  }, [active, items, job.company])

  if (items === null) {
    return (
      <div className="flex flex-col gap-3" aria-label="动态加载中">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-2 w-2 animate-breathe rounded-full bg-subtle" />
            <div className="h-3.5 flex-1 animate-breathe rounded-md bg-subtle" />
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return <div className="py-8 text-center text-[13px] text-ink-3">暂无该岗位的动态</div>
  }

  return (
    <div className="relative">
      <span aria-hidden className="absolute bottom-2 left-[3.5px] top-2 w-px bg-border" />
      <ul className="flex flex-col">
        {items.map((item, i) => (
          <li key={`${item.time}-${i}`} className="relative py-1.5 pl-5">
            <span
              aria-hidden
              className="absolute left-0 top-[9px] h-2 w-2 rounded-full"
              style={{ backgroundColor: KIND_COLOR[item.kind] ?? '#8B8B81' }}
            />
            <p className="text-[13px] leading-[1.5] text-ink-1">{item.text}</p>
            <p className="tnum mt-0.5 font-mono text-[12px] text-ink-3">{item.time}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 抽屉主体
// ---------------------------------------------------------------------------

export default function JobDrawer({
  job,
  onClose,
  onAdvance,
  onSaveNotes,
  onEdit,
  onAbandon,
}: {
  job: Job
  onClose: () => void
  /** 状态推进；返回是否成功 */
  onAdvance: (job: Job, target: JobStatus) => Promise<boolean>
  onSaveNotes: (job: Job, notes: string) => Promise<boolean>
  onEdit: (job: Job) => void
  onAbandon: (job: Job, initialTarget?: JobStatus) => void
}) {
  const reduced = useReducedMotion()
  const [tab, setTab] = useState<TabKey>('jd')
  const [confirmTarget, setConfirmTarget] = useState<JobStatus | null>(null)
  const [advancing, setAdvancing] = useState(false)

  const next = nextStatus(job.status)

  const doAdvance = async (target: JobStatus) => {
    setAdvancing(true)
    const ok = await onAdvance(job, target)
    setAdvancing(false)
    if (ok) setConfirmTarget(null)
  }

  const chips: { key: string; node: ReactNode }[] = [
    { key: 'source', node: <SourceTag source={job.source} /> },
    ...(job.city
      ? [
          {
            key: 'city',
            node: (
              <span className="flex h-[22px] items-center rounded-sm bg-subtle px-1.5 text-[12px] text-ink-2">
                {job.city}
              </span>
            ),
          },
        ]
      : []),
    ...(job.salary_range
      ? [
          {
            key: 'salary',
            node: (
              <span className="tnum flex h-[22px] items-center rounded-sm bg-subtle px-1.5 font-mono text-[12px] text-ink-2">
                {job.salary_range}
              </span>
            ),
          },
        ]
      : []),
    { key: 'grade', node: <GradeStars grade={job.match_grade} /> },
    {
      key: 'id',
      node: <span className="tnum font-mono text-[11px] text-ink-3">{job.id}</span>,
    },
  ]

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'jd', label: 'JD 原文' },
    { key: 'notes', label: '备注' },
    { key: 'activity', label: '动态' },
  ]

  return (
    <>
      {/* 遮罩 0→0.32（design.md §6.2-7） */}
      <motion.div
        aria-hidden
        className="fixed inset-0 z-overlay bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.32 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0.12 : 0.2 }}
        onClick={onClose}
      />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={`${job.company} ${job.position} 详情`}
        className="fixed right-0 top-0 z-drawer flex h-full w-[560px] max-w-full flex-col border-l border-border bg-surface shadow-e3"
        initial={reduced ? { opacity: 0 } : { x: '100%' }}
        animate={reduced ? { opacity: 1 } : { x: 0 }}
        exit={
          reduced
            ? { opacity: 0, transition: { duration: 0.12 } }
            : { x: '100%', transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }
        }
        transition={
          reduced ? { duration: 0.12 } : { type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }
        }
      >
        {/* 头部区 */}
        <div className="shrink-0 border-b border-border px-6 pb-4 pt-5">
          <div className="flex items-start gap-3">
            <CompanyBlock name={job.company} size={36} />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[18px] font-semibold leading-[1.3] tracking-[-0.01em] text-ink-1">
                {job.company}
              </h2>
              <p className="mt-0.5 truncate text-[14px] font-medium text-ink-2" title={job.position}>
                {job.position}
              </p>
            </div>
            <StatusBadge status={job.status} pulse={job.status === '待投递'} />
            <button type="button" aria-label="关闭详情" onClick={onClose} className="btn-icon shrink-0">
              <X size={16} aria-hidden />
            </button>
          </div>
          {/* 行 3：chips（stagger 40ms） */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {chips.map((chip, i) => (
              <motion.span
                key={chip.key}
                className="inline-flex items-center"
                initial={reduced ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16, ease: EASE_OUT, delay: 0.08 + i * 0.04 }}
              >
                {chip.node}
              </motion.span>
            ))}
          </div>
        </div>

        {/* 状态推进条 */}
        <div className="shrink-0">
          <Pipeline
            job={job}
            onPickNext={(target) => setConfirmTarget(target)}
            onPickTerminal={(target) => onAbandon(job, target)}
          />
        </div>

        {/* Tab 区 */}
        <div className="flex shrink-0 items-center gap-1 border-b border-border px-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'relative flex h-10 items-center px-3 text-[13px] transition-colors duration-instant',
                tab === t.key ? 'font-medium text-ink-1' : 'text-ink-3 hover:text-ink-1',
              )}
            >
              {t.label}
              {tab === t.key && (
                <motion.span
                  layoutId="jobs-drawer-tab"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-accent-500"
                />
              )}
            </button>
          ))}
        </div>

        {/* 内容区 */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={reduced ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0 }}
              transition={{ duration: reduced ? 0.12 : 0.16, ease: EASE_OUT }}
            >
              {tab === 'jd' && <JdTab job={job} />}
              {tab === 'notes' && <NotesTab job={job} onSaveNotes={onSaveNotes} />}
              {tab === 'activity' && <ActivityTab job={job} active={tab === 'activity'} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 底部操作条 */}
        <div className="flex h-14 shrink-0 items-center justify-end gap-2 border-t border-border px-6">
          <button
            type="button"
            className="btn-ghost mr-auto text-[#DC2626] hover:bg-[#DC262614] hover:text-[#DC2626]"
            onClick={() => onAbandon(job)}
          >
            放弃…
          </button>
          <button type="button" className="btn-secondary" onClick={() => onEdit(job)}>
            编辑基本信息
          </button>
          {next && (
            <button
              type="button"
              disabled={advancing}
              className={job.status === '待投递' ? 'btn-amber' : 'btn-primary'}
              onClick={() => {
                if (job.status === '待投递') {
                  setConfirmTarget('已投递')
                } else {
                  void doAdvance(next)
                }
              }}
            >
              {advancing && <Spinner className="size-3.5" aria-hidden />}
              {job.status === '待投递' ? '确认投递' : `标记${next}`}
            </button>
          )}
        </div>
      </motion.aside>

      {/* 推进确认（design.md §7.9 ConfirmDialog） */}
      <AlertDialog open={confirmTarget !== null} onOpenChange={(o) => !o && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>推进到「{confirmTarget}」？</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget === '已投递'
                ? '提示：投递是对外动作，请确认你已在平台上完成投递。'
                : `${job.company} · ${job.position} 状态将从「${job.status}」推进到「${confirmTarget}」。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={advancing}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={advancing}
              onClick={(e) => {
                e.preventDefault()
                if (confirmTarget) void doAdvance(confirmTarget)
              }}
            >
              {advancing ? '推进中…' : '确认推进'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
