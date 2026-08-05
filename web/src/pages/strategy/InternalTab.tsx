import { motion, useReducedMotion } from 'framer-motion'
import { Lock, ShieldAlert, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import PathChip from '@/pages/context/PathChip'
import { copyText } from '@/pages/context/copy'
import type { StrategySection } from '@/pages/strategy/parse'
import {
  getSection,
  parseKeywords,
  parseLeaveReason,
  parseSalary,
  parseSellingPoints,
  parseTable,
  strategyUninitialized,
} from '@/pages/strategy/parse'
import { cn } from '@/lib/utils'

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

function SectionShell({
  num,
  title,
  subtitle,
  sensitive = false,
  order,
  children,
}: {
  num: string
  title: string
  subtitle?: string
  /** 敏感信息卡：subtle 底 + 左上 lock 琥珀 */
  sensitive?: boolean
  order: number
  children: React.ReactNode
}) {
  const reduced = useReducedMotion()
  return (
    <motion.section
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: EASE_OUT, delay: Math.min(order, 4) * 0.06 }}
      className={cn(
        'relative min-w-0 overflow-hidden rounded-xl border border-border shadow-e0',
        sensitive ? 'bg-subtle' : 'bg-surface',
      )}
    >
      {sensitive && (
        <span className="absolute left-4 top-4 text-amber-500" aria-label="内部信息，绝不外发">
          <Lock size={12} />
        </span>
      )}
      <header className={cn('flex flex-wrap items-baseline gap-2 px-5 pt-4', sensitive && 'pl-9')}>
        <span className="text-[13px] font-semibold text-ink-3">{num}</span>
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink-1">{title}</h3>
        {subtitle && <span className="text-[12px] text-ink-3">{subtitle}</span>}
      </header>
      <div className={cn('px-5 pb-5 pt-3', sensitive && 'pl-9')}>{children}</div>
    </motion.section>
  )
}

/** 关键词 pill：effective=青色可复制；否则灰色删除线 */
function WordPill({ word, effective }: { word: string; effective: boolean }) {
  const onClick = async () => {
    if (!effective) return
    const ok = await copyText(word)
    if (ok) toast.success(`已复制「${word}」`)
    else toast.error('复制失败')
  }
  return (
    <motion.button
      type="button"
      onClick={() => void onClick()}
      disabled={!effective}
      whileHover={effective ? { scale: 1.04 } : undefined}
      transition={{ duration: 0.12 }}
      title={effective ? '点击复制' : undefined}
      className={cn(
        'inline-block rounded-pill px-2 py-0.5 text-[11px] font-medium',
        effective
          ? 'cursor-copy bg-accent-50 text-accent-ink'
          : 'cursor-default bg-subtle text-ink-3 line-through',
      )}
    >
      {word}
    </motion.button>
  )
}

/**
 * Tab 1 · 对内策略（strategy.md S2/S3）：⚠️ 警示带 + 六节内容卡。
 */
export default function InternalTab({
  raw,
  sections,
}: {
  raw: string
  sections: StrategySection[]
}) {
  const reduced = useReducedMotion()
  const strengths = parseSellingPoints(getSection(sections, 'strengths')?.body ?? '')
  const weaknessRows = parseTable(getSection(sections, 'weakness')?.body ?? '')
  const salary = parseSalary(getSection(sections, 'salary')?.body ?? '')
  const leave = parseLeaveReason(getSection(sections, 'leave')?.body ?? '')
  const targetRows = parseTable(getSection(sections, 'targets')?.body ?? '')
  const keywords = parseKeywords(getSection(sections, 'keywords')?.body ?? '')
  const uninit = strategyUninitialized(raw, sections)

  let order = 0

  return (
    <div className="flex max-w-[760px] flex-col gap-4">
      {/* S2 ⚠️ 内部警示带 */}
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: EASE_OUT }}
        className="relative overflow-hidden rounded-lg border border-amber-border bg-amber-50"
      >
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{
            background:
              'repeating-linear-gradient(45deg, rgba(217,119,6,0.22) 0 8px, transparent 8px 16px)',
          }}
        />
        <div className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2">
          <ShieldAlert size={16} className="shrink-0 text-amber-600" aria-hidden />
          <span className="text-[13px] font-semibold text-amber-600">内部信息，绝不外发</span>
          <span className="text-[12.5px] leading-[1.5] text-ink-2">
            ——薪资底线、真实离职原因、短板应对只给自己看；不进简历、不进日报、不进任何对外话术。
          </span>
          <PathChip path="01-profile/_internal/strategy.md" className="ml-auto" />
        </div>
      </motion.div>

      {uninit && (
        <div className="flex items-center gap-2 rounded-lg border border-accent-100 bg-accent-50 px-3 py-2.5 text-[12.5px] text-accent-ink">
          <Sparkles size={14} className="shrink-0" />
          策略笔记还没填——对 AI 说「帮我梳理求职策略」
        </div>
      )}

      {/* ① 命脉卖点与证据 */}
      <SectionShell num="一" title="命脉卖点与证据" subtitle="所有简历和话术围绕它们组织" order={order++}>
        {strengths.length === 0 ? (
          <EmptyHint />
        ) : (
          <div className="flex flex-col gap-2.5">
            {strengths.map((sp, i) => (
              <motion.div
                key={sp.title}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: EASE_OUT, delay: i * 0.045 }}
                className="rounded-lg border border-border border-l-[3px] border-l-accent-500 bg-surface px-4 py-3.5"
              >
                <div className="text-[14px] font-semibold text-ink-1">{sp.title}</div>
                <div className="mt-0.5 text-[12.5px] leading-[1.6] text-ink-2">{sp.evidence}</div>
              </motion.div>
            ))}
          </div>
        )}
      </SectionShell>

      {/* ② 短板与应对话术 */}
      <SectionShell num="二" title="短板与应对话术" order={order++}>
        {weaknessRows.length < 2 ? (
          <EmptyHint />
        ) : (
          <DataTable header={weaknessRows[0]} rows={weaknessRows.slice(1)} />
        )}
      </SectionShell>

      {/* ③ 薪资底线与期望（敏感） */}
      <SectionShell num="三" title="薪资底线与期望" sensitive order={order++}>
        {salary.length === 0 ? (
          <EmptyHint />
        ) : (
          <>
            <dl className="flex flex-col gap-2.5">
              {salary.map((row) => (
                <div key={row.label} className="flex items-baseline gap-3">
                  <dt className="w-[72px] shrink-0 text-[13px] text-ink-3">{row.label}</dt>
                  <dd
                    className={cn(
                      'min-w-0 text-[13.5px] leading-[1.6] text-ink-1',
                      row.label.includes('底线') && 'tnum font-mono font-semibold',
                    )}
                    title={row.note || undefined}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-2.5 text-[11px] text-ink-3">
              底线永远不出现在任何对外内容里；口径里只有期望。
            </p>
          </>
        )}
      </SectionShell>

      {/* ④ 真实离职原因（敏感） */}
      <SectionShell num="四" title="真实离职原因" sensitive order={order++}>
        {leave ? (
          <p className="text-[13.5px] leading-[1.7] text-ink-1">{leave}</p>
        ) : (
          <EmptyHint />
        )}
      </SectionShell>

      {/* ⑤ 目标公司清单 */}
      <SectionShell num="五" title="目标公司清单" order={order++}>
        {targetRows.length < 2 ? (
          <EmptyHint />
        ) : (
          <DataTable header={targetRows[0]} rows={targetRows.slice(1)} />
        )}
      </SectionShell>

      {/* ⑥ 关键词迭代表（本 Tab 视觉重点） */}
      <SectionShell
        num="六"
        title="关键词迭代表"
        subtitle="搜索词越用越准"
        order={order++}
      >
        {keywords.length === 0 ? (
          <EmptyHint />
        ) : (
          <>
            <div className="max-w-full overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr>
                    {['轮次', '日期', '有效词', '无效词', '积极信号', '拒绝模式'].map((h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap border-b border-border bg-subtle px-2.5 py-2 text-left font-medium text-ink-2 first:rounded-tl-md last:rounded-tr-md"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {keywords.map((k, i) => (
                    <motion.tr
                      key={k.round || i}
                      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
                      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, ease: EASE_OUT, delay: i * 0.03 }}
                    >
                      <td className="whitespace-nowrap border-b border-border px-2.5 py-2 font-medium text-ink-1">
                        {k.round}
                      </td>
                      <td className="tnum whitespace-nowrap border-b border-border px-2.5 py-2 font-mono text-[12px] text-ink-3">
                        {k.date}
                      </td>
                      <td className="border-b border-border px-2.5 py-2">
                        <span className="flex flex-wrap gap-1">
                          {k.effective.length ? (
                            k.effective.map((w) => <WordPill key={w} word={w} effective />)
                          ) : (
                            <span className="text-ink-4">—</span>
                          )}
                        </span>
                      </td>
                      <td className="border-b border-border px-2.5 py-2">
                        <span className="flex flex-wrap gap-1">
                          {k.ineffective.length ? (
                            k.ineffective.map((w) => <WordPill key={w} word={w} effective={false} />)
                          ) : (
                            <span className="text-ink-4">—</span>
                          )}
                        </span>
                      </td>
                      <td className="border-b border-border px-2.5 py-2 text-ink-2">{k.positive}</td>
                      <td className="border-b border-border px-2.5 py-2 text-ink-2">{k.rejection}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2.5 text-[12px] text-ink-3">
              每轮筛选后更新——从「沟通中/面试中」提取有效词，从已拒/已放弃里提取无效词。搜索词越用越准。
            </p>
          </>
        )}
      </SectionShell>
    </div>
  )
}

function EmptyHint() {
  return <p className="text-[13px] text-ink-4">待梳理</p>
}

function DataTable({ header, rows }: { header: string[]; rows: string[][] }) {
  const reduced = useReducedMotion()
  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {header.map((h) => (
              <th
                key={h}
                className="whitespace-nowrap border-b border-border bg-subtle px-3 py-2 text-left font-medium text-ink-2 first:rounded-tl-md last:rounded-tr-md"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <motion.tr
              key={i}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: EASE_OUT, delay: i * 0.03 }}
            >
              {row.map((cell, j) => (
                <td key={j} className="border-b border-border px-3 py-2 align-top text-ink-1">
                  {cell}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
