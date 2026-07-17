import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/pages/context/ConfirmDialog'
import MarkdownView from '@/pages/context/MarkdownView'
import { hardRulesCleared } from '@/pages/context/parse'
import { cn } from '@/lib/utils'

const DRAFT_KEY = 'jh-context-draft-full'

type ViewMode = 'split' | 'edit' | 'preview'
const VIEW_LABEL: Record<ViewMode, string> = { split: '分屏', edit: '仅编辑', preview: '预览' }

/**
 * 全部编辑：整文件 SplitEditor（design.md §7.13 + context.md S9）。
 * 左 Markdown 右实时预览，4px 拖动条调比例；⌘S 保存；未保存关闭弹确认；
 * 清空第三节硬规则 → danger 确认；草稿写 localStorage，崩溃可恢复。
 */
export default function FullEditor({
  initialRaw,
  onSave,
  onClose,
}: {
  initialRaw: string
  onSave: (raw: string) => Promise<boolean>
  onClose: () => void
}) {
  // 恢复上次未保存草稿（context.md「空态与异常」）：惰性初始化，挂载只读一次
  const [restoredDraft] = useState(() => {
    const saved = window.localStorage.getItem(DRAFT_KEY)
    return saved && saved !== initialRaw ? saved : null
  })
  const [draft, setDraft] = useState(restoredDraft ?? initialRaw)
  const [mode, setMode] = useState<ViewMode>('split')
  const [ratio, setRatio] = useState(0.5)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)
  const [confirmClearRules, setConfirmClearRules] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (restoredDraft != null) toast.info('已恢复上次未保存的草稿')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 草稿随改随存
  useEffect(() => {
    if (draft !== initialRaw) window.localStorage.setItem(DRAFT_KEY, draft)
    else window.localStorage.removeItem(DRAFT_KEY)
  }, [draft, initialRaw])

  const dirty = draft !== initialRaw

  const doSave = useCallback(async () => {
    if (saving) return
    setSaving(true)
    const ok = await onSave(draft)
    setSaving(false)
    if (!ok) return // 失败 Toast 由页面统一抛
    window.localStorage.removeItem(DRAFT_KEY)
    setSavedAt(
      new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    )
    toast.success('CONTEXT.md 已更新')
  }, [draft, saving, onSave])

  const requestSave = useCallback(() => {
    if (!dirty || saving) return
    if (hardRulesCleared(draft)) setConfirmClearRules(true)
    else void doSave()
  }, [dirty, saving, draft, doSave])

  const requestClose = useCallback(() => {
    if (dirty) setConfirmClose(true)
    else onClose()
  }, [dirty, onClose])

  // ⌘S / Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        requestSave()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        requestClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [requestSave, requestClose])

  // 拖动分隔条
  const onDividerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const move = (ev: PointerEvent) => {
      const r = (ev.clientX - rect.left) / rect.width
      setRatio(Math.min(0.75, Math.max(0.25, r)))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      document.body.style.userSelect = ''
    }
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div className="card-base flex h-[calc(100dvh-170px)] min-h-[420px] flex-col overflow-hidden">
      {/* 工具条 */}
      <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border px-3">
        <span className="flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-[12px] font-medium text-amber-600">
          <Lock size={12} />
          编辑的是唯一事实源，保存即生效
        </span>

        <div className="ml-auto flex items-center gap-1 rounded-md bg-subtle p-0.5">
          {(Object.keys(VIEW_LABEL) as ViewMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'relative h-6 rounded-[5px] px-2 text-[12px] transition-colors duration-fast',
                mode === m ? 'text-ink-1' : 'text-ink-3 hover:text-ink-1',
              )}
            >
              {mode === m && (
                <motion.span
                  layoutId="full-editor-mode"
                  className="absolute inset-0 rounded-[5px] bg-surface shadow-e0"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative">{VIEW_LABEL[m]}</span>
            </button>
          ))}
        </div>

        <span className="tnum font-mono text-[12px] text-ink-3">{draft.length} 字</span>
        <span className="flex items-center gap-1 text-[12px] text-ink-3">
          <span
            className={cn('h-1.5 w-1.5 rounded-full', dirty ? 'bg-amber-500' : 'bg-[#16A34A]')}
          />
          {dirty ? '未保存更改' : savedAt ? `已保存 ${savedAt}` : '与文件一致'}
        </span>
        <button type="button" className="btn-ghost" onClick={requestClose} disabled={saving}>
          关闭
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={requestSave}
          disabled={!dirty || saving}
          title={!dirty ? '没有改动' : undefined}
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          保存
        </button>
      </div>

      {/* 双栏 */}
      <div ref={containerRef} className="flex min-h-0 flex-1">
        {mode !== 'preview' && (
          <div
            className="min-w-0"
            style={mode === 'split' ? { flexBasis: `${ratio * 100}%` } : { flex: 1 }}
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              spellCheck={false}
              aria-label="CONTEXT.md 整文件编辑"
              className="h-full w-full resize-none bg-subtle p-4 font-mono text-[13px] leading-[1.7] text-ink-1 outline-none"
            />
          </div>
        )}
        {mode === 'split' && (
          <div
            role="separator"
            aria-orientation="vertical"
            onPointerDown={onDividerDown}
            className="w-1 shrink-0 cursor-col-resize bg-border transition-colors hover:bg-accent-500"
          />
        )}
        {mode !== 'edit' && (
          <div className="min-w-0 flex-1 overflow-y-auto p-5">
            <MarkdownView raw={draft} className="mx-auto max-w-reading" />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmClose}
        title="更改尚未保存"
        description="关闭编辑器将丢弃未保存的修改。"
        confirmLabel="丢弃并关闭"
        tone="amber"
        onConfirm={() => {
          window.localStorage.removeItem(DRAFT_KEY)
          setConfirmClose(false)
          onClose()
        }}
        onCancel={() => setConfirmClose(false)}
      />
      <ConfirmDialog
        open={confirmClearRules}
        title="清空「筛选硬规则」？"
        description="清空「筛选硬规则」后，AI 会停止一切筛选评估（红线 3）。确定清空？"
        confirmLabel="确定清空"
        tone="danger"
        loading={saving}
        onConfirm={() => {
          setConfirmClearRules(false)
          void doSave()
        }}
        onCancel={() => setConfirmClearRules(false)}
      />
    </div>
  )
}
