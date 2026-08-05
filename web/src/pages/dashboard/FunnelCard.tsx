import { Link, useNavigate } from 'react-router'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import type { JobStatus, Stats } from '@/lib/api'
import { STATUS_COLOR } from '@/lib/meta'
import { cn } from '@/lib/utils'

/**
 * S3 · 求职漏斗卡（dashboard.md）：横向条形漏斗，7 级主流程 + 终态条。
 * 条形 = 各级当前在库数量（宽度∝数量，最大 360px）；转化率 = 「曾到达该级」累计口径：
 * cum(级) = 累计总数 − 该级之前各主流程级数量；offer 级 cum = offer 数本身。
 * 每级行点击跳 /jobs?status=<该状态>。
 */

const MAIN_ORDER: JobStatus[] = ['已收藏', '待投递', '已投递', '被查看', '沟通中', '面试中', 'offer']
const TERMINAL: JobStatus[] = ['对方已拒', '已放弃', '已结束']
/** 「进行中」口径（标题行计数） */
const IN_PROGRESS: JobStatus[] = ['待投递', '已投递', '被查看', '沟通中', '面试中']
/** 转化率从「已投递」起算（MAIN_ORDER 索引 2 起） */
const CONV_FROM = 2
const MAX_BAR = 360
const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

export default function FunnelCard({ stats }: { stats: Stats }) {
  const navigate = useNavigate()
  const reduced = useReducedMotion()

  const countOf = (s: JobStatus) => stats.funnel.find((f) => f.status === s)?.count ?? 0
  const total = stats.funnel.reduce((sum, f) => sum + f.count, 0)
  const inProgress = IN_PROGRESS.reduce((sum, s) => sum + countOf(s), 0)
  const maxCount = Math.max(...MAIN_ORDER.map(countOf), 1)

  /** 曾到达各级别的累计岗位数 */
  const cumulative = (idx: number): number => {
    if (MAIN_ORDER[idx] === 'offer') return countOf('offer')
    return total - MAIN_ORDER.slice(0, idx).reduce((sum, s) => sum + countOf(s), 0)
  }
  /** 相邻级转化率（从已投递起算），分母为 0 时返回 null */
  const conversion = (idx: number): number | null => {
    const from = cumulative(idx)
    if (from <= 0) return null
    return cumulative(idx + 1) / from
  }

  return (
    <section className="card-base p-5 px-6">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h3 className="text-card-title text-ink-1">求职漏斗</h3>
          <span className="tnum text-[12px] text-ink-3">
            进行中 {inProgress} · 累计 {total}
          </span>
        </div>
        <Link to="/jobs" className="btn-ghost -mr-2 h-7 px-2 text-[12px]">
          查看台账 →
        </Link>
      </div>

      <div role="img" aria-label="求职漏斗图：各级在库岗位数量与相邻级转化率">
        {MAIN_ORDER.map((status, i) => {
          const count = countOf(status)
          const color = STATUS_COLOR[status]
          const width = count > 0 ? Math.max(8, Math.round((count / maxCount) * MAX_BAR)) : 0
          const conv = i >= CONV_FROM && i < MAIN_ORDER.length - 1 ? conversion(i) : null
          return (
            <div key={status}>
              <button
                type="button"
                onClick={() => navigate(`/jobs?status=${encodeURIComponent(status)}`)}
                className="group relative grid h-8 w-full grid-cols-[120px_minmax(0,1fr)] items-center gap-3 rounded-md px-1 text-left transition-colors duration-instant hover:bg-subtle"
              >
                <span
                  className={cn(
                    'flex items-center gap-2 text-[13px] text-ink-2',
                    count === 0 && 'opacity-40',
                  )}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {status}
                </span>
                <span className="flex items-center gap-2">
                  {count > 0 && (
                    <motion.span
                      className="block h-4 rounded-[4px] transition-[filter] duration-instant group-hover:brightness-[0.92]"
                      style={{ backgroundColor: color }}
                      initial={reduced ? false : { width: 0 }}
                      whileInView={{ width }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.5, ease: EASE_OUT, delay: i * 0.07 }}
                    />
                  )}
                  <span
                    className={cn(
                      'tnum text-[13px] font-medium text-ink-1',
                      count === 0 && 'opacity-40',
                    )}
                  >
                    {count}
                  </span>
                </span>
                {/* 悬停 tooltip（e2 浮层，100ms 淡入 + 2px 上移） */}
                <span className="pointer-events-none absolute bottom-full left-[120px] z-sticky mb-1 hidden translate-y-0.5 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-[12px] text-ink-2 shadow-e2 transition-all duration-100 group-hover:block group-hover:translate-y-0">
                  {status} · {count} 个岗位 · 点击筛选台账
                </span>
              </button>
              {/* 级间 18px 连接区：转化率 mono + 向下小箭头 */}
              {conv !== null && (
                <div className="grid h-[18px] grid-cols-[120px_minmax(0,1fr)] items-center gap-3 px-1">
                  <span />
                  <motion.span
                    className="tnum flex items-center gap-0.5 font-mono text-[12px] text-ink-3"
                    initial={reduced ? false : { opacity: 0, y: 4 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.2, delay: i * 0.07 + 0.65 }}
                  >
                    <ArrowDown size={12} aria-hidden />
                    {Math.round(conv * 100)}%
                  </motion.span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 终态行 */}
      <motion.div
        className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-[12px] text-ink-2"
        initial={reduced ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.2, delay: 0.9 }}
      >
        {(['offer', ...TERMINAL] as JobStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: STATUS_COLOR[s] }}
            />
            {s} <span className="tnum">{countOf(s)}</span>
          </span>
        ))}
      </motion.div>

      <p className="mt-3 text-[12px] text-ink-3">
        口径：曾到达各级别的累计岗位数 · 数据来自 <span className="font-mono">02-jobs/job-ledger.csv</span>
      </p>

      {/* 图表数据表替代视图（§12 无障碍） */}
      <table className="sr-only">
        <caption className="sr-only">求职漏斗数据：{MAIN_ORDER.map((s) => `${s} ${countOf(s)}`).join('，')}；终态：offer {countOf('offer')}，{TERMINAL.map((s) => `${s} ${countOf(s)}`).join('，')}</caption>
      </table>
    </section>
  )
}
