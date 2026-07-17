import { motion, useReducedMotion } from 'framer-motion'
import { parseAligned } from '@/pages/context/parse'
import { cn } from '@/lib/utils'

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

/**
 * 六、已对齐决策（竖轨时间线，新→旧，context.md S8a）。
 * - 竖轨 scaleY 入场 + 节点 stagger 50ms
 * - arrival=true 时首条保持透明（FLIP 飞入结束后由页面置回，条目淡入）
 * - firstItemRef：页面 FLIP 目标定位用
 */
export default function AlignedTimeline({
  body,
  arrival = false,
  firstItemRef,
}: {
  body: string
  /** 有新决策正从待定区飞来：首条先隐身 */
  arrival?: boolean
  firstItemRef?: (el: HTMLLIElement | null) => void
}) {
  const reduced = useReducedMotion()
  const items = parseAligned(body)

  if (items.length === 0) {
    return <p className="text-[13px] text-ink-3">还没有已对齐的决策。</p>
  }

  return (
    <div className="relative pl-6">
      {/* 竖轨 */}
      <motion.span
        aria-hidden
        className="absolute bottom-2 left-[5px] top-2 w-px bg-border-strong"
        initial={reduced ? { opacity: 0 } : { scaleY: 0 }}
        animate={reduced ? { opacity: 1 } : { scaleY: 1 }}
        style={{ transformOrigin: 'top' }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
      />
      <ol className="flex flex-col gap-4">
        {items.map((item, i) => {
          const fromDecision = item.text.includes('拍板自待定')
          const hidden = arrival && i === 0
          return (
            <motion.li
              key={`${item.date}-${item.text}`}
              ref={i === 0 ? firstItemRef : undefined}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: hidden ? 0 : 1, y: 0 }}
              transition={{ duration: 0.22, ease: EASE_OUT, delay: hidden ? 0 : 0.1 + i * 0.05 }}
              className="group relative"
            >
              <span
                aria-hidden
                className={cn(
                  'absolute -left-6 top-[5px] h-[11px] w-[11px] rounded-full border-2 bg-surface',
                  'border-accent-500',
                )}
              >
                <span className="absolute inset-[2px] rounded-full bg-accent-500" />
              </span>
              <div className="flex items-baseline gap-2.5">
                <time className="tnum shrink-0 font-mono text-[12px] text-ink-3">{item.date}</time>
                <p className="min-w-0 text-[13.5px] leading-[1.6] text-ink-1">{item.text}</p>
                <span
                  className="ml-auto shrink-0 cursor-help text-[11px] text-ink-4 opacity-0 transition-opacity duration-fast group-hover:opacity-100"
                  title={fromDecision ? '由待定决策拍板转入' : '由对话对齐'}
                >
                  来源
                </span>
              </div>
            </motion.li>
          )
        })}
      </ol>
    </div>
  )
}
