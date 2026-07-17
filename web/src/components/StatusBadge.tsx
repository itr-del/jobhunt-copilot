import type { JobStatus } from '@/lib/api'
import { STATUS_STYLE } from '@/lib/meta'
import { cn } from '@/lib/utils'

/**
 * 状态徽标（design.md §3.4 / §7.5）
 * 结构：8px 圆点 + 状态文字，高 22px，圆角 999px，12px/500，左右内边距 8px。
 * pulse 变体仅用于「待投递」（圆点 1.6s 呼吸缩放，待办区强调）。
 * 深色主题：底色为状态色 14% 透明度，文字提亮约 15%。
 * 状态主色 hex 见 @/lib/meta 的 STATUS_COLOR。
 */
export default function StatusBadge({
  status,
  pulse = false,
  className,
}: {
  status: JobStatus
  /** 仅「待投递」可选：圆点 1.6s 呼吸缩放 1→1.35 */
  pulse?: boolean
  className?: string
}) {
  const style = STATUS_STYLE[status] ?? STATUS_STYLE['已收藏']
  return (
    <span
      className={cn(
        'inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-pill px-2 text-[12px] font-medium leading-none',
        style.badge,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn('h-2 w-2 rounded-full', style.dot, pulse && 'motion-safe:animate-pulse-dot')}
      />
      {status}
    </span>
  )
}
