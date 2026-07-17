import { useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { Stats } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * S6 · 最近动态卡（dashboard.md）：时间线结构，左轨 1px 竖线 + 8px 节点圆点
 * （按事件类型着色），卡内独立滚动（最大高 440px），滚动后顶部出现渐隐遮罩。
 * 数据：stats.recentActivity（倒序，由服务端给出）。
 */

type Activity = Stats['recentActivity'][number]

/** 事件类型 → 节点色：台账=青、报告=紫、面试=橙、决策=琥珀（§S6） */
const KIND_COLOR: Record<Activity['kind'], string> = {
  ledger: '#0D7377',
  report: '#7C3AED',
  interview: '#C2410C',
  context: '#D97706',
}

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

export default function ActivityCard({ stats }: { stats: Stats }) {
  const reduced = useReducedMotion()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const items = stats.recentActivity

  return (
    <section className="card-base flex min-h-0 flex-col p-5">
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="text-card-title text-ink-1">最近动态</h3>
        <span className="text-[12px] text-ink-3">来自台账与报告</span>
      </div>

      {items.length === 0 ? (
        <div className="py-6 text-center text-[13px] text-ink-3">暂无动态</div>
      ) : (
        <div className="relative min-h-0">
          {/* 顶部渐隐遮罩（滚动后提示可继续滚） */}
          <div
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-x-0 top-0 z-sticky h-3 bg-gradient-to-b from-surface to-transparent transition-opacity duration-fast',
              scrolled ? 'opacity-100' : 'opacity-0',
            )}
          />
          <div
            ref={scrollRef}
            onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 4)}
            className="max-h-[440px] overflow-y-auto pr-1"
          >
            <div className="relative">
              {/* 左轨竖线：scaleY 0→1（transform-origin top，400ms） */}
              <motion.span
                aria-hidden
                className="absolute bottom-2 left-[3.5px] top-2 w-px bg-border"
                style={{ transformOrigin: 'top' }}
                initial={reduced ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.4, ease: EASE_OUT }}
              />
              <ul className="flex flex-col">
                {items.map((item, i) => (
                  <li key={`${item.time}-${i}`} className="relative py-1.5 pl-5">
                    <motion.span
                      aria-hidden
                      className="absolute left-0 top-[9px] h-2 w-2 rounded-full"
                      style={{ backgroundColor: KIND_COLOR[item.kind] ?? '#8B8B81' }}
                      initial={reduced ? false : { scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 25,
                        delay: Math.min(i * 0.04, 0.45),
                      }}
                    />
                    <motion.div
                      initial={reduced ? false : { opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, ease: EASE_OUT, delay: Math.min(i * 0.04, 0.45) }}
                    >
                      <p className="text-[13px] leading-[1.5] text-ink-1">{item.text}</p>
                      <p className="tnum mt-0.5 font-mono text-[12px] text-ink-3">{item.time}</p>
                    </motion.div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
