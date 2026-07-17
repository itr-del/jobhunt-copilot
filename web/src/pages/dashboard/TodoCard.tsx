import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import GradeStars from '@/components/GradeStars'
import SourceTag from '@/components/SourceTag'
import { api } from '@/lib/api'
import type { Job, Stats } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * S4 · 待办清单卡（dashboard.md）：「待你拍板」。
 * 分组 1 待确认投递：确认行（双按钮：先不投 / 确认投递 Amber）；
 * 分组 2 待定决策：琥珀底卡片 → /context#pending。
 * 确认/放弃走 PATCH /api/ledger/:id，Toast 可撤销；行以高度收起动画移出。
 */

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

type DialogState = { kind: 'confirm' | 'abandon'; job: Job } | null

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : '操作失败，请重试'
}

/** CONTEXT.md 决策原文行 → 展示文本（去掉列表符/编号） */
function cleanDecision(line: string): string {
  return line.replace(/^\s*(?:[-*•]|\d+[.、)】])\s*/, '').trim()
}

export default function TodoCard({
  stats,
  flash,
  onChanged,
}: {
  stats: Stats
  /** 从数字卡/问候区跳入时琥珀边框闪烁一次（600ms） */
  flash: boolean
  /** 写操作成功后回调（父级静默重取 stats） */
  onChanged: () => void
}) {
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const [removedIds, setRemovedIds] = useState<ReadonlySet<string>>(new Set())
  const [dialog, setDialog] = useState<DialogState>(null)
  const [busy, setBusy] = useState(false)

  const confirmJobs = stats.pending.confirmJobs.filter((j) => !removedIds.has(j.id))
  const decisions = stats.pending.decisions.map(cleanDecision).filter(Boolean)
  const totalCount = confirmJobs.length + decisions.length

  const removeRow = (id: string) =>
    setRemovedIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  const restoreRow = (id: string) =>
    setRemovedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })

  /** 状态推进 + 可撤销 Toast（§7.10：状态变更类 Toast 提供 5s 撤销） */
  const advanceJob = async (job: Job, target: Job['status'], extra?: { notes?: string }) => {
    setBusy(true)
    try {
      await api.updateJob(job.id, { status: target, ...extra })
      removeRow(job.id)
      toast.success(`状态已更新 → ${target}`, {
        description: `${job.company} · ${job.position}`,
        duration: 5000,
        action: {
          label: '撤销',
          onClick: () => {
            api
              .updateJob(job.id, { status: '待投递' })
              .then(() => {
                restoreRow(job.id)
                onChanged()
              })
              .catch((e) => toast.error(`撤销失败：${errorMessage(e)}`))
          },
        },
      })
      onChanged()
    } catch (e) {
      toast.error(`操作失败：${errorMessage(e)}`)
    } finally {
      setBusy(false)
      setDialog(null)
    }
  }

  const handleSnooze = (job: Job) => {
    removeRow(job.id)
    toast('好的，明天再提醒你', { description: `${job.company} · ${job.position}` })
  }

  return (
    <section
      className={cn(
        'card-base p-5 px-6 transition-[box-shadow,border-color] duration-500',
        flash && 'border-amber-border shadow-[0_0_0_4px_#D9770626]'
      )}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <h3 className="text-card-title text-ink-1">待你拍板</h3>
        {totalCount > 0 && (
          <span className="tnum inline-flex h-[22px] items-center gap-1.5 rounded-pill bg-amber-100 px-2 text-[12px] font-medium text-amber-600">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            {totalCount}
          </span>
        )}
        <span className="text-[12px] text-ink-3">机械的活 Agent 干完了，这些需要你判断</span>
      </div>

      {totalCount === 0 ? (
        /* 空态（小号）：20px 青色对勾圆标，不用插画 */
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-500">
            <Check size={12} className="text-white" strokeWidth={3} aria-hidden />
          </span>
          <p className="text-[13px] text-ink-2">今天没有等你拍板的事</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {confirmJobs.length > 0 && (
            <div>
              <h4 className="mb-1 text-[12px] font-semibold tracking-[0.04em] text-ink-2">
                待确认投递 · <span className="tnum">{confirmJobs.length}</span>
              </h4>
              <div>
                <AnimatePresence initial={false}>
                  {confirmJobs.map((job, i) => (
                    <motion.div
                      key={job.id}
                      initial={reduced ? false : { opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                      transition={{ duration: 0.35, ease: EASE_OUT, delay: reduced ? 0 : Math.min(i * 0.05, 0.4) }}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/jobs?id=${encodeURIComponent(job.id)}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') navigate(`/jobs?id=${encodeURIComponent(job.id)}`)
                        }}
                        title={`${job.company} · ${job.position}（点击查看详情）`}
                        className="grid h-[52px] cursor-pointer grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-md border-b border-border px-1 transition-colors duration-instant last:border-b-0 hover:bg-subtle"
                      >
                        <span className="truncate text-[13px] font-medium text-ink-1">
                          {job.company} · {job.position}
                        </span>
                        <span className="flex items-center gap-2">
                          <GradeStars grade={job.match_grade} />
                          <SourceTag source={job.source} />
                          {job.salary_range && (
                            <span className="tnum font-mono text-[12px] text-ink-3">
                              {job.salary_range}
                            </span>
                          )}
                        </span>
                        <span
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" className="btn-ghost h-7 px-2 text-[12px]" disabled={busy}>
                                先不投
                                <ChevronDown size={14} aria-hidden />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onSelect={() => handleSnooze(job)}>
                                明天再问我
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-[#DC2626] focus:text-[#DC2626]"
                                onSelect={() => setDialog({ kind: 'abandon', job })}
                              >
                                放弃该岗位
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <button
                            type="button"
                            className="btn-amber h-7 px-2.5 text-[12px]"
                            disabled={busy}
                            title="点我会再确认一次"
                            onClick={() => setDialog({ kind: 'confirm', job })}
                          >
                            确认投递
                          </button>
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {decisions.length > 0 && (
            <div>
              <h4 className="mb-2 text-[12px] font-semibold tracking-[0.04em] text-ink-2">
                待定决策 · <span className="tnum">{decisions.length}</span>
              </h4>
              <div className="flex flex-col gap-2">
                {decisions.map((decision, i) => (
                  <div
                    key={`${decision}-${i}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-amber-border bg-amber-50 px-4 py-3 transition-shadow duration-instant hover:shadow-e1"
                  >
                    <p className="min-w-0 text-[13px] text-ink-1">{decision}</p>
                    <Link
                      to="/context#pending"
                      className="btn-ghost h-7 shrink-0 px-2 text-[12px] text-amber-600 hover:bg-amber-100"
                    >
                      去决策 →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 确认投递 / 放弃 二次确认（§7.9 ConfirmDialog） */}
      <AlertDialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <AlertDialogContent>
          {dialog && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {dialog.kind === 'confirm'
                    ? `确认投递「${dialog.job.company} · ${dialog.job.position}」？`
                    : `放弃「${dialog.job.company} · ${dialog.job.position}」？`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {dialog.kind === 'confirm'
                    ? '投递是对外动作，投出去无法撤回。Agent 不会替你投——请你在对应平台完成投递后，再点下面的按钮记录。'
                    : '放弃后岗位移入终态「已放弃」，备注会自动记一笔原因。'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy}>再想想</AlertDialogCancel>
                {dialog.kind === 'confirm' ? (
                  <AlertDialogAction
                    disabled={busy}
                    className="bg-amber-500 text-white hover:bg-amber-600"
                    onClick={(e) => {
                      e.preventDefault()
                      void advanceJob(dialog.job, '已投递')
                    }}
                  >
                    我已投递，标记为已投递
                  </AlertDialogAction>
                ) : (
                  <AlertDialogAction
                    disabled={busy}
                    className="border border-[#DC262655] bg-surface text-[#DC2626] hover:bg-[#DC262614]"
                    onClick={(e) => {
                      e.preventDefault()
                      const note = '用户于仪表盘标记放弃'
                      void advanceJob(dialog.job, '已放弃', {
                        notes: dialog.job.notes ? `${dialog.job.notes}；${note}` : note,
                      })
                    }}
                  >
                    放弃该岗位
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
