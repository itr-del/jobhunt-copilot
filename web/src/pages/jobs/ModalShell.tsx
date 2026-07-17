import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * 弹窗外壳（design.md §6.2-8 / §7.9）：居中，scale 0.96→1 + opacity spring，
 * 遮罩纯黑 0→0.32（200ms），点遮罩关闭。z-modal（60，高于抽屉 50）。
 * 需由父级 <AnimatePresence> 包裹以获得退出动画。
 */
export default function ModalShell({
  onClose,
  label,
  width = 640,
  children,
}: {
  onClose: () => void
  /** aria-label */
  label: string
  width?: number
  children: ReactNode
}) {
  const reduced = useReducedMotion()
  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-6">
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.32 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0.12 : 0.2 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn('relative w-full rounded-2xl border border-border bg-surface shadow-e3')}
        style={{ maxWidth: width }}
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        transition={
          reduced
            ? { duration: 0.12 }
            : { type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }
        }
      >
        {children}
      </motion.div>
    </div>
  )
}
