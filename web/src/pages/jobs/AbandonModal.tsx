import { useState } from 'react'
import { CircleAlert } from 'lucide-react'
import type { Job, JobStatus } from '@/lib/api'
import { STATUS_STYLE } from '@/lib/meta'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import ModalShell from './ModalShell'
import { TERMINAL_NEGATIVE } from './utils'

/**
 * 「标记放弃…」确认弹窗（design.md §7.10 ConfirmDialog 语义 + jobs.md S4 放弃下拉）：
 * 三个终态负向单选（对方已拒 / 已放弃 / 已结束）+ 备注输入；主按钮重复动作词。
 */
export default function AbandonModal({
  job,
  initialTarget,
  onClose,
  onConfirm,
}: {
  job: Job
  /** 预选中终态（抽屉 … 下拉直达时传入） */
  initialTarget?: JobStatus
  onClose: () => void
  /** 返回 true 表示写入成功，弹窗关闭 */
  onConfirm: (target: JobStatus, note: string) => Promise<boolean>
}) {
  const [target, setTarget] = useState<JobStatus>(initialTarget ?? '已放弃')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    const ok = await onConfirm(target, note.trim())
    setBusy(false)
    if (ok) onClose()
  }

  return (
    <ModalShell onClose={onClose} label={`标记 ${job.company} 为终态`} width={400}>
      <div className="p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DC262614] text-[#DC2626]">
            <CircleAlert size={20} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold text-ink-1">标记终态</h2>
            <p className="mt-1 text-[13px] leading-[1.6] text-ink-2">
              {job.company} · {job.position} 将移出「进行中」，可在台账里随时改回。
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-1.5" role="radiogroup" aria-label="终态选择">
          {TERMINAL_NEGATIVE.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={target === s}
              onClick={() => setTarget(s)}
              className={cn(
                'flex h-9 items-center gap-2.5 rounded-md border px-3 text-[13px] transition-colors duration-instant',
                target === s
                  ? 'border-strong bg-subtle text-ink-1'
                  : 'border-border text-ink-2 hover:bg-subtle',
              )}
            >
              <span aria-hidden className={cn('h-2 w-2 rounded-full', STATUS_STYLE[s].dot)} />
              {s}
              {target === s && (
                <span aria-hidden className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-500" />
              )}
            </button>
          ))}
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="备注（可选）：为什么放弃 / 对方反馈…"
          aria-label="备注"
          className="mt-3 w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-ink-1 transition-[box-shadow,border-color] duration-instant placeholder:text-ink-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
        />

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            再想想
          </button>
          <button type="button" className="btn-danger" onClick={() => void submit()} disabled={busy}>
            {busy && <Spinner className="size-3.5" aria-hidden />}
            标记为{target}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
