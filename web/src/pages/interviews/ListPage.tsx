import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { motion, useReducedMotion } from 'framer-motion'
import { FolderOpen, Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { InterviewMeta, Job, JobStatus, Stats } from '@/lib/api'
import { STATUS_STYLE } from '@/lib/meta'
import { cn } from '@/lib/utils'
import CompanyCard from './CompanyCard'
import type { CardModel } from './CompanyCard'
import NewArchiveDialog from './NewArchiveDialog'
import {
  anchorToday,
  currentFocus,
  daysFromToday,
  keyAction,
  parseRounds,
  parseStatus,
  parseUpcoming,
} from './interviewUtils'

/**
 * `/interviews` 列表页（interviews.md S1/S2）：
 * 页头统计条 + 公司卡片网格（2 列）+ 新建档案 Modal。
 * 快捷键：j/k 移动焦点，Enter 进详情。
 */

const VALID_STATUS = new Set<string>(Object.keys(STATUS_STYLE))

function toJobStatus(raw: string): JobStatus {
  return (VALID_STATUS.has(raw) ? raw : '面试中') as JobStatus
}

function ListSkeleton() {
  return (
    <div aria-label="加载中">
      <div className="mb-4 flex h-8 items-center justify-between">
        <div className="animate-breathe h-4 w-72 rounded-md bg-subtle" />
        <div className="animate-breathe h-8 w-28 rounded-md bg-subtle" />
      </div>
      <div className="animate-breathe mb-4 h-5 w-96 rounded-md bg-subtle" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="card-base h-[168px] p-5">
            <div className="flex items-center gap-3">
              <div className="animate-breathe h-10 w-10 rounded-lg bg-subtle" />
              <div className="animate-breathe h-5 w-28 rounded-md bg-subtle" />
            </div>
            <div className="animate-breathe mt-3 h-4 w-56 rounded-md bg-subtle" />
            <div className="animate-breathe mt-3 h-4 w-40 rounded-md bg-subtle" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ListPage() {
  const reduced = useReducedMotion()
  const navigate = useNavigate()
  const [list, setList] = useState<InterviewMeta[] | null>(null)
  const [raws, setRaws] = useState<Record<string, string | undefined>>({})
  const [jobs, setJobs] = useState<Job[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [focusIdx, setFocusIdx] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [interviewsRes, ledgerRes, statsRes] = await Promise.all([
        api.listInterviews(),
        api.listLedger().catch(() => ({ rows: [] as Job[] })),
        api.stats().catch(() => null),
      ])
      setList(interviewsRes.list)
      setJobs(ledgerRes.rows)
      setStats(statsRes)
      const entries = await Promise.allSettled(
        interviewsRes.list.map(async (m) => {
          const { raw } = await api.getInterview(m.file)
          return [m.file, raw] as const
        }),
      )
      const map: Record<string, string | undefined> = {}
      for (const e of entries) if (e.status === 'fulfilled') map[e.value[0]] = e.value[1]
      setRaws(map)
    } catch (e) {
      const message = e instanceof Error ? e.message : '未知错误'
      setError(message)
      toast.error(`面试档案加载失败：${message}`, {
        action: { label: '重试', onClick: () => void load() },
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const today = anchorToday(stats)

  const models: CardModel[] = useMemo(() => {
    if (!list) return []
    return list.map((meta) => {
      const raw = raws[meta.file] ?? ''
      const rounds = parseRounds(raw)
      // 下一轮安排：优先服务端解析（stats.upcomingInterviews），退回本地解析
      const fromStats = stats?.upcomingInterviews?.find((u) => u.company === meta.company)
      const statsDate = fromStats
        ? /(\d{4}-\d{2}-\d{2})(?:\s+(\d{1,2}:\d{2}))?/.exec(fromStats.datetime)
        : null
      const upcoming =
        fromStats && statsDate
          ? { round: fromStats.round, date: statsDate[1], time: statsDate[2] ?? '' }
          : parseUpcoming(raw)
      const days = upcoming ? daysFromToday(upcoming.date, today) : null
      return {
        meta,
        status: toJobStatus(meta.status || parseStatus(raw)),
        job: jobs.find((j) => j.company === meta.company),
        rounds,
        upcoming,
        days: days !== null && days >= 0 ? days : null,
        focus: currentFocus(raw, rounds),
        action: keyAction(raw),
      }
    })
  }, [list, raws, jobs, stats, today])

  /** 统计条数字（interviews.md S1） */
  const strip = useMemo(() => {
    const interviewing = models.filter((m) => m.status === '面试中').length
    const doneRounds = models.reduce((n, m) => n + m.rounds.filter((r) => !r.pending).length, 0)
    const pendingRetro = models.reduce(
      (n, m) => n + m.rounds.filter((r) => /答得如何[：:]\s*(待进行)?\s*$/m.test(r.body)).length,
      0,
    )
    const within48h = models.filter((m) => m.days !== null && m.days <= 2).length
    return { interviewing, doneRounds, pendingRetro, within48h }
  }, [models])

  const openDetail = useCallback(
    (company: string) => navigate(`/interviews/${encodeURIComponent(company)}`),
    [navigate],
  )

  /** 列表页快捷键：j/k + Enter */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        !target ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      )
        return
      if (models.length === 0) return
      if (e.key === 'j' || e.key === 'k') {
        e.preventDefault()
        setFocusIdx((prev) =>
          Math.min(Math.max(prev + (e.key === 'j' ? 1 : -1), 0), models.length - 1),
        )
      } else if (e.key === 'Enter') {
        const model = models[focusIdx]
        if (model && !dialogOpen) openDetail(model.meta.company)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [models, focusIdx, dialogOpen, openDetail])

  if (loading && !list) return <ListSkeleton />

  if (!list) {
    return (
      <div className="card-base flex min-h-[320px] flex-col items-center justify-center gap-3 p-10 text-center">
        <p className="text-[14px] font-medium text-ink-1">面试档案加载失败</p>
        <p className="max-w-[420px] text-[13px] text-ink-3">{error}</p>
        <button type="button" className="btn-primary mt-1" onClick={() => void load()}>
          <RefreshCw size={14} aria-hidden />
          重试
        </button>
      </div>
    )
  }

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* 操作行（Topbar 右侧主操作位由各页面自管） */}
      <div className="mb-4 flex h-8 items-center justify-end">
        <button type="button" className="btn-secondary" onClick={() => setDialogOpen(true)}>
          <Plus size={14} aria-hidden />
          新建档案
        </button>
      </div>

      {models.length === 0 ? (
        <div className="card-base flex flex-col items-center gap-3 p-12 text-center">
          <img src="/empty-interviews.svg" alt="" width={160} height={107} className="opacity-90" />
          <p className="text-[14px] font-semibold text-ink-1">还没有面试档案</p>
          <p className="max-w-[420px] text-[13px] leading-[1.7] text-ink-3">
            岗位进入「沟通中」后，对 AI 说「帮我准备这家面试」就会自动建档
          </p>
        </div>
      ) : (
        <>
          {/* S1 · 页头统计条 */}
          <div className="mb-4 flex h-7 items-center gap-2 text-[13px] text-ink-2">
            <span>
              面试中公司 <span className="tnum font-mono font-medium text-ink-1">{strip.interviewing}</span>
              <span className="mx-1.5 text-ink-4">·</span>
              累计面试 <span className="tnum font-mono font-medium text-ink-1">{strip.doneRounds}</span> 场
              <span className="mx-1.5 text-ink-4">·</span>
              待复盘 <span className="tnum font-mono font-medium text-ink-1">{strip.pendingRetro}</span>
              <span className="mx-1.5 text-ink-4">·</span>
              <motion.span
                className={cn(strip.within48h > 0 && 'font-medium text-[#C2410C] dark:text-[#D47A55]')}
                initial={reduced || strip.within48h === 0 ? false : { scale: 1 }}
                animate={strip.within48h > 0 ? { scale: [1, 1.05, 1] } : undefined}
                transition={{ delay: 0.6, duration: 0.3, type: 'spring', stiffness: 300, damping: 12 }}
              >
                48 小时内有面试{' '}
                <span className="tnum font-mono">{strip.within48h}</span>
              </motion.span>
            </span>
            <button
              type="button"
              className="btn-ghost ml-auto h-7 px-2 text-[12px]"
              onClick={() =>
                toast.info('档案位于工作区 03-interview/ 目录，可在文件管理器中打开')
              }
            >
              <FolderOpen size={13} aria-hidden />
              在文件夹中查看
            </button>
          </div>

          {/* S2 · 公司卡片网格（2 列，gap 16px） */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {models.map((model, i) => (
              <CompanyCard
                key={model.meta.file}
                model={model}
                raw={raws[model.meta.file] ?? ''}
                index={i}
                focused={i === focusIdx}
                onOpen={() => openDetail(model.meta.company)}
              />
            ))}
          </div>
        </>
      )}

      <NewArchiveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        existingCompanies={list.map((m) => m.company)}
        onCreated={(company) => {
          void load()
          openDetail(company)
        }}
      />
    </motion.div>
  )
}
