import { motion, useReducedMotion } from 'framer-motion'
import { Copy, FileDown, PencilLine, Unlock } from 'lucide-react'
import { toast } from 'sonner'
import PathChip from '@/pages/context/PathChip'
import { copyText } from '@/pages/context/copy'
import ResumePaper from '@/pages/strategy/ResumePaper'
import { useHealth } from '@/hooks/useHealth'

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

/**
 * Tab 2 · 对外主简历（strategy.md S4/S5）：工具条 + 纸面预览。
 * 编辑由 Strategy 页切换到 SplitEditor（编辑简历按钮回调 onEdit）。
 */
export default function MasterTab({
  raw,
  onEdit,
}: {
  raw: string
  onEdit: () => void
}) {
  const reduced = useReducedMotion()
  const health = useHealth()

  const onCopyMarkdown = async () => {
    const ok = await copyText(raw)
    if (ok) toast.success('已复制 Markdown 原文')
    else toast.error('复制失败，请手动选择复制')
  }

  const onExportPdf = () => {
    if (health?.mode === 'demo') {
      toast.info('演示模式：PDF 导出在真实工作区可用')
      return
    }
    window.print()
  }

  return (
    <div className="flex flex-col gap-4">
      {/* S4 工具条 */}
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: EASE_OUT }}
        className="flex min-h-11 flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-2 shadow-e0"
      >
        <span className="flex items-center gap-1.5 text-[12px] text-accent-ink">
          <Unlock size={12} />
          对外文件 · 可外发
        </span>
        <PathChip path="01-profile/master-resume.md" />
        <div className="ml-auto flex items-center gap-1.5">
          <button type="button" className="btn-ghost" onClick={() => void onCopyMarkdown()}>
            <Copy size={13} />
            复制 Markdown
          </button>
          <button type="button" className="btn-secondary" onClick={onExportPdf}>
            <FileDown size={13} />
            导出 PDF
          </button>
          <button type="button" className="btn-primary" onClick={onEdit}>
            <PencilLine size={13} />
            编辑简历
          </button>
        </div>
      </motion.div>

      {/* S5 纸面预览：细点纹理背景 + 居中纸卡 */}
      <div
        className="rounded-xl py-8"
        style={{
          backgroundImage:
            'radial-gradient(color-mix(in srgb, var(--ink-4) 35%, transparent) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
          className="mx-auto w-full max-w-[760px] rounded-[10px] border border-border bg-surface px-14 py-12 shadow-e1"
        >
          <ResumePaper raw={raw} />
        </motion.div>
      </div>
    </div>
  )
}
