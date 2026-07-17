import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { motion, useReducedMotion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Stats } from '@/lib/api'
import ActivityCard from '@/pages/dashboard/ActivityCard'
import FunnelCard from '@/pages/dashboard/FunnelCard'
import Greeting from '@/pages/dashboard/Greeting'
import InterviewCard from '@/pages/dashboard/InterviewCard'
import StatCards from '@/pages/dashboard/StatCards'
import TodoCard from '@/pages/dashboard/TodoCard'

/**
 * 仪表盘 `/`（dashboard.md）：问候区 + 4 数字卡 + 求职漏斗 + 待办清单 + 面试日程 + 最近动态。
 * 数据全部来自 GET /api/stats；加载骨架屏（1.4s 呼吸），失败 Toast + 卡内重试。
 */

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

/** 骨架块（--bg-subtle 圆角块，1.4s 呼吸） */
function Bone({ className }: { className?: string }) {
  return <div className={`animate-breathe rounded-md bg-subtle ${className ?? ''}`} />
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-6" aria-label="加载中">
      {/* 问候区骨架 */}
      <div className="col-span-12 flex items-end justify-between pt-2">
        <div className="flex flex-col gap-2.5">
          <Bone className="h-7 w-40" />
          <Bone className="h-4 w-72" />
          <Bone className="h-4 w-56" />
        </div>
        <Bone className="h-8 w-36" />
      </div>
      {/* 4 数字卡骨架 */}
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="card-base col-span-12 flex h-[108px] flex-col justify-between p-4 px-5 sm:col-span-6 lg:col-span-3"
        >
          <Bone className="h-3.5 w-20" />
          <Bone className="h-8 w-12" />
          <Bone className="h-3 w-28" />
        </div>
      ))}
      {/* 左栏骨架 */}
      <div className="col-span-12 flex flex-col gap-6 lg:col-span-8">
        <div className="card-base h-[360px] p-5 px-6">
          <Bone className="mb-5 h-5 w-32" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="mb-3 flex items-center gap-3">
              <Bone className="h-4 w-24" />
              <Bone className="h-4 flex-1" />
            </div>
          ))}
        </div>
        <div className="card-base h-[280px] p-5 px-6">
          <Bone className="mb-5 h-5 w-40" />
          {[0, 1, 2].map((i) => (
            <Bone key={i} className="mb-3 h-[52px] w-full" />
          ))}
        </div>
      </div>
      {/* 右栏骨架 */}
      <div className="col-span-12 flex flex-col gap-6 lg:col-span-4">
        <div className="card-base h-[190px] p-5">
          <Bone className="mb-4 h-5 w-24" />
          <Bone className="mb-2 h-20 w-full" />
        </div>
        <div className="card-base h-[300px] p-5">
          <Bone className="mb-4 h-5 w-24" />
          {[0, 1, 2, 3].map((i) => (
            <Bone key={i} className="mb-3 h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const reduced = useReducedMotion()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState(false)
  const todoRef = useRef<HTMLDivElement>(null)
  const flashTimer = useRef<number | undefined>(undefined)

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    try {
      setStats(await api.stats())
      setError(null)
    } catch (e) {
      const message = e instanceof Error ? e.message : '未知错误'
      setError(message)
      toast.error(`仪表盘数据加载失败：${message}`, {
        action: { label: '重试', onClick: () => void load() },
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    return () => window.clearTimeout(flashTimer.current)
  }, [load])

  /** 平滑滚动到待办清单卡 + 琥珀边框闪烁一次（600ms） */
  const scrollToTodo = useCallback(() => {
    todoRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    setFlash(true)
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(false), 700)
  }, [reduced])

  /** 写操作后静默重取（保持骨架不出现） */
  const refresh = useCallback(() => void load(true), [load])

  if (loading && !stats) {
    return <DashboardSkeleton />
  }

  if (!stats) {
    return (
      <div className="card-base flex min-h-[320px] flex-col items-center justify-center gap-3 p-10 text-center">
        <p className="text-[14px] font-medium text-ink-1">仪表盘数据加载失败</p>
        <p className="max-w-[420px] text-[13px] text-ink-3">{error}</p>
        <button type="button" className="btn-primary mt-1" onClick={() => void load()}>
          <RefreshCw size={14} aria-hidden />
          重试
        </button>
      </div>
    )
  }

  // 台账全空：S3/S4 合并为空态（dashboard.md「空态与降级」）
  const ledgerTotal = stats.funnel.reduce((sum, f) => sum + f.count, 0)

  const sections = [
    <Greeting key="greeting" stats={stats} onScrollToTodo={scrollToTodo} />,
    <StatCards key="stats" stats={stats} onScrollToTodo={scrollToTodo} />,
    /* 第 3 行：左 8 列（漏斗 + 待办）+ 右 4 列（面试日程 + 最近动态） */
    <div key="main" className="grid grid-cols-12 gap-6">
      <div className="col-span-12 flex flex-col gap-6 lg:col-span-8">
        {ledgerTotal === 0 ? (
          <div className="card-base flex flex-col items-center gap-3 p-10 text-center">
            <img src="/empty-jobs.svg" alt="" width={160} height={107} className="opacity-90" />
            <p className="text-[14px] font-semibold text-ink-1">还没有岗位</p>
            <p className="max-w-[400px] text-[13px] leading-[1.7] text-ink-3">
              对 AI 说一句「处理今天的求职」，开始今天的工作
            </p>
            <button
              type="button"
              className="btn-primary mt-1"
              onClick={() => navigate('/settings#guide')}
            >
              去看使用指引
            </button>
          </div>
        ) : (
          <>
            <FunnelCard stats={stats} />
            <div ref={todoRef} className="scroll-mt-4">
              <TodoCard stats={stats} flash={flash} onChanged={refresh} />
            </div>
          </>
        )}
      </div>
      <div className="col-span-12 flex flex-col gap-6 lg:col-span-4">
        <InterviewCard stats={stats} />
        <ActivityCard stats={stats} />
      </div>
    </div>,
  ]

  return (
    <motion.div
      className="grid grid-cols-12 gap-6"
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16 }}
    >
      {sections.map((section, i) => (
        <motion.div
          key={i}
          className="col-span-12"
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: EASE_OUT, delay: Math.min(i * 0.06, 0.24) }}
        >
          {section}
        </motion.div>
      ))}
    </motion.div>
  )
}
