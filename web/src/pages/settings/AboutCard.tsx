import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import type { Health } from '@/lib/api'

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

/** 卡内展示的 10 个常用快捷键（settings.md S5） */
const SHORTCUTS_MAIN: [string, string][] = [
  ['⌘K', '命令面板'],
  ['g j', '岗位台账'],
  ['g r', '每日简报'],
  ['g i', '面试档案'],
  ['g c', '求职标准'],
  ['g s', '策略与简历'],
  ['n', '新增岗位'],
  ['j / k', '上下移动'],
  ['Enter', '打开详情'],
  ['?', '全部快捷键'],
]

/** 速查弹窗全量（design.md §7.14） */
const SHORTCUTS_ALL: [string, string][] = [
  ['⌘K / Ctrl+K', '命令面板'],
  ['g d', '仪表盘'],
  ['g j', '岗位台账'],
  ['g r', '每日简报'],
  ['g i', '面试档案'],
  ['g c', '求职标准'],
  ['g s', '策略与简历'],
  ['g t', '设置'],
  ['n', '新增岗位'],
  ['j / k 或 ↓ / ↑', '列表行间移动'],
  ['Enter', '打开焦点行详情'],
  ['Esc', '关闭抽屉 / 弹窗 / 面板'],
  ['?', '快捷键速查弹窗'],
]

function ShortcutRows({ items }: { items: [string, string][] }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
      {items.map(([keys, label]) => (
        <div key={label} className="flex items-center gap-2">
          <kbd className="kbd transition-colors duration-instant hover:bg-soft">{keys}</kbd>
          <span className="text-[12px] text-ink-2">{label}</span>
        </div>
      ))}
    </div>
  )
}

/** S5 关于（settings.md）：产品 / 版本 / 理念 / 致谢 / 快捷键 + 速查弹窗（? 也可打开） */
export default function AboutCard({ health }: { health: Health | null }) {
  const reduced = useReducedMotion()
  const [modalOpen, setModalOpen] = useState(false)

  // `?` 打开速查弹窗
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '?' || modalOpen) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      )
        return
      e.preventDefault()
      setModalOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalOpen])

  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setModalOpen(false)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [modalOpen])

  const version = health ? `web-ui v${health.version}${health.mode === 'demo' ? '（演示构建）' : ''}` : 'web-ui'

  return (
    <motion.section
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: EASE_OUT, delay: 0.24 }}
      className="card-base p-5"
    >
      <header>
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink-1">关于</h2>
      </header>

      <dl className="mt-4 flex flex-col divide-y divide-border">
        <div className="flex items-center gap-3 py-2.5">
          <dt className="w-[96px] shrink-0 text-[13px] text-ink-3">产品</dt>
          <dd className="flex items-center gap-2 text-[13px] font-semibold text-ink-1">
            <img src="/logo.svg" alt="" className="h-5 w-5" />
            jobhunt-copilot · AI 求职副驾
          </dd>
        </div>
        <div className="flex items-center gap-3 py-2.5">
          <dt className="w-[96px] shrink-0 text-[13px] text-ink-3">版本</dt>
          <dd className="tnum font-mono text-[12px] text-ink-1">{version}</dd>
        </div>
        <div className="flex items-center gap-3 py-2.5">
          <dt className="w-[96px] shrink-0 text-[13px] text-ink-3">理念</dt>
          <dd className="border-l-[3px] border-accent-500 pl-3 text-[13px] text-ink-1">
            把机械操作交给 Agent，把求职判断留给人。
          </dd>
        </div>
        <div className="flex items-baseline gap-3 py-2.5">
          <dt className="w-[96px] shrink-0 text-[13px] text-ink-3">致谢</dt>
          <dd className="text-[12px] leading-[1.7] text-ink-2">
            灵感与架构参照开源项目 recruiting-copilot（HR 视角的 AI 招聘副驾），本项目是求职者视角的同构翻转。
          </dd>
        </div>
        <div className="flex flex-col gap-2.5 py-3">
          <div className="flex items-center gap-3">
            <dt className="w-[96px] shrink-0 text-[13px] text-ink-3">键盘快捷键</dt>
            <button
              type="button"
              className="btn-ghost h-7 px-2 text-[12px]"
              onClick={() => setModalOpen(true)}
            >
              查看全部
            </button>
          </div>
          <ShortcutRows items={SHORTCUTS_MAIN} />
        </div>
      </dl>

      {/* 快捷键速查弹窗 */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="fixed inset-0 z-modal flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.08 : 0.2 }}
          >
            <div className="absolute inset-0 bg-black/30" onClick={() => setModalOpen(false)} aria-hidden />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="键盘快捷键"
              className="relative w-full max-w-[560px] rounded-2xl border border-border bg-surface p-6 shadow-e3"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }}
            >
              <button
                type="button"
                className="btn-icon absolute right-4 top-4"
                onClick={() => setModalOpen(false)}
                aria-label="关闭"
              >
                <X size={16} />
              </button>
              <h3 className="text-[16px] font-semibold text-ink-1">键盘快捷键</h3>
              <div className="mt-4">
                <ShortcutRows items={SHORTCUTS_ALL} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
