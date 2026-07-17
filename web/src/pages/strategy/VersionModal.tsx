import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Copy, Download, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { ResumeMeta } from '@/lib/api'
import { copyText } from '@/pages/context/copy'
import ResumePaper from '@/pages/strategy/ResumePaper'

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

/** 去掉 markdown 装饰后的可比行（用于与主简历的行级对比） */
function comparableLines(raw: string): string[] {
  return raw
    .split('\n')
    .map((l) => l.trim().replace(/^#{1,6}\s*/, '').replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, ''))
    .filter((l) => l && !l.startsWith('>') && !/^\|?[\s:-]+\|?$/.test(l))
}

/** 版本文件头部的版本说明（> 引用行） */
function headerNotes(raw: string): string[] {
  const notes: string[] = []
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (t.startsWith('>')) {
      notes.push(t.replace(/^>\s?/, ''))
      continue
    }
    if (t === '' || t.startsWith('#') || t.startsWith('<!--') || t.endsWith('-->')) {
      if (notes.length) break
      continue
    }
    if (notes.length) break
  }
  return notes
}

/**
 * S9 版本预览弹窗（宽 720px，高 80vh，双区）：
 * 左 60% 该版本纸面渲染；右 40% 版本说明 + 与主简历的行级差异（真实计算）。
 */
export default function VersionModal({
  meta,
  masterRaw,
  onClose,
}: {
  meta: ResumeMeta | null
  masterRaw: string | null
  onClose: () => void
}) {
  const reduced = useReducedMotion()
  // 异步加载结果按文件名记账；raw/error 由 meta.file 派生（避免在 effect 里同步 setState）
  const [loaded, setLoaded] = useState<{ file: string; raw: string } | null>(null)
  const [loadErr, setLoadErr] = useState<{ file: string; msg: string } | null>(null)

  useEffect(() => {
    if (!meta) return
    let alive = true
    const file = meta.file
    api.getResume(file).then(
      (r) => {
        if (alive) setLoaded({ file, raw: r.raw })
      },
      (e: unknown) => {
        if (!alive) return
        const msg = e instanceof Error ? e.message : '未知错误'
        setLoadErr({ file, msg })
        toast.error(`版本加载失败：${msg}`)
      },
    )
    return () => {
      alive = false
    }
  }, [meta])

  const raw = meta && loaded?.file === meta.file ? loaded.raw : null
  const error = meta && loadErr?.file === meta.file ? loadErr.msg : null

  useEffect(() => {
    if (!meta) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [meta, onClose])

  const diff = useMemo(() => {
    if (!raw || !masterRaw) return null
    const masterSet = new Set(comparableLines(masterRaw))
    const versionSet = new Set(comparableLines(raw))
    const added = [...versionSet].filter((l) => !masterSet.has(l))
    const removed = [...masterSet].filter((l) => !versionSet.has(l))
    return { added, removed }
  }, [raw, masterRaw])

  const notes = useMemo(() => (raw ? headerNotes(raw) : []), [raw])

  const onCopyAll = async () => {
    if (!raw) return
    const ok = await copyText(raw)
    if (ok) toast.success('已复制全文')
    else toast.error('复制失败')
  }

  const onDownload = () => {
    if (!raw || !meta) return
    const blob = new Blob([raw], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = meta.file
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AnimatePresence>
      {meta && (
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
            aria-label={`预览 ${meta.file}`}
            className="relative flex h-[80vh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-e3"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }}
          >
            {/* 头部 */}
            <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
              <span className="truncate font-mono text-[12.5px] text-ink-1">{meta.file}</span>
              <button type="button" className="btn-icon ml-auto" onClick={onClose} aria-label="关闭">
                <X size={16} />
              </button>
            </div>

            {/* 双区 */}
            <div className="flex min-h-0 flex-1">
              {/* 左 60%：版本渲染 */}
              <motion.div
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
                transition={{ duration: 0.24, ease: EASE_OUT, delay: 0.05 }}
                className="min-w-0 flex-[3] overflow-y-auto border-r border-border p-6"
              >
                {raw == null && !error && (
                  <div className="flex h-full items-center justify-center text-ink-3">
                    <Loader2 size={18} className="animate-spin" />
                  </div>
                )}
                {error && <p className="text-[13px] text-ink-3">加载失败：{error}</p>}
                {raw != null && <ResumePaper raw={raw} compact />}
              </motion.div>

              {/* 右 40%：与主简历的差异 */}
              <motion.aside
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
                transition={{ duration: 0.24, ease: EASE_OUT, delay: 0.13 }}
                className="flex min-h-0 flex-[2] flex-col gap-3 overflow-y-auto bg-subtle p-5"
              >
                <h4 className="text-[12px] font-semibold text-ink-1">与主简历的差异</h4>

                {notes.length > 0 && (
                  <ul className="flex flex-col gap-1.5">
                    {notes.map((n, i) => (
                      <motion.li
                        key={i}
                        initial={reduced ? { opacity: 0 } : { opacity: 0, x: 6 }}
                        animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0 }}
                        transition={{ duration: 0.18, delay: 0.15 + i * 0.04 }}
                        className="text-[12.5px] leading-[1.6] text-ink-2"
                      >
                        {n}
                      </motion.li>
                    ))}
                  </ul>
                )}

                {diff && (
                  <div className="flex flex-col gap-1.5">
                    <p className="tnum font-mono text-[11px] text-ink-3">
                      +{diff.added.length} 行新增/改写 · -{diff.removed.length} 行删减
                    </p>
                    <ul className="flex max-h-[220px] flex-col gap-1 overflow-y-auto">
                      {diff.added.slice(0, 6).map((l, i) => (
                        <li
                          key={`a${i}`}
                          className="truncate font-mono text-[11px] text-accent-ink"
                          title={l}
                        >
                          + {l}
                        </li>
                      ))}
                      {diff.removed.slice(0, 6).map((l, i) => (
                        <li
                          key={`r${i}`}
                          className="truncate font-mono text-[11px] text-ink-3 line-through"
                          title={l}
                        >
                          - {l}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="mt-auto rounded-md border border-amber-border bg-amber-50 px-2.5 py-2 text-[12px] leading-[1.6] text-amber-600">
                  外发前请逐句核对——AI 只重组真实经历，但数字与表述以你确认为准。
                </p>
              </motion.aside>
            </div>

            {/* 底部按钮 */}
            <div className="flex h-14 shrink-0 items-center justify-end gap-2 border-t border-border px-4">
              <button type="button" className="btn-secondary" onClick={onDownload} disabled={!raw}>
                <Download size={13} />
                下载 .md
              </button>
              <button type="button" className="btn-primary" onClick={() => void onCopyAll()} disabled={!raw}>
                <Copy size={13} />
                复制全文
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
