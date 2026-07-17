import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

/**
 * 简历纸面预览（strategy.md S5）：MarkdownView 简历变体。
 * - h1 20px/650 sans 左对齐；h2 14px/600 sans + 全宽下边框（scaleX 入场 stagger）；
 * - 正文 serif 14px/1.75。
 * compact：预览弹窗左栏缩小版。
 */
export default function ResumePaper({ raw, compact = false }: { raw: string; compact?: boolean }) {
  const reduced = useReducedMotion()

  const components = useMemo(() => {
    let h2Index = 0
    return {
      h1: ({ children }: { children?: React.ReactNode }) => (
        <h1
          className={cn(
            'mb-4 font-sans font-semibold leading-[1.3] tracking-[-0.01em] text-ink-1',
            compact ? 'text-[17px]' : 'text-[20px]',
          )}
        >
          {children}
        </h1>
      ),
      h2: ({ children }: { children?: React.ReactNode }) => {
        const delay = 0.15 + h2Index++ * 0.06
        return (
          <h2
            className={cn(
              'mb-2 mt-5 font-sans font-semibold text-ink-1 first:mt-0',
              compact ? 'text-[12.5px]' : 'text-[14px]',
            )}
          >
            {children}
            <motion.span
              aria-hidden
              className="mt-1.5 block h-px w-full bg-border"
              initial={reduced ? { opacity: 0 } : { scaleX: 0 }}
              animate={reduced ? { opacity: 1 } : { scaleX: 1 }}
              style={{ transformOrigin: 'left' }}
              transition={{ duration: 0.4, ease: EASE_OUT, delay }}
            />
          </h2>
        )
      },
      h3: ({ children }: { children?: React.ReactNode }) => (
        <h3
          className={cn(
            'mb-1 mt-4 font-sans font-semibold text-ink-1 first:mt-0',
            compact ? 'text-[12.5px]' : 'text-[14px]',
          )}
        >
          {children}
        </h3>
      ),
      p: ({ children }: { children?: React.ReactNode }) => (
        <p className="mb-[0.8em] last:mb-0">{children}</p>
      ),
      ul: ({ children }: { children?: React.ReactNode }) => (
        <ul className="mb-[0.8em] list-disc pl-5 marker:text-accent-500 last:mb-0">{children}</ul>
      ),
      ol: ({ children }: { children?: React.ReactNode }) => (
        <ol className="mb-[0.8em] list-decimal pl-5 marker:text-accent-500 last:mb-0">{children}</ol>
      ),
      li: ({ children }: { children?: React.ReactNode }) => (
        <li className="mb-1 last:mb-0">{children}</li>
      ),
      blockquote: ({ children }: { children?: React.ReactNode }) => (
        <blockquote className="mb-[0.8em] border-l-[3px] border-strong pl-3 text-ink-2 last:mb-0">
          {children}
        </blockquote>
      ),
      hr: () => <hr className="my-5 border-border" />,
      code: ({ children }: { children?: React.ReactNode }) => (
        <code className="rounded-sm bg-subtle px-[5px] py-px font-mono text-[12px]">{children}</code>
      ),
      strong: ({ children }: { children?: React.ReactNode }) => (
        <strong className="font-semibold">{children}</strong>
      ),
      table: ({ children }: { children?: React.ReactNode }) => (
        <table className="mb-[0.8em] w-full border-collapse font-sans text-[12.5px]">{children}</table>
      ),
      th: ({ children }: { children?: React.ReactNode }) => (
        <th className="border-b border-border bg-subtle px-2.5 py-1.5 text-left font-medium">{children}</th>
      ),
      td: ({ children }: { children?: React.ReactNode }) => (
        <td className="border-b border-border px-2.5 py-1.5 align-top">{children}</td>
      ),
    }
  }, [compact, reduced])

  return (
    <div
      className={cn(
        'font-serif text-ink-1',
        compact ? 'text-[12.5px] leading-[1.7]' : 'text-[14px] leading-[1.75]',
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {raw}
      </ReactMarkdown>
    </div>
  )
}
