import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import MarkdownView from '@/pages/reports/MarkdownView'
import type { QuestionItem } from './interviewUtils'

/**
 * 「预测问题」特殊渲染（interviews.md S4）：### 问题 → 手风琴条目。
 * 默认收起只显示问题句（14px/600 sans）；展开显示答题要点；chevron 180° 旋转 200ms；
 * 内容区 height auto 展开 250ms；左侧序号圆标 24×24（展开时 accent-100）。
 */
export default function QuestionsAccordion({ items }: { items: QuestionItem[] }) {
  const reduced = useReducedMotion()
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => {
        const open = openIndex === i
        return (
          <div key={`${item.index}-${i}`} className="rounded-lg border border-border bg-surface">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenIndex(open ? null : i)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] transition-colors duration-fast',
                  open ? 'bg-accent-100 font-semibold text-accent-ink' : 'bg-subtle text-ink-3',
                )}
              >
                {item.index}
              </span>
              <span className="flex-1 font-sans text-[14px] font-semibold leading-[1.5] text-ink-1">
                {item.question}
              </span>
              <ChevronDown
                size={15}
                aria-hidden
                className={cn(
                  'shrink-0 text-ink-3 transition-transform duration-base',
                  open && 'rotate-180',
                )}
              />
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  key="content"
                  initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  animate={reduced ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                  exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border px-4 py-3">
                    <MarkdownView content={item.body} stagger={false} className="max-w-none text-[14px] leading-[1.8]" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
