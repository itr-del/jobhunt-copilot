import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Eye, Loader2, Pencil, PencilLine } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/pages/context/ConfirmDialog'
import MarkdownView from '@/pages/context/MarkdownView'
import type { SectionKey } from '@/pages/context/parse'
import { isSectionEmpty } from '@/pages/context/parse'
import { cn } from '@/lib/utils'

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

/**
 * 分节卡片（context.md 卡头通用结构 + 就地「编辑本节」）。
 * 卡头：节序号方块 + 节标题 + 右侧徽标/副题 + 编辑本节 Ghost。
 * 编辑态：mono textarea（auto 高）+ 预览切换 + 保存本节 / 取消；⌘S 保存、Esc 取消。
 */
export default function SectionCard({
  num,
  title,
  subtitle,
  badge,
  emphasized = false,
  anchorId,
  sectionKey,
  body,
  editing,
  onStartEdit,
  onFinishEdit,
  onSaveSection,
  order,
  children,
}: {
  num: string
  title: string
  subtitle?: string
  badge?: ReactNode
  /** 硬规则卡强调样式：1.5px accent-100 边框 */
  emphasized?: boolean
  anchorId: string
  sectionKey: SectionKey
  body: string
  editing: boolean
  onStartEdit: (key: SectionKey) => void
  onFinishEdit: () => void
  /** 合并整文件并 PUT；成功返回 true */
  onSaveSection: (key: SectionKey, newBody: string) => Promise<boolean>
  /** 入场 stagger 序号（60ms 步进，最多 5 个） */
  order: number
  children: ReactNode
}) {
  const reduced = useReducedMotion()
  const [flash, setFlash] = useState(false)
  const flashTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(flashTimer.current), [])

  /** 保存成功：退出编辑 + 卡片闪青底 400ms */
  const handleSaved = () => {
    onFinishEdit()
    setFlash(true)
    flashTimer.current = window.setTimeout(() => setFlash(false), 450)
  }

  return (
    <motion.section
      id={anchorId}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: EASE_OUT, delay: Math.min(order, 4) * 0.06 }}
      className={cn(
        'scroll-mt-6 rounded-xl bg-surface shadow-e0 transition-colors duration-base',
        emphasized ? 'border-[1.5px] border-accent-100' : 'border border-border',
        flash && 'bg-accent-50',
      )}
    >
      {/* 卡头 */}
      <header className="flex items-center gap-2.5 px-5 pt-4">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-subtle text-[13px] font-semibold text-ink-2">
          {num}
        </span>
        <h2 className="text-[15px] font-semibold leading-[1.4] tracking-[-0.01em] text-ink-1">
          {title}
        </h2>
        {badge}
        {!editing && (
          <button
            type="button"
            className="btn-ghost ml-auto -mr-2 h-7 px-2 text-[12px]"
            onClick={() => onStartEdit(sectionKey)}
            aria-label={`编辑本节：${title}`}
          >
            <Pencil size={12} />
            编辑本节
          </button>
        )}
      </header>
      {subtitle && <p className="px-5 pt-1 text-[12px] text-ink-3">{subtitle}</p>}

      {editing ? (
        <SectionEditor
          title={title}
          body={body}
          onSave={async (newBody) => {
            const ok = await onSaveSection(sectionKey, newBody)
            if (ok) handleSaved()
            return ok
          }}
          onCancel={onFinishEdit}
        />
      ) : (
        <div className="px-5 pb-5 pt-3">
          {isSectionEmpty(body) ? (
            <p className="text-[13px] text-ink-3">
              <span className="text-ink-4 underline decoration-dashed underline-offset-4">待梳理</span>
              <span className="ml-2">对 AI 说「帮我梳理求职标准」开始 career-grill 流程</span>
            </p>
          ) : (
            children
          )}
        </div>
      )}
    </motion.section>
  )
}

/** 就地编辑器（独立组件：挂载即初始化草稿，退出即销毁，无需重置 effect） */
function SectionEditor({
  title,
  body,
  onSave,
  onCancel,
}: {
  title: string
  body: string
  onSave: (newBody: string) => Promise<boolean>
  onCancel: () => void
}) {
  const [draft, setDraft] = useState(body)
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)

  // textarea auto 高
  useEffect(() => {
    if (preview) return
    const ta = taRef.current
    if (!ta) return
    ta.style.height = '0px'
    ta.style.height = `${Math.max(ta.scrollHeight, 160)}px`
  }, [preview, draft])

  const dirty = draft !== body

  const doSave = async () => {
    if (saving || !dirty) return
    setSaving(true)
    const ok = await onSave(draft.replace(/^\n+|\n+$/g, ''))
    setSaving(false)
    if (ok) toast.success('CONTEXT.md 已更新')
  }

  const doCancel = () => {
    if (dirty) setConfirmCancel(true)
    else onCancel()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault()
      void doSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      doCancel()
    }
  }

  return (
    <div onKeyDown={onKeyDown}>
      <div className="px-5 pb-3 pt-3">
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            className="btn-ghost h-7 px-2 text-[12px]"
            onClick={() => setPreview((p) => !p)}
          >
            {preview ? <PencilLine size={12} /> : <Eye size={12} />}
            {preview ? '继续编辑' : '预览'}
          </button>
        </div>
        {preview ? (
          <div className="rounded-md border border-border px-4 py-3">
            <MarkdownView raw={draft} />
          </div>
        ) : (
          <textarea
            ref={taRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            aria-label={`${title} Markdown 编辑`}
            className="w-full resize-none rounded-md border border-transparent bg-subtle p-3 font-mono text-[13px] leading-[1.7] text-ink-1 outline-none transition-colors focus:border-accent-500"
          />
        )}
      </div>

      <footer className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
        <span className="mr-auto text-[12px] text-ink-3">
          {dirty ? '未保存更改' : '内容与文件一致'} · ⌘S 保存 / Esc 取消
        </span>
        <button type="button" className="btn-ghost" onClick={doCancel} disabled={saving}>
          取消
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => void doSave()}
          disabled={saving || !dirty}
          title={!dirty ? '没有改动' : undefined}
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          保存本节
        </button>
      </footer>

      <ConfirmDialog
        open={confirmCancel}
        title="更改尚未保存"
        description="放弃对本节的修改？未保存的内容不会写入 CONTEXT.md。"
        confirmLabel="放弃修改"
        tone="amber"
        onConfirm={() => {
          setConfirmCancel(false)
          onCancel()
        }}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  )
}
