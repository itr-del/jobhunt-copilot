import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 确认框（design.md §7.9 ConfirmDialog）：宽 400px，警示图标 + 标题 + 一句后果说明；
 * 主按钮重复动作词，次按钮「再想想」。弹窗动效 §6.2-8（spring + 遮罩 0.32）。
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = '再想想',
  tone = 'amber',
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  tone?: 'amber' | 'danger' | 'primary'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onCancel])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-modal flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.08 : 0.2 }}
        >
          <div
            className="absolute inset-0 bg-black/30"
            onClick={onCancel}
            aria-hidden
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            className="relative w-full max-w-[400px] rounded-2xl border border-border bg-surface p-6 shadow-e3"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                  tone === 'danger' && 'bg-[#DC262614] text-[#DC2626]',
                  tone === 'amber' && 'bg-amber-100 text-amber-600',
                  tone === 'primary' && 'bg-accent-50 text-accent-500',
                )}
              >
                <AlertTriangle size={18} />
              </span>
              <div className="min-w-0">
                <h3 className="text-[16px] font-semibold leading-[1.4] text-ink-1">{title}</h3>
                <p className="mt-1 text-[13px] leading-[1.6] text-ink-2">{description}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={onCancel} disabled={loading}>
                {cancelLabel}
              </button>
              <button
                type="button"
                className={cn(
                  tone === 'danger' && 'btn-danger',
                  tone === 'amber' && 'btn-amber',
                  tone === 'primary' && 'btn-primary',
                )}
                onClick={onConfirm}
                disabled={loading}
                autoFocus
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
