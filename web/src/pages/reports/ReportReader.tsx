import { motion, useReducedMotion } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight, Copy, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import type { ReportMeta } from '@/lib/api'
import MarkdownView from './MarkdownView'
import { cn } from '@/lib/utils'

/**
 * S2 · 右栏：阅读视图（reports.md）
 * 文首头（类型徽标 + 标题 / 路径 chip + 前后导航 + 字号切换）+ MarkdownView（serif 15px/1.8）。
 * 换篇时正文 200ms 淡出 → 新内容块级 stagger 淡入（由 MarkdownView 的 content key 驱动）。
 */

const FONT_SIZES = [
  { label: 'A-', value: 14 },
  { label: 'A', value: 15 },
  { label: 'A+', value: 16 },
] as const

/** 路径 chip：mono 12px + copy 图标（复制路径文本） */
export function PathChip({ path }: { path: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(path)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // 剪贴板不可用（非安全上下文）时静默
    }
  }
  return (
    <span className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-md bg-subtle px-2 font-mono text-[12px] text-ink-2">
      <span className="truncate">{path}</span>
      <button
        type="button"
        onClick={copy}
        aria-label="复制路径"
        className="shrink-0 rounded p-0.5 text-ink-3 transition-colors duration-instant hover:text-ink-1"
      >
        {copied ? <Check size={13} className="text-accent-500" /> : <Copy size={13} />}
      </button>
    </span>
  )
}

function ReaderSkeleton() {
  return (
    <div className="px-10 pb-16 pt-8" aria-label="加载中">
      <div className="mx-auto max-w-reading">
        <div className="animate-breathe mb-6 h-7 w-56 rounded-md bg-subtle" />
        {[0.9, 1, 0.96, 0.6, 1, 0.88, 0.75].map((w, i) => (
          <div
            key={i}
            className="animate-breathe mb-3 h-4 rounded-md bg-subtle"
            style={{ width: `${w * 100}%` }}
          />
        ))}
      </div>
    </div>
  )
}

export default function ReportReader({
  meta,
  raw,
  error,
  onRetry,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  fontSize,
  onFontSizeChange,
}: {
  meta: ReportMeta
  /** undefined = 加载中 */
  raw: string | undefined
  error: string | null
  onRetry: () => void
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
  fontSize: number
  onFontSizeChange: (size: number) => void
}) {
  const reduced = useReducedMotion()

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 文首头（下边框 1px） */}
      <div className="shrink-0 border-b border-border px-10 pb-4 pt-6">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              'shrink-0 rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium leading-[1.5]',
              meta.type === 'daily'
                ? 'bg-accent-100 text-accent-ink'
                : 'bg-[#F1ECFD] text-[#7C3AED] dark:bg-[#7C3AED24] dark:text-[#A375F2]',
            )}
          >
            {meta.type === 'daily' ? '日报' : '周报'}
          </span>
          <h2 className="truncate font-sans text-[20px] font-semibold leading-[1.3] tracking-[-0.01em] text-ink-1">
            {meta.title}
          </h2>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <PathChip path={`runtime/reports/${meta.file}`} />
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onPrev}
              disabled={!hasPrev}
              title={hasPrev ? '前一天' : '已经是最早一篇'}
              className="btn-ghost h-7 px-2 text-[12px]"
            >
              <ChevronLeft size={13} aria-hidden />
              前一天
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              title={hasNext ? '后一天' : '已经是最新一篇'}
              className="btn-ghost h-7 px-2 text-[12px]"
            >
              后一天
              <ChevronRight size={13} aria-hidden />
            </button>
            {/* 字号切换（仅本视图生效） */}
            <div className="ml-2 flex items-center rounded-md border border-border p-0.5">
              {FONT_SIZES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => onFontSizeChange(s.value)}
                  aria-pressed={fontSize === s.value}
                  title={`正文字号 ${s.value}px`}
                  className={cn(
                    'h-6 rounded-[4px] px-1.5 font-sans text-[12px] transition-colors duration-instant',
                    fontSize === s.value
                      ? 'bg-subtle font-semibold text-ink-1'
                      : 'text-ink-3 hover:text-ink-1',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 正文（右栏独立滚动） */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {error ? (
          <div className="px-10 py-8">
            <div className="flex items-center gap-3 rounded-lg border border-[#BE123C33] bg-[#FBE9ED] px-4 py-3 dark:bg-[#BE123C14]">
              <p className="text-[13px] text-[#BE123C] dark:text-[#D25976]">加载失败：{error}</p>
              <button
                type="button"
                onClick={onRetry}
                className="btn-secondary ml-auto h-7 px-2.5 text-[12px]"
              >
                <RefreshCw size={13} aria-hidden />
                重试
              </button>
            </div>
          </div>
        ) : raw === undefined ? (
          <ReaderSkeleton />
        ) : (
          <motion.div
            key={meta.file}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="px-10 pb-16 pt-6"
          >
            <MarkdownView content={raw} fontSize={fontSize} />
          </motion.div>
        )}
      </div>
    </div>
  )
}
