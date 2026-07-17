import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { copyText } from '@/pages/context/copy'
import { cn } from '@/lib/utils'

/** 路径 chip：mono 12px + copy 图标（提示条 / 卡头右侧复用） */
export default function PathChip({ path, className }: { path: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    const ok = await copyText(path)
    if (!ok) {
      toast.error('复制失败，请手动选择复制')
      return
    }
    setCopied(true)
    toast.success('路径已复制')
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1 rounded-sm bg-subtle px-1.5 font-mono text-[12px] leading-none text-ink-2',
        className,
      )}
    >
      <span className="truncate">{path}</span>
      <button
        type="button"
        onClick={() => void onCopy()}
        aria-label={`复制路径 ${path}`}
        className="rounded p-0.5 text-ink-3 transition-colors duration-instant hover:text-ink-1"
      >
        {copied ? <Check size={12} className="text-accent-500" /> : <Copy size={12} />}
      </button>
    </span>
  )
}
