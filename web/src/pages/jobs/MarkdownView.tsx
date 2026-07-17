import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion, useReducedMotion } from 'framer-motion'

/**
 * Markdown 阅读排版（design.md §7.12）：serif 15px/1.8 容器，
 * h2 左侧 3px 青色竖条、代码/路径 mono 内嵌、表格 13px sans。
 * 供岗位抽屉「JD 原文」使用。
 */

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

export default function MarkdownView({ raw }: { raw: string }) {
  const reduced = useReducedMotion()
  const content = useMemo(
    () => (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-3 mt-6 font-sans text-[20px] font-semibold leading-[1.3] tracking-[-0.01em] text-ink-1 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2.5 mt-8 flex items-center gap-2 font-sans text-[17px] font-semibold leading-[1.4] text-ink-1 first:mt-0">
              <span aria-hidden className="h-4 w-[3px] shrink-0 rounded-full bg-accent-500" />
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-6 font-sans text-[15px] font-semibold leading-[1.4] text-ink-1 first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="my-[0.9em] first:mt-0 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="my-[0.9em] list-disc space-y-1 pl-5 marker:text-accent-500">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-[0.9em] list-decimal space-y-1 pl-5 marker:text-ink-3">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-[1.8]">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-[0.9em] border-l-[3px] border-strong pl-4 text-ink-2">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-6 border-border" />,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-accent-500 hover:underline"
            >
              {children}
            </a>
          ),
          code: ({ children, className }) => {
            const isBlock = /language-/.test(className ?? '')
            if (isBlock) return <code className="font-mono text-[12.5px]">{children}</code>
            return (
              <code className="rounded-sm bg-subtle px-[5px] py-px font-mono text-[12.5px] text-ink-1">
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="my-[0.9em] overflow-x-auto rounded-lg bg-subtle p-4 font-mono text-[12.5px] leading-[1.7]">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="my-[0.9em] overflow-x-auto">
              <table className="w-full border-collapse font-sans text-[13px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-subtle">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-border px-3 py-2 text-left text-[13px] font-medium text-ink-1">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border px-3 py-2 align-top text-ink-2">{children}</td>
          ),
          strong: ({ children }) => <strong className="font-semibold text-ink-1">{children}</strong>,
        }}
      >
        {raw}
      </ReactMarkdown>
    ),
    [raw],
  )

  return (
    <motion.div
      className="max-w-reading font-serif text-reading text-ink-1"
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0.12 : 0.24, ease: EASE_OUT }}
    >
      {content}
    </motion.div>
  )
}
