import { motion, useReducedMotion } from 'framer-motion'
import type { SectionKey } from '@/pages/context/parse'
import { cn } from '@/lib/utils'

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

export interface AnchorItem {
  key: SectionKey
  num: string
  label: string
}

/**
 * 左锚点导航（context.md S2，sticky）：七节锚点 + scroll-spy 高亮；
 * 待定决策条带琥珀圆点计数；底部「最近更新 MM-DD」。
 */
export default function AnchorNav({
  items,
  activeKey,
  pendingCount,
  updatedAt,
  onNavigate,
}: {
  items: AnchorItem[]
  activeKey: SectionKey | null
  pendingCount: number
  updatedAt: string | null
  onNavigate: (key: SectionKey) => void
}) {
  const reduced = useReducedMotion()
  return (
    <nav aria-label="章节锚点" className="sticky top-6 flex w-[160px] shrink-0 flex-col gap-0.5">
      {items.map((item, i) => {
        const active = activeKey === item.key
        return (
          <motion.button
            key={item.key}
            type="button"
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: -6 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0 }}
            transition={{ duration: 0.18, ease: EASE_OUT, delay: i * 0.025 }}
            onClick={() => onNavigate(item.key)}
            aria-current={active ? 'true' : undefined}
            className={cn(
              'relative flex h-8 items-center gap-1.5 rounded-md px-2.5 text-left text-[13px] transition-colors duration-fast',
              active ? 'text-accent-ink' : 'text-ink-3 hover:bg-subtle hover:text-ink-1',
            )}
          >
            {active && (
              <motion.span
                layoutId="context-anchor-bar"
                className="absolute left-0 top-1/2 h-[16px] w-[2px] -translate-y-1/2 rounded-full bg-accent-500"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="text-[12px] text-ink-4">{item.num}</span>
            <span className="truncate">{item.label}</span>
            {item.key === 'pending' && pendingCount > 0 && (
              <span className="tnum ml-auto inline-flex items-center gap-1 font-mono text-[11px] text-amber-600">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 motion-safe:animate-pulse-dot" />
                {pendingCount}
              </span>
            )}
          </motion.button>
        )
      })}
      {updatedAt && (
        <p className="mt-3 px-2.5 font-mono text-[11px] text-ink-3">最近更新 {updatedAt}</p>
      )}
    </nav>
  )
}
