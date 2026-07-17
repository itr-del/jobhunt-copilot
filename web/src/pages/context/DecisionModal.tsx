import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Gavel, Loader2, X } from 'lucide-react'
import type { PendingDecision } from '@/pages/context/parse'
import { todayStr } from '@/pages/context/parse'

/**
 * 拍板弹窗（context.md S8c，宽 480px）。
 * 结论（必填）+ 理由一句话 + 可选「同步修改第三节硬规则」（勾选出规则草稿预览）。
 * 拍板后由页面执行 PUT 与 FLIP 飞入。
 */
export default function DecisionModal({
  decision,
  saving,
  onSubmit,
  onClose,
}: {
  decision: PendingDecision | null
  saving: boolean
  onSubmit: (input: { conclusion: string; reason: string; syncRule: boolean }) => void
  onClose: () => void
}) {
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!decision) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        if (!saving) onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [decision, saving, onClose])

  return (
    <AnimatePresence>
      {decision && (
        <motion.div
          className="fixed inset-0 z-modal flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.08 : 0.2 }}
        >
          <div className="absolute inset-0 bg-black/30" onClick={() => !saving && onClose()} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`拍板：${decision.title}`}
            className="relative w-full max-w-[480px] rounded-2xl border border-border bg-surface p-6 shadow-e3"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }}
          >
            <button
              type="button"
              className="btn-icon absolute right-4 top-4"
              onClick={onClose}
              disabled={saving}
              aria-label="关闭"
            >
              <X size={16} />
            </button>
            {/* key=rawLine：换一条待定决策时表单自然重置 */}
            <DecisionForm key={decision.rawLine} decision={decision} saving={saving} onSubmit={onSubmit} onClose={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function DecisionForm({
  decision,
  saving,
  onSubmit,
  onClose,
}: {
  decision: PendingDecision
  saving: boolean
  onSubmit: (input: { conclusion: string; reason: string; syncRule: boolean }) => void
  onClose: () => void
}) {
  const [conclusion, setConclusion] = useState('')
  const [reason, setReason] = useState('')
  const [syncRule, setSyncRule] = useState(false)

  const canSubmit = conclusion.trim().length > 0 && !saving
  const today = todayStr()

  return (
    <>
      <h3 className="pr-8 text-[16px] font-semibold leading-[1.4] text-ink-1">
        拍板：{decision.title}
      </h3>
      <p className="mt-1 text-[13px] leading-[1.6] text-ink-2">
        拍板后自动移入「已对齐决策」并标注今天日期，AI 下一轮起执行。
      </p>

      <div className="mt-4 flex flex-col gap-3.5">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-ink-2">结论</span>
          <input
            type="text"
            value={conclusion}
            onChange={(e) => setConclusion(e.target.value)}
            placeholder="如：一概拒绝，JD 出现即淘汰"
            autoFocus
            className="h-8 w-full rounded-md border border-border bg-surface px-2.5 text-[13px] text-ink-1 outline-none transition-shadow placeholder:text-ink-4 focus:border-transparent focus:outline focus:outline-2 focus:outline-accent-500"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-ink-2">理由一句话</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="为什么这样定——未来的你会感谢这句话"
            className="w-full resize-none rounded-md border border-border bg-surface px-2.5 py-2 text-[13px] leading-[1.6] text-ink-1 outline-none transition-shadow placeholder:text-ink-4 focus:border-transparent focus:outline focus:outline-2 focus:outline-accent-500"
          />
        </label>

        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={syncRule}
            onChange={(e) => setSyncRule(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#0D7377]"
          />
          <span className="text-[13px] text-ink-1">同步修改第三节硬规则</span>
        </label>
        {syncRule && (
          <div className="rounded-md border border-amber-border bg-amber-50 px-3 py-2.5">
            <p className="text-[12px] text-amber-600">将在「筛选硬规则」末尾追加一条规则：</p>
            <p className="mt-1 font-mono text-[12px] leading-[1.6] text-ink-1">
              - {conclusion.trim() || '（先填结论）'}（{today} 拍板）
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
          再想想
        </button>
        <button
          type="button"
          className="btn-amber"
          disabled={!canSubmit}
          title={!conclusion.trim() ? '先写下结论' : undefined}
          onClick={() => onSubmit({ conclusion: conclusion.trim(), reason: reason.trim(), syncRule })}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Gavel size={13} />}
          拍板
        </button>
      </div>
    </>
  )
}
