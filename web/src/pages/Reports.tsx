import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { motion, useReducedMotion } from 'framer-motion'
import { ClipboardCopy, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { ReportMeta } from '@/lib/api'
import { useHealth } from '@/hooks/useHealth'
import ReportList from '@/pages/reports/ReportList'
import ReportReader from '@/pages/reports/ReportReader'
import { baseName, formatLocalDate, sortReports } from '@/pages/reports/reportsUtils'

/**
 * 每日简报 `/reports`（reports.md）：左列表（320px）+ 右阅读的双栏布局。
 * URL 状态：`?date=2025-07-17`（日报）/ `?name=2025-W28`（周报）；默认选中最新一篇。
 * 快捷键：j/k 切换选中篇；←/→ 前一天/后一天；c 复制当前篇；/ 聚焦搜索。
 */

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]
/** 预取原文上限（摘要渲染用；超出部分选中时再取） */
const PREFETCH_LIMIT = 30

function ReportsSkeleton() {
  return (
    <div aria-label="加载中">
      <div className="mb-4 flex justify-end">
        <div className="animate-breathe h-8 w-32 rounded-md bg-subtle" />
      </div>
      <div className="card-base flex h-[560px] overflow-hidden">
        <div className="w-[320px] shrink-0 border-r border-border">
          <div className="border-b border-border p-4">
            <div className="animate-breathe h-8 rounded-md bg-subtle" />
          </div>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="border-b border-border px-4 py-3">
              <div className="animate-breathe mb-2 h-4 w-28 rounded-md bg-subtle" />
              <div className="animate-breathe h-3 w-44 rounded-md bg-subtle" />
            </div>
          ))}
        </div>
        <div className="flex-1 px-10 py-8">
          <div className="animate-breathe mb-6 h-7 w-64 rounded-md bg-subtle" />
          {[0.95, 1, 0.85, 0.6, 0.92].map((w, i) => (
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

/** 根据 URL 参数匹配简报：?date= 优先按日报日期，再按文件名；?name= 按文件名（去扩展名） */
function matchByParam(list: ReportMeta[], param: string | null): ReportMeta | undefined {
  if (!param) return undefined
  return (
    list.find((r) => r.type === 'daily' && r.date === param) ??
    list.find((r) => baseName(r.file) === param) ??
    list.find((r) => r.date === param)
  )
}

export default function Reports() {
  const reduced = useReducedMotion()
  const health = useHealth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [list, setList] = useState<ReportMeta[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [contents, setContents] = useState<Record<string, string | undefined>>({})
  const [contentErrors, setContentErrors] = useState<Record<string, string | undefined>>({})
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [today, setToday] = useState(() => formatLocalDate(new Date()))
  const [query, setQuery] = useState('')
  const [fontSize, setFontSize] = useState(15)

  const inputRef = useRef<HTMLInputElement>(null)
  const listScrollRef = useRef<HTMLDivElement>(null)
  const inflight = useRef(new Set<string>())

  /** 拉取单篇原文（带缓存与去重） */
  const fetchRaw = useCallback(async (file: string, force = false) => {
    if (!force && inflight.current.has(file)) return
    inflight.current.add(file)
    try {
      const { raw } = await api.getReport(file)
      setContents((prev) => ({ ...prev, [file]: raw }))
      setContentErrors((prev) => ({ ...prev, [file]: undefined }))
    } catch (e) {
      const message = e instanceof Error ? e.message : '未知错误'
      setContentErrors((prev) => ({ ...prev, [file]: message }))
    } finally {
      inflight.current.delete(file)
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [{ list: reports }, stats] = await Promise.all([
        api.listReports(),
        api.stats().catch(() => null),
      ])
      setList(reports)
      // 「今日」锚定：服务端 demo 模式锚定到种子最新日期（trend14d 末位 = 服务端今天）
      const anchor = stats?.trend14d?.[stats.trend14d.length - 1]?.date
      if (anchor) setToday(anchor)
      // 预取原文（列表摘要 + 选中即读）
      const sorted = sortReports(reports)
      await Promise.allSettled(
        sorted.slice(0, PREFETCH_LIMIT).map(async (r) => {
          const { raw } = await api.getReport(r.file)
          setContents((prev) => ({ ...prev, [r.file]: raw }))
        }),
      )
    } catch (e) {
      const message = e instanceof Error ? e.message : '未知错误'
      setError(message)
      toast.error(`简报加载失败：${message}`, {
        action: { label: '重试', onClick: () => void load() },
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const sorted = useMemo(() => (list ? sortReports(list) : []), [list])

  /** URL 参数 → 选中；无参数/无匹配时选中最新一篇 */
  useEffect(() => {
    if (sorted.length === 0) return
    const param = searchParams.get('name') ?? searchParams.get('date')
    const target = matchByParam(sorted, param) ?? sorted[0]
    setSelectedFile((prev) => (prev === target.file ? prev : target.file))
  }, [sorted, searchParams])

  /** 选中篇原文未缓存时补拉 */
  useEffect(() => {
    if (!selectedFile) return
    if (contents[selectedFile] !== undefined) return
    void fetchRaw(selectedFile)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile])

  const selectedIndex = sorted.findIndex((r) => r.file === selectedFile)
  const selected = selectedIndex >= 0 ? sorted[selectedIndex] : null
  const hasNext = selectedIndex > 0 // sorted 倒序：index 小 = 新
  const hasPrev = selectedIndex >= 0 && selectedIndex < sorted.length - 1

  const selectReport = useCallback(
    (report: ReportMeta) => {
      setSelectedFile(report.file)
      setSearchParams(
        report.type === 'daily' ? { date: report.date } : { name: baseName(report.file) },
      )
    },
    [setSearchParams],
  )

  const goPrev = useCallback(() => {
    if (hasPrev) selectReport(sorted[selectedIndex + 1])
  }, [hasPrev, selectReport, sorted, selectedIndex])
  const goNext = useCallback(() => {
    if (hasNext) selectReport(sorted[selectedIndex - 1])
  }, [hasNext, selectReport, sorted, selectedIndex])

  /** 复制某篇原文到剪贴板 */
  const copyRaw = useCallback(
    async (report: ReportMeta, toastText: string) => {
      let raw = contents[report.file]
      if (raw === undefined) {
        try {
          raw = (await api.getReport(report.file)).raw
          setContents((prev) => ({ ...prev, [report.file]: raw }))
        } catch (e) {
          toast.error(`复制失败：${e instanceof Error ? e.message : '未知错误'}`)
          return
        }
      }
      try {
        await navigator.clipboard.writeText(raw)
        toast.success(toastText)
      } catch {
        toast.error('复制失败：浏览器未授权剪贴板')
      }
    },
    [contents],
  )

  /** 主操作：复制今日日报（无今日日报时复制最新日报） */
  const copyToday = useCallback(() => {
    const daily = sorted.find((r) => r.type === 'daily' && r.date === today) ?? sorted.find((r) => r.type === 'daily')
    if (!daily) {
      toast.error('还没有日报可复制')
      return
    }
    void copyRaw(daily, '已复制，可直接粘贴')
  }, [sorted, today, copyRaw])

  /** 快捷键（reports.md「快捷键」） */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const editable =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '/' ) {
        if (!editable) {
          e.preventDefault()
          inputRef.current?.focus()
        }
        return
      }
      if (editable) return
      if (sorted.length === 0) return
      if (e.key === 'j' || e.key === 'k') {
        e.preventDefault()
        const dir = e.key === 'j' ? 1 : -1
        const idx = selectedIndex < 0 ? 0 : Math.min(Math.max(selectedIndex + dir, 0), sorted.length - 1)
        const next = sorted[idx]
        if (next) {
          selectReport(next)
          listScrollRef.current
            ?.querySelector(`[data-report-file="${CSS.escape(next.file)}"]`)
            ?.scrollIntoView({ block: 'nearest' })
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'c') {
        if (selected) void copyRaw(selected, '已复制，可直接粘贴')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [sorted, selectedIndex, selected, selectReport, goPrev, goNext, copyRaw])

  if (loading && !list) return <ReportsSkeleton />

  if (!list) {
    return (
      <div className="card-base flex min-h-[320px] flex-col items-center justify-center gap-3 p-10 text-center">
        <p className="text-[14px] font-medium text-ink-1">简报加载失败</p>
        <p className="max-w-[420px] text-[13px] text-ink-3">{error}</p>
        <button type="button" className="btn-primary mt-1" onClick={() => void load()}>
          <RefreshCw size={14} aria-hidden />
          重试
        </button>
      </div>
    )
  }

  const empty = sorted.length === 0
  const ribbon = health?.mode === 'demo' ? 28 : 0
  // 双栏白卡高：100dvh - DemoRibbon - Topbar 52 - 上 padding 24 - 操作行 32+16 - 下 padding 48
  const cardHeight = `calc(100dvh - ${ribbon + 52 + 24 + 48 + 48}px)`

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: EASE_OUT }}
    >
      {/* 页面主操作行（Topbar 右侧主操作位由各页面自管，见 Topbar.tsx） */}
      <div className="mb-4 flex h-8 items-center justify-end">
        <button
          type="button"
          className="btn-secondary"
          onClick={copyToday}
          disabled={empty}
          title={empty ? '还没有简报' : '复制今日日报全文 Markdown'}
        >
          <ClipboardCopy size={14} aria-hidden />
          复制今日日报
        </button>
      </div>

      {/* 双栏白卡（内部双栏各滚） */}
      <div className="card-base flex min-h-[420px] overflow-hidden" style={{ height: cardHeight }}>
        {/* 左栏 320px：搜索 + 列表 */}
        <div className="w-[320px] shrink-0 border-r border-border">
          <ReportList
            sorted={sorted}
            selected={selectedFile}
            onSelect={selectReport}
            contents={contents}
            today={today}
            inputRef={inputRef}
            query={query}
            onQueryChange={setQuery}
            scrollRef={listScrollRef}
          />
        </div>

        {/* 右栏：阅读视图 */}
        <div className="min-w-0 flex-1">
          {empty ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
              <img src="/empty-reports.svg" alt="" width={160} height={107} className="opacity-90" />
              <p className="text-[14px] font-semibold text-ink-1">还没有简报</p>
              <p className="max-w-[400px] text-[13px] leading-[1.7] text-ink-3">
                对 AI 说一句「处理今天的求职」，日报会在流水线结束时生成
              </p>
            </div>
          ) : selected ? (
            <ReportReader
              meta={selected}
              raw={contents[selected.file]}
              error={contentErrors[selected.file] ?? null}
              onRetry={() => void fetchRaw(selected.file, true)}
              hasPrev={hasPrev}
              hasNext={hasNext}
              onPrev={goPrev}
              onNext={goNext}
              fontSize={fontSize}
              onFontSizeChange={setFontSize}
            />
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}
