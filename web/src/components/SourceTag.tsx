import type { JobSource } from '@/lib/api'
import { SOURCE_META } from '@/lib/meta'
import { cn } from '@/lib/utils'

/**
 * 来源标签（design.md §3.5 / §7.5）
 * 结构：16×16 首字符方块（圆角 4px，白字，来源色底）+ 显示名 12px。
 * 存储值 → 显示名映射见 @/lib/meta 的 SOURCE_LABEL / SOURCE_META。
 */
export default function SourceTag({
  source,
  className,
}: {
  source: JobSource
  className?: string
}) {
  const meta = SOURCE_META[source] ?? SOURCE_META['其他']
  return (
    <span
      className={cn(
        'inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-sm px-1.5 text-[12px] font-medium leading-none',
        meta.tag,
        className,
      )}
      title={meta.label}
    >
      <span
        aria-hidden
        className={cn(
          'flex h-4 w-4 items-center justify-center rounded-[4px] text-[10px] font-semibold leading-none text-white dark:text-[#141412]',
          meta.chip,
        )}
      >
        {meta.label.charAt(0)}
      </span>
      {meta.label}
    </span>
  )
}
