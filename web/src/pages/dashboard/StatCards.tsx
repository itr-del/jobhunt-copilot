import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { animate, motion, useReducedMotion } from 'framer-motion'
import { Filter, Inbox, MousePointerClick, Send } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Stats } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * S2 · 今日概况数字卡（dashboard.md）：4 × 3 列，卡高 108px。
 * 大数字 0→目标值滚动 700ms（tnum 防抖动）；卡 3 琥珀强调。
 * 数据全部来自 GET /api/stats：today.* + trend14d 驱动 sparkline。
 */

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

/** 数字滚动（§6.2-3）：reduced-motion 时直接显示终值 */
function CountUp({ value, className }: { value: number; className?: string }) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (reduced) return // 渲染层直接回退到终值，无需效果
    const controls = animate(0, value, {
      duration: 0.7,
      ease: EASE_OUT,
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return () => controls.stop()
  }, [value, reduced])

  return (
    <span className={cn('tnum text-stat', className)} data-tnum>
      {reduced ? value : display}
    </span>
  )
}

/** 7 日迷你趋势线：宽 64 高 20，1.5px 描线 + 10% 面积填充（§3.6） */
function Sparkline({
  data,
  color,
  delay = 0,
}: {
  data: number[]
  color: string
  delay?: number
}) {
  const reduced = useReducedMotion()
  const W = 64
  const H = 20
  const PAD = 1.5
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const stepX = (W - PAD * 2) / (data.length - 1)
  const points = data.map((v, i) => {
    const x = PAD + i * stepX
    const y = H - PAD - (v / max) * (H - PAD * 2)
    return [x, y] as const
  })
  const line = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
  const area = `${line} L${points[points.length - 1][0].toFixed(1)},${H - PAD} L${points[0][0].toFixed(1)},${H - PAD} Z`

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden className="shrink-0">
      <motion.path
        d={area}
        fill={color}
        fillOpacity={0.1}
        stroke="none"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: delay + 0.3 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduced ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay }}
      />
    </svg>
  )
}

type CardDef = {
  key: string
  label: string
  icon: LucideIcon
  value: number
  sub: string
  spark?: { data: number[]; color: string }
  amber?: boolean
  onClick: () => void
}

export default function StatCards({
  stats,
  onScrollToTodo,
}: {
  stats: Stats
  onScrollToTodo: () => void
}) {
  const navigate = useNavigate()
  const trend7 = stats.trend14d.slice(-7)
  const added7 = trend7.map((t) => t.added)
  const applied7 = trend7.map((t) => t.applied)
  const added7Sum = added7.reduce((a, b) => a + b, 0)

  // 待确认中评级最高者作为「优先」提示（契约未提供优先级字段，取评级最高）
  const gradeRank = (g: string) => (g === '⭐⭐⭐' ? 3 : g === '⭐⭐' ? 2 : g === '⭐' ? 1 : 0)
  const topPending = [...stats.pending.confirmJobs].sort(
    (a, b) => gradeRank(b.match_grade) - gradeRank(a.match_grade),
  )[0]

  const cards: CardDef[] = [
    {
      key: 'added',
      label: '今日新增岗位',
      icon: Inbox,
      value: stats.today.added,
      sub: `近 7 日共新增 ${added7Sum} 个`,
      spark: { data: added7, color: '#0D7377' },
      onClick: () => navigate('/jobs?added=today'),
    },
    {
      key: 'passed',
      label: '初筛通过',
      icon: Filter,
      value: stats.today.passed,
      sub: stats.today.passed > 0 ? '已加入待你确认' : '今日暂无新增过筛',
      onClick: () => navigate(`/jobs?status=${encodeURIComponent('待投递')}`),
    },
    {
      key: 'pending',
      label: '待你确认投递',
      icon: MousePointerClick,
      value: stats.today.pendingConfirm,
      sub: topPending
        ? `${topPending.company}${topPending.match_grade ? ` ${topPending.match_grade}` : ''} 优先`
        : '等你拍板',
      amber: true,
      onClick: onScrollToTodo,
    },
    {
      key: 'applied',
      label: '今日已投递',
      icon: Send,
      value: stats.today.applied,
      sub: '确认后记得回来记一笔',
      spark: { data: applied7, color: '#0D7377' },
      onClick: () => navigate('/jobs'),
    },
  ]

  return (
    <section className="col-span-12 grid grid-cols-12 gap-6">
      {cards.map((card, i) => {
        const Icon = card.icon
        return (
          <button
            key={card.key}
            type="button"
            onClick={card.onClick}
            className={cn(
              'card-base card-hover group col-span-12 flex h-[108px] flex-col justify-between p-4 px-5 text-left sm:col-span-6 lg:col-span-3',
              card.amber && 'border-amber-border',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-ink-3">{card.label}</span>
              <Icon
                size={16}
                className="text-ink-4 transition-colors duration-instant group-hover:text-ink-2"
                aria-hidden
              />
            </div>
            <CountUp value={card.value} className={card.amber ? 'text-amber-600' : 'text-ink-1'} />
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[12px] text-ink-3" title={card.sub}>
                {card.sub}
              </span>
              {card.spark && (
                <Sparkline
                  data={card.spark.data}
                  color={card.amber ? '#D97706' : card.spark.color}
                  delay={i * 0.06}
                />
              )}
            </div>
          </button>
        )
      })}
    </section>
  )
}
