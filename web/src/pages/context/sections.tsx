import { motion, useReducedMotion } from 'framer-motion'
import {
  parsePairs,
  parsePrinciples,
  parseTable,
  stripTicks,
} from '@/pages/context/parse'
import { cn } from '@/lib/utils'

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

function useStagger() {
  const reduced = useReducedMotion()
  return (i: number, step: number) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.12 } }
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.22, ease: EASE_OUT, delay: i * step },
        }
}

/** 节正文里的引用注（'> …' 行），如方向表下注 */
function quoteNote(body: string): string | null {
  const lines = body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('>'))
    .map((l) => l.replace(/^>\s?/, ''))
  return lines.length ? lines.join(' ') : null
}

// ---------------------------------------------------------------------------
// S3 · 一、个人背景（定义列表）
// ---------------------------------------------------------------------------

export function BackgroundBody({ body }: { body: string }) {
  const stagger = useStagger()
  const pairs = parsePairs(body)
  return (
    <dl className="flex flex-col gap-2.5">
      {pairs.map((kv, i) => {
        const isStatus = kv.key.includes('当前状态')
        const isReason = kv.key.includes('为什么换工作')
        const insensitive = isReason && kv.value.includes('不敏感')
        return (
          <motion.div key={kv.key} className="flex items-baseline gap-3" {...stagger(i, 0.04)}>
            <dt className="w-[130px] shrink-0 text-[13.5px] leading-[1.6] text-ink-3">{kv.key}</dt>
            <dd className="min-w-0 text-[13.5px] leading-[1.6] text-ink-1">
              {isStatus && (
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-accent-500 align-middle" />
              )}
              {insensitive ? (
                <span
                  className="rounded-sm bg-subtle px-1.5 py-0.5 text-[12.5px] text-ink-3"
                  title="敏感细节只写在 01-profile/_internal/strategy.md"
                >
                  {stripTicks(kv.value)}
                </span>
              ) : (
                stripTicks(kv.value)
              )}
            </dd>
          </motion.div>
        )
      })}
    </dl>
  )
}

// ---------------------------------------------------------------------------
// S4 · 二、求职底层方法论（三原则小卡）
// ---------------------------------------------------------------------------

export function MethodologyBody({ body }: { body: string }) {
  const stagger = useStagger()
  const principles = parsePrinciples(body)
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {principles.map((p, i) => (
        <motion.div
          key={p.title}
          className="rounded-lg bg-subtle px-4 py-3.5 transition-shadow duration-instant hover:shadow-e1"
          {...stagger(i, 0.06)}
        >
          <div className="text-[14px] font-semibold text-ink-1">{p.title}</div>
          <div className="mt-1 text-[12.5px] leading-[1.6] text-ink-2">{stripTicks(p.desc)}</div>
        </motion.div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// S6 · 四、目标方向与优先级（表格）
// ---------------------------------------------------------------------------

const PRIORITY_STYLE: Record<string, string> = {
  P0: 'bg-accent-500 text-white',
  P1: 'bg-[#2563EB] text-white',
  P2: 'bg-subtle text-ink-3',
}

function statusDot(status: string): string {
  if (status.includes('进行中')) return 'bg-accent-500'
  if (status.includes('暂停')) return 'bg-ink-4'
  return 'bg-ink-3'
}

export function DirectionsBody({ body }: { body: string }) {
  const stagger = useStagger()
  const rows = parseTable(body)
  const header = rows[0] ?? []
  const items = rows.slice(1)
  const note = quoteNote(body) ?? 'P0 主攻 · P1 并行 · P2 备胎。优先级改动属于标准变更，会记入已对齐决策。'
  return (
    <div>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {header.map((h) => (
              <th
                key={h}
                className="border-b border-border pb-2 text-left font-medium text-ink-3"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((row, i) => (
            <motion.tr key={row[0] ?? i} className="h-10" {...stagger(i, 0.04)}>
              {row.map((cell, j) => {
                const col = header[j] ?? ''
                if (col === '优先级') {
                  return (
                    <td key={j} className="border-b border-border pr-3">
                      <motion.span
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30, delay: i * 0.04 + 0.1 }}
                        className={cn(
                          'inline-block rounded-pill px-2 py-0.5 text-[11px] font-semibold',
                          PRIORITY_STYLE[cell] ?? 'bg-subtle text-ink-3',
                        )}
                      >
                        {cell}
                      </motion.span>
                    </td>
                  )
                }
                if (col === '状态') {
                  return (
                    <td key={j} className="border-b border-border pr-3 text-ink-2">
                      <span
                        className={cn('mr-1.5 inline-block h-2 w-2 rounded-full align-middle', statusDot(cell))}
                      />
                      {cell}
                    </td>
                  )
                }
                if (col === '主简历版本' || col === '对内策略笔记') {
                  return (
                    <td key={j} className="border-b border-border pr-3 font-mono text-[12px] text-ink-3">
                      {stripTicks(cell)}
                    </td>
                  )
                }
                return (
                  <td key={j} className="border-b border-border pr-3 font-medium text-ink-1">
                    {cell}
                  </td>
                )
              })}
            </motion.tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2.5 text-[12px] text-ink-3">{note}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// S7 · 五、术语表（两列定义列表）
// ---------------------------------------------------------------------------

export function GlossaryBody({ body }: { body: string }) {
  const stagger = useStagger()
  const rows = parseTable(body).slice(1)
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-3.5 sm:grid-cols-2">
      {rows.map((row, i) => (
        <motion.div key={row[0] ?? i} {...stagger(i, 0.03)}>
          <dt className="font-mono text-[13px] text-accent-ink">{stripTicks(row[0] ?? '')}</dt>
          <dd className="mt-0.5 text-[13px] leading-[1.6] text-ink-2">{stripTicks(row[1] ?? '')}</dd>
        </motion.div>
      ))}
    </dl>
  )
}
