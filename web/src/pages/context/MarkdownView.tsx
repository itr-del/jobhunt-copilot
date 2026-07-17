import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

/**
 * Markdown 阅读排版（design.md §7.12）：serif 15px/1.8，表格/代码用 sans/mono。
 * 用于求职标准页的分节预览与整文件编辑预览。
 */
export default function MarkdownView({ raw, className }: { raw: string; className?: string }) {
  return (
    <div className={cn('font-serif text-[15px] leading-[1.8] text-ink-1', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-3 mt-6 font-sans text-[20px] font-semibold leading-[1.3] tracking-[-0.01em] first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-3 mt-8 border-l-[3px] border-accent-500 pl-3 font-sans text-[17px] font-semibold leading-[1.4] first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-6 font-sans text-[15px] font-semibold leading-[1.4] first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-[0.9em] last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-[0.9em] list-disc pl-5 marker:text-accent-500 last:mb-0">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-[0.9em] list-decimal pl-5 marker:text-accent-500 last:mb-0">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="mb-1 last:mb-0">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="mb-[0.9em] border-l-[3px] border-strong pl-3 text-ink-2 last:mb-0">
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
          code: ({ children, className: codeClass }) => {
            const isBlock = /language-/.test(codeClass ?? '')
            if (isBlock) return <code className="font-mono text-[12.5px]">{children}</code>
            return (
              <code className="rounded-sm bg-subtle px-[5px] py-px font-mono text-[12.5px] text-ink-1">
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="mb-[0.9em] overflow-x-auto rounded-md bg-subtle p-3 font-sans last:mb-0">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="mb-[0.9em] overflow-x-auto font-sans last:mb-0">
              <table className="w-full border-collapse text-[13px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-subtle">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-border px-3 py-2 text-left font-medium text-ink-2">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border px-3 py-2 align-top">{children}</td>
          ),
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        }}
      >
        {raw}
      </ReactMarkdown>
    </div>
  )
}
