import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, Copy, FolderOpen, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import type { Health } from '@/lib/api'
import { copyText } from '@/pages/context/copy'
import { cn } from '@/lib/utils'

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

const START_CMD = 'WORKSPACE_DIR=~/jobhunt-workspace npm run start'

/**
 * S1 工作区（settings.md）：路径 chip + 运行模式徽标 + 切换真实工作区说明。
 * 读取失败：卡内错误条 + 重试。
 */
export default function WorkspaceCard({
  health,
  error,
  onRetry,
}: {
  health: Health | null
  error: string | null
  onRetry: () => void
}) {
  const reduced = useReducedMotion()
  const [cmdCopied, setCmdCopied] = useState(false)
  const demo = health?.mode !== 'workspace'

  const onOpenFolder = async () => {
    if (demo) {
      toast.info('演示模式：在线预览无法打开本地文件夹')
      return
    }
    const ok = await copyText(health?.workspaceDir ?? '')
    toast.info(ok ? '路径已复制，请在文件管理器中打开' : '请在文件管理器中打开工作区路径')
  }

  const onCopyCmd = async () => {
    const ok = await copyText(START_CMD)
    if (ok) {
      setCmdCopied(true)
      toast.success('命令已复制')
      window.setTimeout(() => setCmdCopied(false), 1600)
    } else {
      toast.error('复制失败，请手动选择复制')
    }
  }

  return (
    <motion.section
      id="mode"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: EASE_OUT }}
      className="card-base scroll-mt-6 p-5"
    >
      <header>
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink-1">工作区</h2>
        <p className="mt-0.5 text-[12px] text-ink-3">网页层只是展示层，本地文件才是唯一事实源</p>
      </header>

      {error ? (
        <div className="mt-4 flex items-center gap-3 rounded-md border border-[#DC262633] bg-[#DC26260D] px-3 py-2.5">
          <p className="text-[13px] text-[#DC2626]">设置读取失败：{error}</p>
          <button type="button" className="btn-secondary ml-auto h-7 px-2 text-[12px]" onClick={onRetry}>
            <RefreshCw size={12} />
            重试
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3.5">
          {/* 当前工作区 */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-[104px] shrink-0 text-[13px] text-ink-3">当前工作区</span>
            <PathChipLarge path={health?.workspaceDir ?? '…'} />
            <button type="button" className="btn-ghost h-7 px-2 text-[12px]" onClick={() => void onOpenFolder()}>
              <FolderOpen size={12} />
              在文件夹中查看
            </button>
          </div>

          {/* 运行模式 */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-[104px] shrink-0 text-[13px] text-ink-3">运行模式</span>
            {demo ? (
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-amber-100 px-2.5 py-1 text-[12px] font-medium text-amber-600">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 motion-safe:animate-pulse-dot" />
                演示模式
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-[#E6F5EB] px-2.5 py-1 text-[12px] font-medium text-[#15803D] dark:bg-[#15803D24]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
                真实工作区
              </span>
            )}
            <span className="text-[12.5px] leading-[1.6] text-ink-2">
              {demo
                ? '数据来自内置示例工作区 demo-workspace/，改动不会写入你的真实文件。'
                : '数据直接读写你的工作区文件，改动即写入本地文件。'}
            </span>
          </div>

          {/* 切换到真实工作区 */}
          {demo && (
            <div className="rounded-lg bg-subtle px-4 py-3.5 text-[12.5px] leading-[1.7] text-ink-2">
              <p>本地启动时设置环境变量即可指向你的求职工作区：</p>
              <div className="group relative mt-2">
                <pre className="overflow-x-auto rounded-md bg-ink-1 px-3.5 py-2.5 font-mono text-[12.5px] text-ink-inverse">
                  {START_CMD}
                </pre>
                <button
                  type="button"
                  onClick={() => void onCopyCmd()}
                  aria-label="复制命令"
                  className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded bg-white/10 text-white/80 opacity-0 transition-opacity duration-instant hover:bg-white/20 hover:text-white group-hover:opacity-100"
                >
                  {cmdCopied ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
              <p className="mt-2">
                还没初始化工作区？先对 AI 工具说「初始化我的求职工作区」（jobhunt-init）。
              </p>
            </div>
          )}
        </div>
      )}
    </motion.section>
  )
}

/** 大号路径 chip（mono 13px + copy） */
function PathChipLarge({ path }: { path: string }) {
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
        'inline-flex h-8 min-w-0 items-center gap-1.5 rounded-md bg-subtle px-2.5 font-mono text-[13px] text-ink-1',
      )}
    >
      <span className="truncate" title={path}>
        {path}
      </span>
      <button
        type="button"
        onClick={() => void onCopy()}
        aria-label={`复制路径 ${path}`}
        className="shrink-0 rounded p-0.5 text-ink-3 transition-colors duration-instant hover:text-ink-1"
      >
        {copied ? <Check size={13} className="text-accent-500" /> : <Copy size={13} />}
      </button>
    </span>
  )
}
