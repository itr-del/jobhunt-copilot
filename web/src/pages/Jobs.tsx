import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Job, JobStatus } from '@/lib/api'
import { useHealth } from '@/hooks/useHealth'
import { JOB_STATUSES } from '@/lib/meta'
import AbandonModal from '@/pages/jobs/AbandonModal'
import AddJobModal from '@/pages/jobs/AddJobModal'
import EditJobModal from '@/pages/jobs/EditJobModal'
import FilterBar, { ResultBar } from '@/pages/jobs/FilterBar'
import JobDrawer from '@/pages/jobs/JobDrawer'
import JobsTable from '@/pages/jobs/JobsTable'
import StatsBar from '@/pages/jobs/StatsBar'
import type { Filters, SortKey } from '@/pages/jobs/utils'
import {
  activeFilterCount,
  applyFilters,
  effectiveToday,
  parseGrade,
  parseSort,
  parseSources,
  parseStatuses,
  sortRows,
} from '@/pages/jobs/utils'

/**
 * 岗位台账 `/jobs`（jobs.md）：统计条 → sticky 筛选栏 → 数据表 → 详情抽屉 / 新增弹窗。
 * URL 即状态：?status=&grade=&source=&q=&sort=&added=&id= 全部写入 query，刷新/分享可还原。
 * 快捷键：n 新增 / j·k 行焦点 / Enter 开详情 / Esc 关闭 / `/` 聚焦搜索 / 1-0 勾选状态 chip。
 */

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

function Bone({ className }: { className?: string }) {
  return <div className={`animate-breathe rounded-md bg-subtle ${className ?? ''}`} />
}

function JobsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-label="加载中">
      <div className="flex h-7 items-center gap-3">
        <Bone className="h-4 w-72" />
        <Bone className="ml-auto h-7 w-24" />
        <Bone className="h-8 w-28" />
      </div>
      <div className="-mx-8 border-b border-border bg-surface px-8 py-3">
        <div className="flex items-center gap-3">
          <Bone className="h-8 w-[280px]" />
          <Bone className="h-8 w-[136px]" />
        </div>
        <div className="mt-2.5 flex gap-1.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Bone key={i} className="h-7 w-20 rounded-pill" />
          ))}
        </div>
      </div>
      <div className="card-base overflow-hidden">
        <div className="flex h-9 items-center gap-6 border-b border-border px-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <Bone key={i} className="h-3 w-14" />
          ))}
        </div>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex h-11 items-center gap-4 border-b border-border px-4">
            <Bone className="h-7 w-7 rounded-md" />
            <Bone className="h-3.5 w-28" />
            <Bone className="h-3.5 w-36" />
            <Bone className="h-5 w-16 rounded-pill" />
            <Bone className="ml-auto h-3.5 w-40" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Jobs() {
  const reduced = useReducedMotion()
  const health = useHealth()
  const [searchParams, setSearchParams] = useSearchParams()

  // ---- 数据 ----
  const [rows, setRows] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ---- 界面状态 ----
  const [focusIndex, setFocusIndex] = useState(-1)
  const [filterH, setFilterH] = useState(0)
  const [flashRow, setFlashRow] = useState<{ id: string; status: JobStatus } | null>(null)
  const [newRowId, setNewRowId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editJob, setEditJob] = useState<Job | null>(null)
  const [abandon, setAbandon] = useState<{ job: Job; initialTarget?: JobStatus } | null>(null)
  const firstPaint = useRef(true)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const newRowTimer = useRef<number | undefined>(undefined)

  // ---- URL 即状态 ----
  const filters: Filters = useMemo(
    () => ({
      statuses: parseStatuses(searchParams.get('status')),
      grade: parseGrade(searchParams.get('grade')),
      sources: parseSources(searchParams.get('source')),
      q: searchParams.get('q') ?? '',
      addedToday: searchParams.get('added') === 'today',
    }),
    [searchParams],
  )
  const sort = parseSort(searchParams.get('sort'))
  const openId = searchParams.get('id')

  const updateParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams)
      mutate(next)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const onFiltersChange = useCallback(
    (patch: Partial<Filters>) => {
      updateParams((p) => {
        if (patch.statuses !== undefined) {
          if (patch.statuses.length > 0) p.set('status', patch.statuses.join(','))
          else p.delete('status')
        }
        if (patch.grade !== undefined) {
          if (patch.grade !== '') p.set('grade', patch.grade)
          else p.delete('grade')
        }
        if (patch.sources !== undefined) {
          if (patch.sources.length > 0) p.set('source', patch.sources.join(','))
          else p.delete('source')
        }
        if (patch.q !== undefined) {
          if (patch.q.trim() !== '') p.set('q', patch.q)
          else p.delete('q')
        }
        if (patch.addedToday !== undefined) {
          if (patch.addedToday) p.set('added', 'today')
          else p.delete('added')
        }
      })
    },
    [updateParams],
  )

  const onSortChange = useCallback(
    (s: SortKey) => {
      updateParams((p) => {
        if (s === 'updated_desc') p.delete('sort')
        else p.set('sort', s)
      })
    },
    [updateParams],
  )

  const onReset = useCallback(() => {
    updateParams((p) => {
      for (const k of ['status', 'grade', 'source', 'q', 'sort', 'added']) p.delete(k)
    })
  }, [updateParams])

  const openDrawer = useCallback(
    (job: Job) => updateParams((p) => p.set('id', job.id)),
    [updateParams],
  )
  const closeDrawer = useCallback(() => updateParams((p) => p.delete('id')), [updateParams])

  // ---- 取数 ----
  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const { rows: data } = await api.listLedger()
      setRows(data)
      setError(null)
    } catch (e) {
      const message = e instanceof Error ? e.message : '未知错误'
      setError(message)
      toast.error(`读取台账失败：${message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    return () => window.clearTimeout(newRowTimer.current)
  }, [load])

  // 首次数据到达后：后续筛选/排序的行入场改为 20ms 交叉淡入口径
  useEffect(() => {
    if (!loading) firstPaint.current = false
  }, [loading])

  const replaceRow = useCallback((row: Job) => {
    setRows((prev) => prev.map((r) => (r.id === row.id ? row : r)))
  }, [])

  /** 撤销状态变更（Toast 5s 撤销按钮） */
  const revertStatus = useCallback(
    async (id: string, status: JobStatus) => {
      try {
        const { row } = await api.updateJob(id, { status })
        replaceRow(row)
        setFlashRow({ id, status })
      } catch (e) {
        toast.error(`撤销失败：${e instanceof Error ? e.message : '未知错误'}`)
      }
    },
    [replaceRow],
  )

  /** 状态推进（drawer stepper / 底部主按钮 / 终态共用） */
  const advance = useCallback(
    async (job: Job, target: JobStatus, extraNote?: string): Promise<boolean> => {
      const prev = job.status
      try {
        const notes =
          extraNote !== undefined && extraNote !== ''
            ? job.notes
              ? `${job.notes}；${extraNote}`
              : extraNote
            : undefined
        const { row } = await api.updateJob(job.id, {
          status: target,
          ...(notes ? { notes } : {}),
        })
        replaceRow(row)
        setFlashRow({ id: job.id, status: target })
        toast.success(`状态已更新 → ${target}`, {
          description: `${job.company} · ${job.position}`,
          duration: 5000,
          action: { label: '撤销', onClick: () => void revertStatus(job.id, prev) },
        })
        void load(true)
        return true
      } catch (e) {
        toast.error(`操作失败：${e instanceof Error ? e.message : '未知错误'}`)
        return false
      }
    },
    [replaceRow, revertStatus, load],
  )

  const saveNotes = useCallback(
    async (job: Job, notes: string): Promise<boolean> => {
      try {
        const { row } = await api.updateJob(job.id, { notes })
        replaceRow(row)
        toast.success('备注已保存', { description: `${job.company} · ${job.position}` })
        return true
      } catch (e) {
        toast.error(`保存失败：${e instanceof Error ? e.message : '未知错误'}`)
        return false
      }
    },
    [replaceRow],
  )

  // 状态闪色 600ms 后清除（与行底色渐隐时长对齐）
  useEffect(() => {
    if (!flashRow) return
    const t = window.setTimeout(() => setFlashRow(null), 700)
    return () => window.clearTimeout(t)
  }, [flashRow])

  // ---- 派生 ----
  const today = useMemo(() => effectiveToday(rows, health?.mode ?? null), [rows, health])
  const filtered = useMemo(() => applyFilters(rows, filters, today), [rows, filters, today])
  const sorted = useMemo(() => sortRows(filtered, sort), [filtered, sort])
  const counts = useMemo(() => {
    const c = Object.fromEntries(JOB_STATUSES.map((s) => [s, 0])) as Record<JobStatus, number>
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1
    return c
  }, [rows])
  const listKey = useMemo(
    () =>
      [
        filters.statuses.join('|'),
        filters.grade,
        filters.sources.join('|'),
        filters.q,
        filters.addedToday ? '1' : '0',
        sort,
      ].join('~'),
    [filters, sort],
  )
  const openJob = openId ? (rows.find((r) => r.id === openId) ?? null) : null
  const hasFilters = activeFilterCount(filters) > 0

  // 筛选/排序变化 → 焦点行复位
  useEffect(() => {
    setFocusIndex(-1)
  }, [listKey])

  // ---- 新增 / 去重 ----
  const handleCreated = useCallback(
    (row: Job) => {
      setNewRowId(row.id)
      void load(true)
      window.clearTimeout(newRowTimer.current)
      newRowTimer.current = window.setTimeout(() => setNewRowId(null), 1500)
    },
    [load],
  )

  const handleConflict = useCallback(
    (company: string, position: string): boolean => {
      const found = rows.find((r) => r.company === company && r.position === position)
      if (found) openDrawer(found)
      return !!found
    },
    [rows, openDrawer],
  )

  // ---- 快捷键 ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      const typing =
        el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT' ||
        el.isContentEditable

      if (e.key === 'Escape') {
        // radix 浮层（确认框 / 下拉 / Select）打开时交给它自己处理
        if (
          document.querySelector('[role="alertdialog"], [role="menu"], [role="listbox"]')
        ) {
          return
        }
        // 输入框内 Esc 只做 blur（由输入框自己处理），不牵连页面层
        if (typing) return
        if (abandon) setAbandon(null)
        else if (editJob) setEditJob(null)
        else if (addOpen) setAddOpen(false)
        else if (openId) closeDrawer()
        return
      }

      if (typing) return
      if (abandon || editJob || addOpen) return

      if (e.key === 'n') {
        e.preventDefault()
        setAddOpen(true)
      } else if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === 'j' || e.key === 'k') {
        if (openId || sorted.length === 0) return
        e.preventDefault()
        setFocusIndex((prev) => {
          const max = sorted.length - 1
          if (prev < 0) return 0
          return e.key === 'j' ? Math.min(prev + 1, max) : Math.max(prev - 1, 0)
        })
      } else if (e.key === 'Enter') {
        if (openId || focusIndex < 0) return
        const job = sorted[focusIndex]
        if (job) openDrawer(job)
      } else if (/^[0-9]$/.test(e.key)) {
        if (openId) return
        const idx = e.key === '0' ? 9 : Number(e.key) - 1
        const s = JOB_STATUSES[idx]
        if (!s) return
        const next = filters.statuses.includes(s)
          ? filters.statuses.filter((x) => x !== s)
          : [...filters.statuses, s]
        onFiltersChange({ statuses: JOB_STATUSES.filter((x) => next.includes(x)) })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ---- 渲染 ----
  if (loading && rows.length === 0) {
    return <JobsSkeleton />
  }

  return (
    <motion.div
      className="flex flex-col gap-4"
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: EASE_OUT }}
    >
      {/* S1 统计条 */}
      <StatsBar
        rows={rows}
        filtered={sorted}
        today={today}
        onFilterPending={() => onFiltersChange({ statuses: ['待投递'] })}
        onAdd={() => setAddOpen(true)}
      />

      {rows.length > 0 && (
        /* S2 筛选栏（sticky） */
        <FilterBar
          filters={filters}
          counts={counts}
          sort={sort}
          onChange={onFiltersChange}
          onSortChange={onSortChange}
          onReset={onReset}
          onHeightChange={setFilterH}
          searchInputRef={searchRef}
        />
      )}

      {/* S3 数据表区 */}
      {rows.length === 0 ? (
        error ? (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-lg border border-[#DC262633] bg-[#DC262614] px-4 py-3 text-[13px] text-[#DC2626]"
          >
            <span className="min-w-0 flex-1 truncate" title={error}>
              读取台账失败：{error}
            </span>
            <button
              type="button"
              className="btn-secondary h-7 shrink-0 px-2.5 text-[12px]"
              onClick={() => void load()}
            >
              <RefreshCw size={13} aria-hidden />
              重试
            </button>
          </div>
        ) : (
          /* 台账全空 */
          <div className="card-base flex flex-col items-center gap-3 p-12 text-center">
            <img src="/empty-jobs.svg" alt="" width={240} height={160} className="opacity-90" />
            <p className="text-[14px] font-semibold text-ink-1">台账还是空的</p>
            <p className="max-w-[420px] text-[13px] leading-[1.7] text-ink-3">
              对 AI 说一句「处理今天的求职」，或手动新增第一个岗位
            </p>
            <button type="button" className="btn-primary mt-1" onClick={() => setAddOpen(true)}>
              <Plus size={14} aria-hidden />
              新增岗位
            </button>
          </div>
        )
      ) : (
        <>
          <ResultBar
            filters={filters}
            resultCount={sorted.length}
            onChange={onFiltersChange}
            onReset={onReset}
          />
          {sorted.length === 0 ? (
            /* 无筛选结果 */
            <div className="card-base flex flex-col items-center gap-3 p-12 text-center">
              <img src="/empty-search.svg" alt="" width={160} height={110} className="opacity-90" />
              <p className="text-[14px] font-semibold text-ink-1">没有匹配的岗位</p>
              <p className="text-[13px] text-ink-3">换个关键词，或清空筛选</p>
              {hasFilters && (
                <button type="button" className="btn-secondary mt-1" onClick={onReset}>
                  清空筛选
                </button>
              )}
            </div>
          ) : (
            <JobsTable
              rows={sorted}
              total={rows.length}
              listKey={listKey}
              firstLoad={firstPaint.current}
              today={today}
              focusIndex={focusIndex}
              flashRow={flashRow}
              newRowId={newRowId}
              stickyTop={filterH}
              sort={sort}
              onSortChange={onSortChange}
              onOpen={(job) => {
                setFocusIndex(sorted.findIndex((r) => r.id === job.id))
                openDrawer(job)
              }}
              onAbandon={(job) => setAbandon({ job })}
              onFocusRow={setFocusIndex}
            />
          )}
        </>
      )}

      {/* 详情抽屉（?id= 驱动） */}
      <AnimatePresence>
        {openJob && (
          <JobDrawer
            key={openJob.id}
            job={openJob}
            onClose={closeDrawer}
            onAdvance={(job, target) => advance(job, target)}
            onSaveNotes={saveNotes}
            onEdit={(job) => setEditJob(job)}
            onAbandon={(job, initialTarget) => setAbandon({ job, initialTarget })}
          />
        )}
      </AnimatePresence>

      {/* 新增岗位弹窗 */}
      <AnimatePresence>
        {addOpen && (
          <AddJobModal
            onClose={() => setAddOpen(false)}
            onCreated={handleCreated}
            onConflict={handleConflict}
          />
        )}
      </AnimatePresence>

      {/* 编辑基本信息弹窗 */}
      <AnimatePresence>
        {editJob && (
          <EditJobModal job={editJob} onClose={() => setEditJob(null)} onSaved={replaceRow} />
        )}
      </AnimatePresence>

      {/* 标记终态弹窗 */}
      <AnimatePresence>
        {abandon && (
          <AbandonModal
            key={abandon.job.id}
            job={abandon.job}
            initialTarget={abandon.initialTarget}
            onClose={() => setAbandon(null)}
            onConfirm={async (target, note) => {
              const ok = await advance(abandon.job, target, note)
              return ok
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
