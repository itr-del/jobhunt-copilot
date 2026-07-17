import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Lock, PencilLine, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import AnchorNav from '@/pages/context/AnchorNav'
import AlignedTimeline from '@/pages/context/AlignedTimeline'
import DecisionModal from '@/pages/context/DecisionModal'
import FullEditor from '@/pages/context/FullEditor'
import HardRulesBody from '@/pages/context/HardRules'
import PathChip from '@/pages/context/PathChip'
import PendingList from '@/pages/context/PendingList'
import SectionCard from '@/pages/context/SectionCard'
import {
  BackgroundBody,
  DirectionsBody,
  GlossaryBody,
  MethodologyBody,
} from '@/pages/context/sections'
import type { PendingDecision, SectionKey } from '@/pages/context/parse'
import {
  SECTION_ANCHOR,
  SECTION_ORDER,
  applyDecision,
  buildRaw,
  getSection,
  latestAlignedDate,
  parsePending,
  splitSections,
  todayStr,
} from '@/pages/context/parse'
import { cn } from '@/lib/utils'

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

const SECTION_LABEL: Record<SectionKey, string> = {
  background: '个人背景',
  methodology: '底层方法论',
  rules: '筛选硬规则',
  directions: '目标方向',
  glossary: '术语表',
  aligned: '已对齐决策',
  pending: '待定决策',
  unknown: '其他',
}

const SECTION_NUM: Record<SectionKey, string> = {
  background: '一',
  methodology: '二',
  rules: '三',
  directions: '四',
  glossary: '五',
  aligned: '六',
  pending: '七',
  unknown: '',
}

interface Rect {
  left: number
  top: number
  width: number
  height: number
}
interface Flight {
  title: string
  from: Rect
  to: Rect
}

function Bone({ className }: { className?: string }) {
  return <div className={cn('animate-breathe rounded-md bg-subtle', className)} />
}

function ContextSkeleton() {
  return (
    <div aria-label="加载中">
      <Bone className="h-10 w-full rounded-lg" />
      <div className="mt-6 flex gap-6">
        <div className="hidden w-[160px] shrink-0 flex-col gap-2 lg:flex">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <Bone key={i} className="h-6 w-28" />
          ))}
        </div>
        <div className="flex w-full max-w-[760px] flex-col gap-4">
          {[280, 150, 320, 190].map((h, i) => (
            <div key={i} className="card-base p-5" style={{ height: h }}>
              <Bone className="mb-4 h-5 w-32" />
              <Bone className="mb-2 h-4 w-full" />
              <Bone className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Context() {
  const reduced = useReducedMotion()
  const location = useLocation()
  const [raw, setRaw] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingKey, setEditingKey] = useState<SectionKey | null>(null)
  const [fullEdit, setFullEdit] = useState(false)
  const [activeKey, setActiveKey] = useState<SectionKey | null>(null)
  const [decideTarget, setDecideTarget] = useState<PendingDecision | null>(null)
  const [deciding, setDeciding] = useState(false)
  const [arrival, setArrival] = useState(false)
  const [flightPending, setFlightPending] = useState<{ title: string; from: Rect } | null>(null)
  const [flight, setFlight] = useState<Flight | null>(null)

  const pendingCardEls = useRef(new Map<string, HTMLDivElement>())
  const firstAlignedEl = useRef<HTMLLIElement | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const { raw: text } = await api.getContext()
      setRaw(text)
      setError(null)
    } catch (e) {
      const message = e instanceof Error ? e.message : '未知错误'
      setError(message)
      toast.error(`求职标准加载失败：${message}`, {
        action: { label: '重试', onClick: () => void load() },
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const parsed = useMemo(() => (raw == null ? null : splitSections(raw)), [raw])
  const pendingItems = useMemo(() => {
    if (!parsed) return []
    const sec = getSection(parsed, 'pending')
    return sec ? parsePending(sec.body) : []
  }, [parsed])

  /** 文件中实际存在的七节（按固定顺序） */
  const presentSections = useMemo(() => {
    if (!parsed) return []
    return SECTION_ORDER.filter((k) => getSection(parsed, k))
  }, [parsed])

  // ------------------------------------------------------------------
  // 锚点滚动 + scroll-spy
  // ------------------------------------------------------------------

  const scrollToSection = useCallback((key: SectionKey, smooth = true) => {
    const el = document.getElementById(SECTION_ANCHOR[key])
    if (!el) return
    el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
    window.history.replaceState(null, '', `#${SECTION_ANCHOR[key]}`)
    setActiveKey(key)
  }, [])

  // /context#pending 等锚点直达
  useEffect(() => {
    if (loading || !parsed) return
    const hash = location.hash.replace(/^#/, '')
    if (!hash) return
    const key = (Object.keys(SECTION_ANCHOR) as SectionKey[]).find(
      (k) => SECTION_ANCHOR[k] === hash,
    )
    if (!key) return
    const timer = window.setTimeout(() => scrollToSection(key), 120)
    return () => window.clearTimeout(timer)
  }, [loading, parsed, location.hash, scrollToSection])

  // scroll-spy
  useEffect(() => {
    if (loading || !parsed) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const key = (Object.keys(SECTION_ANCHOR) as SectionKey[]).find(
            (k) => SECTION_ANCHOR[k] === entry.target.id,
          )
          if (key) setActiveKey(key)
        }
      },
      { rootMargin: '-25% 0px -65% 0px' },
    )
    for (const key of presentSections) {
      const el = document.getElementById(SECTION_ANCHOR[key])
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [loading, parsed, presentSections])

  // ------------------------------------------------------------------
  // 快捷键：1-7 跳节，e 编辑当前节
  // ------------------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (fullEdit || editingKey || decideTarget) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      )
        return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (/^[1-7]$/.test(e.key)) {
        const key = presentSections[Number(e.key) - 1]
        if (key) {
          e.preventDefault()
          scrollToSection(key)
        }
      } else if (e.key === 'e') {
        const key = activeKey ?? presentSections[0]
        if (key) {
          e.preventDefault()
          setEditingKey(key)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullEdit, editingKey, decideTarget, presentSections, activeKey, scrollToSection])

  // ------------------------------------------------------------------
  // 保存（分节 / 整文件）
  // ------------------------------------------------------------------

  const putRaw = useCallback(async (newRaw: string): Promise<boolean> => {
    try {
      await api.putContext(newRaw)
      setRaw(newRaw)
      return true
    } catch (e) {
      const message = e instanceof Error ? e.message : '未知错误'
      toast.error(`保存失败：${message}`)
      return false
    }
  }, [])

  const saveSection = useCallback(
    async (key: SectionKey, newBody: string): Promise<boolean> => {
      if (raw == null) return false
      return putRaw(buildRaw(splitSections(raw), { [key]: newBody }))
    },
    [raw, putRaw],
  )

  // ------------------------------------------------------------------
  // 拍板（PUT 后 FLIP 飞入已对齐时间线）
  // ------------------------------------------------------------------

  const submitDecision = useCallback(
    async (input: { conclusion: string; reason: string; syncRule: boolean }) => {
      if (!decideTarget || raw == null) return
      setDeciding(true)
      const fromEl = pendingCardEls.current.get(decideTarget.rawLine)
      const fromRect = fromEl?.getBoundingClientRect()
      const newRaw = applyDecision(raw, {
        decision: decideTarget,
        conclusion: input.conclusion,
        reason: input.reason,
        syncRule: input.syncRule,
        today: todayStr(),
      })
      const ok = await putRaw(newRaw)
      setDeciding(false)
      if (!ok) return
      setDecideTarget(null)
      const canFly = !reduced && fromRect && getSection(splitSections(newRaw), 'aligned')
      if (!canFly) {
        toast.success('已记入已对齐决策')
        return
      }
      setFlightPending({
        title: decideTarget.title,
        from: {
          left: fromRect.left,
          top: fromRect.top,
          width: fromRect.width,
          height: fromRect.height,
        },
      })
      setArrival(true)
    },
    [decideTarget, raw, putRaw, reduced],
  )

  // 新条目渲染完成后测量目标位置，开始 FLIP 飞行
  useEffect(() => {
    if (!arrival || !flightPending) return
    const raf = requestAnimationFrame(() => {
      const toEl = firstAlignedEl.current
      if (!toEl) {
        setArrival(false)
        setFlightPending(null)
        toast.success('已记入已对齐决策')
        return
      }
      const t = toEl.getBoundingClientRect()
      setFlight({
        title: flightPending.title,
        from: flightPending.from,
        to: { left: t.left, top: t.top, width: t.width, height: t.height },
      })
      setFlightPending(null)
    })
    return () => cancelAnimationFrame(raf)
  }, [arrival, flightPending])

  const onFlightDone = useCallback(() => {
    setFlight(null)
    setArrival(false)
    toast.success('已记入已对齐决策')
  }, [])

  // ------------------------------------------------------------------
  // 渲染
  // ------------------------------------------------------------------

  if (loading) return <ContextSkeleton />

  if (error && raw == null) {
    return (
      <div className="card-base flex min-h-[240px] flex-col items-center justify-center gap-3 p-10 text-center">
        <p className="text-[14px] font-medium text-ink-1">求职标准加载失败</p>
        <p className="max-w-[420px] text-[13px] text-ink-3">{error}</p>
        <button type="button" className="btn-secondary mt-1" onClick={() => void load()}>
          <RefreshCw size={13} />
          重试
        </button>
      </div>
    )
  }

  if (!parsed) return null

  if (fullEdit && raw != null) {
    return (
      <FullEditor
        initialRaw={raw}
        onSave={putRaw}
        onClose={() => setFullEdit(false)}
      />
    )
  }

  const renderBody = (key: SectionKey, body: string) => {
    switch (key) {
      case 'background':
        return <BackgroundBody body={body} />
      case 'methodology':
        return <MethodologyBody body={body} />
      case 'rules':
        return <HardRulesBody body={body} />
      case 'directions':
        return <DirectionsBody body={body} />
      case 'glossary':
        return <GlossaryBody body={body} />
      case 'aligned':
        return (
          <AlignedTimeline
            body={body}
            arrival={arrival}
            firstItemRef={(el) => {
              firstAlignedEl.current = el
            }}
          />
        )
      case 'pending':
        return (
          <PendingList
            body={body}
            onDecide={setDecideTarget}
            cardRef={(rawLine, el) => {
              if (el) pendingCardEls.current.set(rawLine, el)
              else pendingCardEls.current.delete(rawLine)
            }}
          />
        )
      default:
        return null
    }
  }

  return (
    <div>
      {/* 页面主操作（设计：Topbar 右侧主操作 = 编辑） */}
      <div className="mb-3 flex justify-end">
        <button type="button" className="btn-primary" onClick={() => setFullEdit(true)}>
          <PencilLine size={14} />
          编辑
        </button>
      </div>

      {/* S1 顶部提示条：唯一事实源 */}
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: EASE_OUT }}
        className="flex min-h-10 flex-wrap items-center gap-2 rounded-lg border border-accent-100 bg-accent-50 px-3 py-2"
      >
        <Lock size={16} className="shrink-0 text-accent-500" aria-hidden />
        <p className="text-[13px] leading-[1.5] text-accent-ink">
          这是全工作区唯一事实源——AI 筛岗位、改简历、出话术只认本页内容。修改保存后，下一轮工作流立即生效。
        </p>
        <PathChip path="CONTEXT.md" className="ml-auto" />
      </motion.div>

      <div className="mt-6 flex items-start gap-6">
        {/* S2 左锚点导航 */}
        <div className="hidden lg:block">
          <AnchorNav
            items={presentSections.map((k) => ({
              key: k,
              num: SECTION_NUM[k],
              label: SECTION_LABEL[k],
            }))}
            activeKey={activeKey}
            pendingCount={pendingItems.length}
            updatedAt={latestAlignedDate(parsed)}
            onNavigate={(k) => scrollToSection(k)}
          />
        </div>

        {/* 分节卡片流 */}
        <div className="flex w-full max-w-[760px] min-w-0 flex-col gap-4">
          {presentSections.map((key, order) => {
            const sec = getSection(parsed, key)!
            return (
              <SectionCard
                key={key}
                num={SECTION_NUM[key]}
                title={sec.title}
                subtitle={
                  key === 'rules'
                    ? 'AI 筛岗位的唯一依据；改这里前，AI 会先在「已对齐决策」留痕'
                    : undefined
                }
                badge={
                  key === 'rules' ? (
                    <span className="rounded-pill bg-accent-100 px-2 py-0.5 text-[11px] font-semibold text-accent-ink">
                      硬规则
                    </span>
                  ) : undefined
                }
                emphasized={key === 'rules'}
                anchorId={SECTION_ANCHOR[key]}
                sectionKey={key}
                body={sec.body}
                editing={editingKey === key}
                onStartEdit={setEditingKey}
                onFinishEdit={() => setEditingKey(null)}
                onSaveSection={saveSection}
                order={order}
              >
                {renderBody(key, sec.body)}
              </SectionCard>
            )
          })}
        </div>
      </div>

      {/* 拍板弹窗 */}
      <DecisionModal
        decision={decideTarget}
        saving={deciding}
        onSubmit={(input) => void submitDecision(input)}
        onClose={() => setDecideTarget(null)}
      />

      {/* FLIP 飞行克隆（拍板 → 已对齐时间线） */}
      <AnimatePresence>
        {flight && (
          <motion.div
            className="pointer-events-none fixed z-command overflow-hidden rounded-lg border border-amber-border bg-amber-50 px-4 py-3 shadow-e2"
            style={{ left: flight.from.left, top: flight.from.top, width: flight.from.width }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: flight.to.left - flight.from.left,
              y: flight.to.top - flight.from.top,
              opacity: [1, 1, 0.2],
              scale: 0.97,
            }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28, mass: 0.9 }}
            onAnimationComplete={onFlightDone}
          >
            <p className="truncate text-[13px] font-medium text-ink-1">{flight.title}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
