import { motion, useReducedMotion } from 'framer-motion'
import { Gavel } from 'lucide-react'
import type { PendingDecision } from '@/pages/context/parse'
import { parsePending } from '@/pages/context/parse'

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

/** meta '2025-07-14 提出，07-21 前答复；关联 J-…' → '2025-07-14 提出 · 07-21 前答复' */
function metaLine(meta: string): string {
  return meta
    .replace(/；?关联.*$/, '')
    .replace(/，/g, ' · ')
    .trim()
}

/**
 * 七、待定决策清单（琥珀区，context.md S8b）。
 * 每卡右侧「去拍板」Amber 按钮；cardRef 供拍板后 FLIP 飞入已对齐时间线定位。
 */
export default function PendingList({
  body,
  onDecide,
  cardRef,
}: {
  body: string
  onDecide: (d: PendingDecision) => void
  cardRef?: (rawLine: string, el: HTMLDivElement | null) => void
}) {
  const reduced = useReducedMotion()
  const items = parsePending(body)

  if (items.length === 0) {
    return (
      <p className="text-[13px] text-ink-3">
        没有待定决策——想得都挺清楚。有新问题出现时，AI 会把它们列到这里。
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((d, i) => (
        <motion.div
          key={d.rawLine}
          ref={(el) => cardRef?.(d.rawLine, el)}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: EASE_OUT, delay: i * 0.06 }}
          className="flex items-center gap-3 rounded-lg border border-amber-border bg-amber-50 p-4 transition-[box-shadow,border-color] duration-instant hover:border-amber-500 hover:shadow-e1"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold leading-[1.5] text-ink-1">{d.title}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-ink-2">
              {d.meta && <span>{metaLine(d.meta)}</span>}
              {d.related && (
                <span className="rounded-sm bg-surface px-1.5 py-px font-mono text-[11px] text-ink-2">
                  关联 {d.related}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            className="btn-amber shrink-0"
            onClick={() => onDecide(d)}
            aria-label={`去拍板：${d.title}`}
          >
            <Gavel size={13} />
            去拍板
          </button>
        </motion.div>
      ))}
    </div>
  )
}
