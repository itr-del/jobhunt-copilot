import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]
const STAGGER_GAP = 0.025
const STAGGER_CAP = 0.4

/**
 * Markdown 阅读排版（design.md §7.12，全站统一，reports / interviews 共用）
 * 容器 max-width 680px，serif 15px/1.8（表格、代码、标签用 sans/mono）。
 * 进入/换篇时正文块级 stagger：每块 opacity 0→1、y 6px→0，间隔 25ms，封顶 400ms。
 * prefers-reduced-motion：关闭位移动画（直接显示终值）。
 */

type BlockMotionProps = {
  initial?: { opacity: number; y: number }
  animate?: { opacity: number; y: number }
  transition?: { duration: number; ease: [number, number, number, number]; delay: number }
}

/**
 * 生成一份 components 映射（内容变化时重建，react-markdown 子树重挂载，重播 stagger）。
 * 计数器在闭包内，按文档顺序发放 delay，封顶 400ms。
 */
function makeComponents(reduced: boolean, stagger: boolean): Components {
  let index = 0
  const anim = (): BlockMotionProps => {
    if (reduced || !stagger) return {}
    const delay = Math.min(index * STAGGER_GAP, STAGGER_CAP)
    index += 1
    return {
      initial: { opacity: 0, y: 6 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.2, ease: EASE_OUT, delay },
    }
  }

  return {
    h1: ({ children }) => (
      <motion.h1
        {...anim()}
        className="mt-6 font-sans text-[20px] font-semibold leading-[1.3] tracking-[-0.01em] text-ink-1 first:mt-0"
      >
        {children}
      </motion.h1>
    ),
    h2: ({ children }) => (
      <motion.h2
        {...anim()}
        className="mt-8 flex items-center gap-2 font-sans text-[17px] font-semibold leading-[1.4] text-ink-1"
      >
        <span aria-hidden className="h-4 w-[3px] shrink-0 rounded-full bg-accent-500" />
        <span>{children}</span>
      </motion.h2>
    ),
    h3: ({ children }) => (
      <motion.h3
        {...anim()}
        className="mt-6 font-sans text-[15px] font-semibold leading-[1.4] text-ink-1"
      >
        {children}
      </motion.h3>
    ),
    h4: ({ children }) => (
      <motion.h4
        {...anim()}
        className="mt-5 font-sans text-[14px] font-semibold leading-[1.5] text-ink-1"
      >
        {children}
      </motion.h4>
    ),
    p: ({ children }) => (
      <motion.p {...anim()} className="my-[0.9em] first:mt-0 last:mb-0">
        {children}
      </motion.p>
    ),
    ul: ({ children }) => (
      <motion.ul {...anim()} className="my-[0.9em] list-disc space-y-1 pl-5 marker:text-accent-500">
        {children}
      </motion.ul>
    ),
    ol: ({ children }) => (
      <motion.ol
        {...anim()}
        className="my-[0.9em] list-decimal space-y-1 pl-5 marker:font-mono marker:text-ink-3"
      >
        {children}
      </motion.ol>
    ),
    li: ({ children }) => (
      <li className="pl-0.5 [&>input[type='checkbox']]:mr-1.5 [&>input[type='checkbox']]:h-3.5 [&>input[type='checkbox']]:w-3.5 [&>input[type='checkbox']]:translate-y-[1.5px] [&>input[type='checkbox']]:accent-[#0D7377]">
        {children}
      </li>
    ),
    blockquote: ({ children }) => (
      <motion.blockquote
        {...anim()}
        className="my-4 border-l-[3px] border-strong pl-3 text-ink-2 [&>p]:my-1"
      >
        {children}
      </motion.blockquote>
    ),
    hr: () => <motion.hr {...anim()} className="my-6 border-border" />,
    a: ({ href, children }) => {
      const external = /^https?:\/\//.test(href ?? '')
      return (
        <a
          href={href}
          target={external ? '_blank' : undefined}
          rel={external ? 'noreferrer' : undefined}
          className="text-accent-500 underline-offset-2 transition-colors duration-instant hover:text-accent-600 hover:underline"
        >
          {children}
          {external && (
            <span aria-hidden className="ml-0.5 text-[12px]">
              ↗
            </span>
          )}
        </a>
      )
    },
    code: ({ className, children }) => (
      <code
        className={cn(
          'rounded-sm bg-subtle px-[5px] py-px font-mono text-[12.5px] text-ink-1',
          className,
        )}
      >
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <motion.pre
        {...anim()}
        className="my-4 overflow-x-auto rounded-lg bg-subtle p-3 font-mono text-[12.5px] leading-[1.7] [&_code]:bg-transparent [&_code]:p-0"
      >
        {children}
      </motion.pre>
    ),
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto">
        <motion.table
          {...anim()}
          className="w-full border-collapse font-sans text-[13px] leading-[1.5]"
        >
          {children}
        </motion.table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-subtle">{children}</thead>,
    th: ({ children }) => (
      <th className="border-b border-border px-3 py-2 text-left font-medium text-ink-2">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border-b border-border px-3 py-2 align-top text-ink-1">{children}</td>
    ),
    tr: ({ children }) => (
      <tr className="transition-colors duration-instant hover:bg-accent-50/50">{children}</tr>
    ),
    strong: ({ children }) => <strong className="font-semibold text-ink-1">{children}</strong>,
    img: ({ src, alt }) => (
      <img src={src} alt={alt ?? ''} className="my-4 max-w-full rounded-lg border border-border" />
    ),
  }
}

export default function MarkdownView({
  content,
  /** 正文字号（px），默认 15（text-reading）；表格/代码/标题字号固定 */
  fontSize = 15,
  /** 块级 stagger 入场（换篇/进入时）；编辑器预览等场景关闭 */
  stagger = true,
  className,
}: {
  content: string
  fontSize?: number
  stagger?: boolean
  className?: string
}) {
  const reduced = useReducedMotion()
  // content 变化 → 重建 components → 子树重挂载 → 重播块级 stagger（换篇动画）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const components = useMemo(() => makeComponents(reduced ?? false, stagger), [reduced, stagger, content])

  return (
    <div
      className={cn('mx-auto w-full max-w-reading font-serif leading-[1.8] text-ink-1', className)}
      style={{ fontSize }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
