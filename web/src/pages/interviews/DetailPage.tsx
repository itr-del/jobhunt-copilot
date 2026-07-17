import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowLeft,
  CalendarClock,
  Copy,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { InterviewMeta, Job, JobStatus, Stats } from '@/lib/api'
import { SOURCE_LABEL, STATUS_STYLE } from '@/lib/meta'
import StatusBadge from '@/components/StatusBadge'
import MarkdownView from '@/pages/reports/MarkdownView'
import { PathChip } from '@/pages/reports/ReportReader'
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
import { useHealth } from '@/hooks/useHealth'
import { cn } from '@/lib/utils'
import ArchiveEditor from './ArchiveEditor'
import QASection from './QASection'
import QuestionsAccordion from './QuestionsAccordion'
import {
  anchorToday,
  companyColor,
  countdownLabel,
  daysFromToday,
  parseDate,
  parseQuestions,
  parseStatus,
  parseUpcoming,
  parseField,
  preambleRemainder,
  splitSections,
  weekdayLabel,
} from './interviewUtils'
import type { ArchiveSection } from './interviewUtils'

/**
 * `/interviews/:company` 档案详情页（interviews.md S3/S4/S6）：
 * 返回行 + 头部卡（色块/公司名/StatusBadge/编辑/more）+ 倒计时横幅（48h 内有面试）+
 * 双栏内容区（左锚点导航 sticky + 右 Markdown，预测问题手风琴、问答库过滤）+ 编辑模式。
 * 快捷键：e 编辑；⌘S 保存；Esc 返回/退出编辑；1-7 跳锚点节。
 */

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]
const VALID_STATUS = new Set<string>(Object.keys(STATUS_STYLE))

type UpcomingInfo = { round: string; date: string; time: string; days: number }

function DetailSkeleton() {
  return (
    <div aria-label="加载中">
      <div className="animate-breathe mb-3 h-7 w-24 rounded-md bg-subtle" />
      <div className="card-base mb-6 p-5 px-6">
        <div className="flex items-center gap-3">
          <div className="animate-breathe h-11 w-11 rounded-lg bg-subtle" />
          <div className="animate-breathe h-6 w-36 rounded-md bg-subtle" />
          <div className="animate-breathe ml-auto h-8 w-20 rounded-md bg-subtle" />
        </div>
        <div className="animate-breathe mt-4 h-4 w-80 rounded-md bg-subtle" />
        <div className="animate-breathe mt-3 h-7 w-64 rounded-md bg-subtle" />
      </div>
      <div className="flex gap-8">
        <div className="w-[160px] shrink-0">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-breathe mb-3 h-4 w-24 rounded-md bg-subtle" />
          ))}
        </div>
        <div className="flex-1">
          {[0.5, 1, 0.9, 0.96, 0.7].map((w, i) => (
            <div
              key={i}
              className="animate-breathe mb-3 h-4 rounded-md bg-subtle"
              style={{ width: `${w * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/** 节内容渲染：预测问题 → 手风琴；问答库 → 过滤器；其余 → MarkdownView */
function SectionBody({ section }: { section: ArchiveSection }) {
  if (section.heading === '预测问题') {
    const items = parseQuestions(section.body)
    if (items.length > 0) return <QuestionsAccordion items={items} />
  }
  if (section.heading === '问答库') return <QASection body={section.body} />
  return <MarkdownView content={section.body} className="max-w-none" />
}

export default function DetailPage() {
  const reduced = useReducedMotion()
  const navigate = useNavigate()
  const health = useHealth()
  const params = useParams()
  // useParams 已做 URL 解码，直接用（公司名含 / 会被路由拆段，此处按单段处理）
  const company = params.company ?? ''

  const [meta, setMeta] = useState<InterviewMeta | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [raw, setRaw] = useState<string | null>(null)
  const [job, setJob] = useState<Job | undefined>(undefined)
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [activeId, setActiveId] = useState<string>('')
  const sectionRefs = useRef(new Map<string, HTMLElement>())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNotFound(false)
    try {
      const [{ list }, ledgerRes, statsRes] = await Promise.all([
        api.listInterviews(),
        api.listLedger().catch(() => ({ rows: [] as Job[] })),
        api.stats().catch(() => null),
      ])
      const found =
        list.find((m) => m.company === company) ??
        list.find((m) => m.file.replace(/\.md$/i, '') === company)
      if (!found) {
        setMeta(null)
        setNotFound(true)
        setRaw(null)
        return
      }
      const { raw: content } = await api.getInterview(found.file)
      setMeta(found)
      setRaw(content)
      setJob(ledgerRes.rows.find((j) => j.company === found.company))
      setStats(statsRes)
    } catch (e) {
      const message = e instanceof Error ? e.message : '未知错误'
      setError(message)
      toast.error(`档案加载失败：${message}`, {
        action: { label: '重试', onClick: () => void load() },
      })
    } finally {
      setLoading(false)
    }
  }, [company])

  useEffect(() => {
    void load()
  }, [load])

  const today = anchorToday(stats)

  /** 倒计时信息：优先 stats.upcomingInterviews（服务端解析），退回本地解析「下一轮安排」 */
  const upcoming: UpcomingInfo | null = useMemo(() => {
    if (!meta) return null
    const fromStats = stats?.upcomingInterviews?.find((u) => u.company === meta.company)
    let round = ''
    let date = ''
    let time = ''
    if (fromStats) {
      round = fromStats.round
      const m = /(\d{4}-\d{2}-\d{2})(?:\s+(\d{1,2}:\d{2}))?/.exec(fromStats.datetime)
      date = m?.[1] ?? ''
      time = m?.[2] ?? ''
    } else if (raw) {
      const local = parseUpcoming(raw)
      if (local) {
        round = local.round
        date = local.date
        time = local.time
      }
    }
    if (!date) return null
    const days = daysFromToday(date, today)
    if (days === null || days < 0 || days > 2) return null
    return { round, date, time, days }
  }, [meta, stats, raw, today])

  const parsed = useMemo(() => (raw ? splitSections(raw) : null), [raw])
  const sections = parsed?.sections ?? []
  const preambleText = parsed ? preambleRemainder(parsed.preamble) : ''
  const status: JobStatus = (
    VALID_STATUS.has(raw ? parseStatus(raw) : '') ? parseStatus(raw ?? '') : meta?.status
  ) as JobStatus
  const position = (raw ? parseField(raw, '岗位') : '') || meta?.position || ''

  /** scroll-spy：IntersectionObserver，rootMargin -30%（interviews.md S4） */
  useEffect(() => {
    if (editing) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        }
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )
    sectionRefs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [sections.length, editing, raw])

  const scrollToSection = useCallback(
    (id: string) => {
      setActiveId(id)
      sectionRefs.current.get(id)?.scrollIntoView({
        behavior: reduced ? 'auto' : 'smooth',
        block: 'start',
      })
    },
    [reduced],
  )

  /** 退出编辑（有未保存更改先确认） */
  const requestExitEdit = useCallback(() => {
    if (dirty) setConfirmOpen(true)
    else setEditing(false)
  }, [dirty])

  /** 浏览器级离开拦截（未保存更改） */
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  /** 详情页快捷键 */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') return // 编辑器内处理
      const target = e.target as HTMLElement | null
      const editable =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (e.key === 'Escape') {
        if (editing) requestExitEdit()
        else navigate('/interviews')
        return
      }
      if (editable || e.metaKey || e.ctrlKey || e.altKey || editing) return
      if (e.key === 'e') {
        setEditing(true)
      } else if (/^[1-7]$/.test(e.key)) {
        const idx = Number(e.key) - 1
        if (idx < sections.length) scrollToSection(`sec-${idx}`)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editing, navigate, requestExitEdit, sections.length, scrollToSection])

  const copyPath = async () => {
    if (!meta) return
    try {
      await navigator.clipboard.writeText(`03-interview/${meta.file}`)
      toast.success('档案路径已复制')
    } catch {
      toast.error('复制失败：浏览器未授权剪贴板')
    }
  }

  if (loading && !meta && !notFound) return <DetailSkeleton />

  if (notFound || (!meta && !loading)) {
    return (
      <div className="card-base flex min-h-[320px] flex-col items-center justify-center gap-3 p-10 text-center">
        <p className="text-[14px] font-medium text-ink-1">
          {notFound ? `没有找到「${company}」的面试档案` : '档案加载失败'}
        </p>
        {error && <p className="max-w-[420px] text-[13px] text-ink-3">{error}</p>}
        <div className="mt-1 flex gap-2">
          {!notFound && (
            <button type="button" className="btn-secondary" onClick={() => void load()}>
              <RefreshCw size={14} aria-hidden />
              重试
            </button>
          )}
          <button type="button" className="btn-primary" onClick={() => navigate('/interviews')}>
            <ArrowLeft size={14} aria-hidden />
            返回列表
          </button>
        </div>
      </div>
    )
  }

  if (!meta || raw === null) return <DetailSkeleton />

  const ribbon = health?.mode === 'demo' ? 28 : 0
  const editorHeight = `calc(100dvh - ${ribbon + 52 + 24 + 48}px)`
  const upcomingDate = upcoming ? parseDate(upcoming.date) : null

  // ---------- 编辑模式（S6：整页切换为 SplitEditor） ----------
  if (editing) {
    return (
      <motion.div
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <ArchiveEditor
          file={meta.file}
          initialRaw={raw}
          jobId={job?.id}
          height={editorHeight}
          onSaved={(next) => setRaw(next)}
          onCancel={requestExitEdit}
          onDirtyChange={setDirty}
        />
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent className="rounded-2xl border-border bg-surface p-6 shadow-e3 sm:max-w-[400px]">
            <AlertDialogHeader>
              <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <TriangleAlert size={18} aria-hidden />
              </div>
              <AlertDialogTitle className="text-[16px] font-semibold text-ink-1">
                更改尚未保存
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[13px] text-ink-2">
                退出编辑后，未保存的修改将丢失。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:justify-end">
              <AlertDialogCancel className="btn-secondary mt-0">继续编辑</AlertDialogCancel>
              <AlertDialogAction
                className="btn-danger"
                onClick={() => {
                  setDirty(false)
                  setEditing(false)
                }}
              >
                丢弃修改
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    )
  }

  // ---------- 阅读模式 ----------
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: EASE_OUT }}
    >
      {/* 返回行 */}
      <div className="mb-3">
        <Link
          to="/interviews"
          className="btn-ghost -ml-2 h-7 px-2 text-[12px]"
          aria-label="返回面试档案列表"
        >
          <ArrowLeft size={13} aria-hidden />
          面试档案
        </Link>
      </div>

      {/* S3 · 头部卡 */}
      <div className="card-base p-5 px-6">
        <div className="flex items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[17px] font-semibold text-white"
            style={{ backgroundColor: companyColor(meta.company) }}
            aria-hidden
          >
            {meta.company.charAt(0)}
          </span>
          <h2 className="truncate text-[20px] font-semibold leading-[1.3] tracking-[-0.01em] text-ink-1">
            {meta.company}
          </h2>
          {status && <StatusBadge status={status} />}
          <span className="ml-auto flex shrink-0 items-center gap-1">
            <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
              <Pencil size={13} aria-hidden />
              编辑
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="更多操作" className="btn-icon">
                  <MoreHorizontal size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-[176px] rounded-lg border-border bg-surface p-1 shadow-e2"
              >
                <DropdownMenuItem
                  className="cursor-pointer gap-2 rounded-md px-2 py-1.5 text-[13px] text-ink-1 focus:bg-subtle"
                  onSelect={() => void copyPath()}
                >
                  <Copy size={14} className="text-ink-3" />
                  复制档案路径
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer gap-2 rounded-md px-2 py-1.5 text-[13px] text-ink-1 focus:bg-subtle"
                  onSelect={() =>
                    toast.info(`档案位于工作区 03-interview/ 目录（${meta.file}），可在文件管理器中打开`)
                  }
                >
                  <FolderOpen size={14} className="text-ink-3" />
                  在文件夹中查看
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        </div>

        {/* meta 行 */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-2">
          {position && <span>{position}</span>}
          {job && (
            <>
              <span className="text-ink-4">·</span>
              <span>来源 {SOURCE_LABEL[job.source]}</span>
              {job.city && (
                <>
                  <span className="text-ink-4">·</span>
                  <span>{job.city}</span>
                </>
              )}
              {job.salary_range && (
                <>
                  <span className="text-ink-4">·</span>
                  <span className="tnum font-mono text-[12px]">{job.salary_range}</span>
                </>
              )}
              <span className="text-ink-4">·</span>
              <Link
                to={`/jobs?id=${encodeURIComponent(job.id)}`}
                className="tnum font-mono text-[12px] text-accent-500 underline-offset-2 transition-colors duration-instant hover:text-accent-600 hover:underline"
              >
                {job.id}
              </Link>
            </>
          )}
        </div>

        {/* 路径 chip */}
        <div className="mt-3">
          <PathChip path={`03-interview/${meta.file}`} />
        </div>

        {/* 倒计时横幅（仅 48h 内有面试；150ms 滑下展开） */}
        {upcoming && (
          <motion.div
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            transition={{ duration: 0.15, delay: 0.15, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-amber-border bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-600">
              <CalendarClock size={15} className="shrink-0" aria-hidden />
              <span>
                {upcoming.round ? `${upcoming.round}：` : ''}
                <span className="tnum font-mono">
                  {upcoming.date.slice(5)}
                  {upcomingDate ? `（${weekdayLabel(upcomingDate)}）` : ''}
                  {upcoming.time ? ` ${upcoming.time}` : ''}
                </span>
                {' · '}
                {countdownLabel(upcoming.days) === '今天' || countdownLabel(upcoming.days) === '明天'
                  ? `就是${countdownLabel(upcoming.days)}`
                  : `还有 ${upcoming.days} 天`}
                {' · '}建议今天过一遍预测问题与问答库
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* S4 · 内容区：左锚点导航 + 右 Markdown */}
      <div className="mt-6 flex items-start gap-8">
        {/* 锚点导航（sticky top 128px） */}
        {sections.length > 0 && (
          <nav
            aria-label="档案章节"
            className="sticky top-[128px] hidden w-[160px] shrink-0 flex-col gap-0.5 lg:flex"
          >
            {sections.map((section, i) => {
              const id = `sec-${i}`
              const active = activeId === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => scrollToSection(id)}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'relative flex h-7 items-center rounded-md px-2.5 text-left text-[13px] transition-colors duration-fast',
                    active ? 'font-medium text-accent-ink' : 'text-ink-3 hover:bg-subtle hover:text-ink-1',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="interviews-anchor-bar"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      className="absolute left-0 top-1/2 h-[16px] w-[2px] -translate-y-1/2 rounded-full bg-accent-500"
                    />
                  )}
                  <span className="truncate">{section.heading}</span>
                </button>
              )
            })}
          </nav>
        )}

        {/* 右内容列（max-width 680px） */}
        <div className="min-w-0 max-w-[680px] flex-1">
          {preambleText && (
            <div className="mb-8">
              <MarkdownView content={preambleText} className="max-w-none" />
            </div>
          )}
          {sections.map((section, i) => {
            const id = `sec-${i}`
            return (
              <section
                key={id}
                id={id}
                ref={(el) => {
                  if (el) sectionRefs.current.set(id, el)
                  else sectionRefs.current.delete(id)
                }}
                className="mb-8 scroll-mt-6"
              >
                <h2 className="mb-3 flex items-center gap-2 font-sans text-[17px] font-semibold leading-[1.4] text-ink-1">
                  <span aria-hidden className="h-4 w-[3px] shrink-0 rounded-full bg-accent-500" />
                  <span>{section.heading}</span>
                </h2>
                <SectionBody section={section} />
              </section>
            )
          })}
          {sections.length === 0 && !preambleText && (
            <MarkdownView content={raw} className="max-w-none" />
          )}
        </div>
      </div>
    </motion.div>
  )
}
