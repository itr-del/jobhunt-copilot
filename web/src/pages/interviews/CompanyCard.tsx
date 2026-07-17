import { motion, useReducedMotion } from 'framer-motion'
import { Check, Copy, FolderOpen, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import type { InterviewMeta, Job, JobStatus } from '@/lib/api'
import { STATUS_COLOR } from '@/lib/meta'
import StatusBadge from '@/components/StatusBadge'
import SourceTag from '@/components/SourceTag'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { companyColor, countdownLabel } from './interviewUtils'
import type { Round, Upcoming } from './interviewUtils'

/** S2 · 公司卡片（interviews.md）：岗位/来源/薪资 + 轮次进度条 + 倒计时徽标 + 关键行动 */

export type CardModel = {
  meta: InterviewMeta
  status: JobStatus
  job: Job | undefined
  rounds: Round[]
  upcoming: Upcoming | null
  /** 距锚定今天天数（仅未来 0..n 天；无安排为 null） */
  days: number | null
  focus: string
  action: string
}

type NodeState = 'past' | 'current' | 'future'
type ProgressNode = { label: string; state: NodeState; when: string }

/**
 * 轮次节点推导：已记录的轮次（待进行 = 当前）→ 「下一步」提到的未来轮次（三面/终面…）→
 * 文中提到 HR 时补一个 HR 面终态节点。
 */
function buildNodes(model: CardModel, raw: string): ProgressNode[] {
  const nodes: ProgressNode[] = model.rounds.map((r) => ({
    label: r.label,
    state: r.pending ? 'current' : 'past',
    when: r.pending ? r.when : '',
  }))
  const has = (label: string) => nodes.some((n) => n.label === label)
  if (model.upcoming && !has(model.upcoming.round) && model.upcoming.round) {
    // 仅在有具体时间时标注日期（无时间的日期多为跟进期限，如「07-21 前主动跟进」）
    nodes.push({
      label: model.upcoming.round,
      state: 'future',
      when: model.upcoming.time ? `${model.upcoming.date.slice(5)} ${model.upcoming.time}` : '',
    })
  }
  // 「下一步」里提到但尚未记录的轮次（如「等 HR 通知三面时间」→ 三面）
  const nextText = model.focus
  const mention = /(三面|四面|五面|终面)/.exec(nextText)?.[1]
  if (mention && !has(mention)) nodes.push({ label: mention, state: 'future', when: '' })
  // HR 面终态节点（档案中提到 HR 且尚无 HR 面节点）
  if (/HR/.test(raw) && !has('HR 面')) nodes.push({ label: 'HR 面', state: 'future', when: '' })
  return nodes
}

function RoundNode({
  node,
  color,
  delay,
  reduced,
}: {
  node: ProgressNode
  color: string
  delay: number
  reduced: boolean
}) {
  const circle =
    node.state === 'past' ? (
      <span
        className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: color }}
      >
        <Check size={9} strokeWidth={3} aria-hidden />
      </span>
    ) : node.state === 'current' ? (
      <span className="relative flex h-3.5 w-3.5 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full motion-safe:animate-ping"
          style={{ backgroundColor: color, opacity: 0.35 }}
        />
        <span
          className="relative h-3.5 w-3.5 rounded-full border-2 bg-surface"
          style={{ borderColor: color }}
        />
      </span>
    ) : (
      <span className="h-3.5 w-3.5 rounded-full border-2 border-strong bg-surface" />
    )
  return (
    <motion.span
      className="flex shrink-0 items-center gap-1"
      initial={reduced ? false : { scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22, delay }}
      title={node.when ? `${node.label} ${node.when}` : node.label}
    >
      {circle}
      <span
        className={cn(
          'whitespace-nowrap text-[11px]',
          node.state === 'future' ? 'text-ink-4' : 'font-medium text-ink-2',
        )}
      >
        {node.label}
        {node.when && (
          <span className="tnum ml-0.5 font-mono text-[10px] text-ink-3">（{node.when}）</span>
        )}
      </span>
    </motion.span>
  )
}

export default function CompanyCard({
  model,
  raw,
  index,
  focused,
  onOpen,
}: {
  model: CardModel
  raw: string
  index: number
  focused: boolean
  onOpen: () => void
}) {
  const reduced = useReducedMotion()
  const { meta, status, job } = model
  const color = STATUS_COLOR[status]
  const nodes = buildNodes(model, raw)
  const near = model.days !== null && model.days >= 0 && model.days <= 2
  const baseDelay = Math.min(index * 0.07, 0.35)

  const copyPath = async () => {
    try {
      await navigator.clipboard.writeText(`03-interview/${meta.file}`)
      toast.success('档案路径已复制')
    } catch {
      toast.error('复制失败：浏览器未授权剪贴板')
    }
  }

  return (
    <motion.div
      role="link"
      tabIndex={0}
      aria-label={`${meta.company} 面试档案`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1], delay: baseDelay }}
      className={cn(
        'card-base card-hover flex h-[168px] cursor-pointer flex-col p-5',
        focused && 'ring-2 ring-accent-500',
      )}
    >
      {/* 行 1：色块 + 公司名 + 倒计时徽标 + StatusBadge + more */}
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[15px] font-semibold text-white"
          style={{ backgroundColor: companyColor(meta.company) }}
          aria-hidden
        >
          {meta.company.charAt(0)}
        </span>
        <h3 className="truncate text-[16px] font-semibold tracking-[-0.01em] text-ink-1">
          {meta.company}
        </h3>
        {near && model.days !== null && (
          <motion.span
            className="shrink-0 rounded-pill bg-[#C2410C] px-1.5 py-px text-[11px] font-medium leading-[1.6] text-white"
            animate={reduced ? undefined : { scale: [1, 1.06, 1] }}
            transition={
              reduced ? undefined : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
            }
          >
            {countdownLabel(model.days)}
          </motion.span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-1">
          <StatusBadge status={status} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="更多操作"
                className="btn-icon"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-[176px] rounded-lg border-border bg-surface p-1 shadow-e2"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                className="cursor-pointer gap-2 rounded-md px-2 py-1.5 text-[13px] text-ink-1 focus:bg-subtle"
                onSelect={copyPath}
              >
                <Copy size={14} className="text-ink-3" />
                复制档案路径
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2 rounded-md px-2 py-1.5 text-[13px] text-ink-1 focus:bg-subtle"
                onSelect={() =>
                  toast.info(`档案位于工作区 03-interview/ 目录（${meta.file}），可在文件管理器中打开`)
                }
              >
                <FolderOpen size={14} className="text-ink-3" />
                在文件夹中查看
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </div>

      {/* 行 2：岗位 · 来源 · 薪资 */}
      <div className="mt-2 flex items-center gap-1.5 truncate text-[13px] text-ink-2">
        <span className="truncate">{model.meta.position || '岗位未填写'}</span>
        {job && (
          <>
            <span className="shrink-0 text-ink-4">·</span>
            <SourceTag source={job.source} className="h-[20px]" />
            {job.salary_range && (
              <span className="tnum shrink-0 font-mono text-[12px] text-ink-3">
                {job.salary_range}
              </span>
            )}
          </>
        )}
      </div>

      {/* 行 3：轮次进度条 + 当前焦点 */}
      <div className="mt-3 flex items-center gap-1.5">
        {nodes.length > 0 ? (
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {nodes.map((node, i) => (
              <span key={`${node.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
                {i > 0 && (
                  <motion.span
                    aria-hidden
                    className="h-[2px] w-4 shrink-0 origin-left rounded-full sm:w-6"
                    style={{ backgroundColor: nodes[i - 1].state === 'past' ? color : 'var(--border-strong)' }}
                    initial={reduced ? false : { scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.3, delay: baseDelay + 0.2 + i * 0.06 }}
                  />
                )}
                <RoundNode node={node} color={color} delay={baseDelay + 0.2 + i * 0.06} reduced={reduced ?? false} />
              </span>
            ))}
          </div>
        ) : (
          <span className="text-[12px] text-ink-4">还没有轮次记录</span>
        )}
        {model.focus && (
          <span className="ml-auto max-w-[45%] shrink-0 truncate text-[12px] text-ink-3" title={model.focus}>
            当前：{model.focus}
          </span>
        )}
      </div>

      {/* 行 4：最近更新 + 关键行动 */}
      <div className="mt-auto flex items-center border-t border-border pt-3">
        <span className="tnum font-mono text-[11px] text-ink-3">
          最近更新 {meta.updated ? meta.updated.slice(5) : '--'}
        </span>
        {model.action && (
          <span
            className={cn(
              'ml-auto truncate text-[12px]',
              near ? 'font-medium text-[#C2410C] dark:text-[#D47A55]' : 'text-ink-2',
            )}
          >
            {model.action} →
          </span>
        )}
      </div>
    </motion.div>
  )
}
