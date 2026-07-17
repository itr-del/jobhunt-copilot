import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import MarkdownView from '@/pages/reports/MarkdownView'
import { cn } from '@/lib/utils'
import { parseStatus } from './interviewUtils'

/**
 * S6 · 编辑模式（interviews.md + design.md §7.13 SplitEditor）：
 * 左 mono 编辑区 / 右实时预览；预览-分屏-仅编辑三态；4px 拖动条调比例（默认 1:1）；
 * 顶栏：字数统计 + 保存状态（未保存更改琥珀点 / 已保存 HH:MM:SS）+ 保存 Primary + 取消 Ghost。
 * 保存：PUT /api/interviews/:file → Toast「档案已保存」；状态字段修改时显示台账联动提示。
 */

type EditorMode = 'split' | 'preview' | 'edit'

const MODES: { key: EditorMode; label: string }[] = [
  { key: 'preview', label: '预览' },
  { key: 'split', label: '分屏' },
  { key: 'edit', label: '仅编辑' },
]

export default function ArchiveEditor({
  file,
  initialRaw,
  /** 关联岗位 id（状态改动联动台账提示用），可空 */
  jobId,
  height,
  onSaved,
  onCancel,
  onDirtyChange,
}: {
  file: string
  initialRaw: string
  jobId?: string
  height: string
  onSaved: (raw: string) => void
  onCancel: () => void
  onDirtyChange: (dirty: boolean) => void
}) {
  const reduced = useReducedMotion()
  const [draft, setDraft] = useState(initialRaw)
  const [preview, setPreview] = useState(initialRaw)
  const [mode, setMode] = useState<EditorMode>('split')
  const [ratio, setRatio] = useState(0.5)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [flash, setFlash] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const flashTimer = useRef<number | undefined>(undefined)

  const dirty = draft !== initialRaw

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])

  /** 预览 300ms 防抖 */
  useEffect(() => {
    const t = window.setTimeout(() => setPreview(draft), 300)
    return () => window.clearTimeout(t)
  }, [draft])

  useEffect(() => () => window.clearTimeout(flashTimer.current), [])

  const save = useCallback(async () => {
    if (saving || !dirty) return
    setSaving(true)
    try {
      await api.putInterview(file, draft)
      const now = new Date()
      setSavedAt(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`,
      )
      setFlash(true)
      window.clearTimeout(flashTimer.current)
      flashTimer.current = window.setTimeout(() => setFlash(false), 400)
      toast.success('档案已保存')
      onSaved(draft)
    } catch (e) {
      toast.error(`保存失败：${e instanceof Error ? e.message : '未知错误'}`)
    } finally {
      setSaving(false)
    }
  }, [saving, dirty, file, draft, onSaved])

  /** ⌘S / Ctrl+S 保存 */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void save()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [save])

  /** 拖动条：4px 宽，左右拖拽调配比（0.25 ~ 0.75） */
  const startDrag = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const onMove = (ev: PointerEvent) => {
      const next = (ev.clientX - rect.left) / rect.width
      setRatio(Math.min(0.75, Math.max(0.25, next)))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [])

  const statusChanged = parseStatus(draft) !== parseStatus(initialRaw)

  const editorPane = (
    <textarea
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      aria-label="档案 Markdown 编辑区"
      spellCheck={false}
      className="h-full w-full resize-none bg-subtle p-4 font-mono text-[13px] leading-[1.7] text-ink-1 outline-none placeholder:text-ink-4"
      placeholder="# 面试档案"
    />
  )
  const previewPane = (
    <div className="h-full overflow-y-auto px-6 py-4">
      <MarkdownView content={preview} stagger={false} className="max-w-none" />
    </div>
  )

  return (
    <div className="card-base flex flex-col overflow-hidden" style={{ height }}>
      {/* 顶栏工具条 */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
        <div className="flex items-center rounded-md border border-border p-0.5">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              aria-pressed={mode === m.key}
              className={cn(
                'h-6 rounded-[4px] px-2 text-[12px] transition-colors duration-fast',
                mode === m.key ? 'bg-subtle font-semibold text-ink-1' : 'text-ink-3 hover:text-ink-1',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* 状态改动联动台账提示（琥珀） */}
        {statusChanged && jobId && (
          <span className="ml-1 flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-[12px] text-amber-600">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            状态改动会同步台账 <span className="font-mono">{jobId}</span>
          </span>
        )}

        <span className="tnum ml-auto font-mono text-[12px] text-ink-3">共 {draft.length} 字</span>

        {/* 保存状态点 */}
        <span className="flex items-center gap-1.5 text-[12px] text-ink-3">
          <motion.span
            className={cn(
              'h-2 w-2 rounded-full',
              dirty ? 'bg-amber-500' : savedAt ? 'bg-[#16A34A]' : 'bg-ink-4',
            )}
            animate={flash && !reduced ? { scale: [1, 1.6, 1] } : { scale: 1 }}
            transition={{ duration: 0.4 }}
          />
          {dirty ? '未保存更改' : savedAt ? `已保存 ${savedAt}` : '无更改'}
        </span>

        <button type="button" className="btn-ghost" onClick={onCancel}>
          取消
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => void save()}
          disabled={saving || !dirty}
          title={!dirty ? '没有需要保存的更改' : '保存（⌘S）'}
        >
          {saving ? '保存中…' : '保存'}
        </button>
      </div>

      {/* 编辑 / 预览（栏切换 160ms 交叉淡入） */}
      <motion.div
        key={mode}
        ref={containerRef}
        className="flex min-h-0 flex-1"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.16 }}
      >
        {mode !== 'preview' && (
          <div className="min-w-0" style={mode === 'split' ? { width: `${ratio * 100}%` } : { flex: 1 }}>
            {editorPane}
          </div>
        )}
        {mode === 'split' && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="调整编辑与预览比例"
            onPointerDown={startDrag}
            className="w-1 shrink-0 cursor-col-resize bg-border transition-colors duration-instant hover:bg-accent-500"
          />
        )}
        {mode !== 'edit' && <div className="min-w-0 flex-1">{previewPane}</div>}
      </motion.div>
    </div>
  )
}
