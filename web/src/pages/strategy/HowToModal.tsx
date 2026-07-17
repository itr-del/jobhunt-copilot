import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Copy, X } from 'lucide-react'
import { toast } from 'sonner'
import { copyText } from '@/pages/context/copy'

/** Tab3 「如何生成新版本」提示弹窗：说明 + 可复制口令 chip */
export default function HowToModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduced = useReducedMotion()
  const command = '帮我为 J-20250710-001 定制简历'

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  const onCopy = async () => {
    const ok = await copyText(command)
    if (ok) toast.success('已复制，去 AI 工具里粘贴')
    else toast.error('复制失败')
  }

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
          <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="如何生成新版本"
            className="relative w-full max-w-[440px] rounded-2xl border border-border bg-surface p-6 shadow-e3"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }}
          >
            <button type="button" className="btn-icon absolute right-4 top-4" onClick={onClose} aria-label="关闭">
              <X size={16} />
            </button>
            <h3 className="text-[16px] font-semibold text-ink-1">如何生成新版本</h3>
            <p className="mt-1.5 text-[13px] leading-[1.7] text-ink-2">
              定制版本由 AI 在工作区里生成：挑一个「待投递/沟通中」的岗位，对 AI 说出岗位编号即可。只重组真实经历，绝不编造；生成后会出现在本列表，外发前必须经过你确认。
            </p>
            <button
              type="button"
              onClick={() => void onCopy()}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-accent-50 px-2.5 py-1.5 font-mono text-[12px] text-accent-ink transition-transform duration-instant hover:scale-[1.02]"
            >
              {command}
              <Copy size={12} />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
