import type { MatchGrade } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * 评级星（design.md §3.4 / §7.5）：3 格 SVG 星 14px，实心数 = 评级；
 * 未评级显示 `--`（--ink-4）；悬停 tooltip 说明评级口径。SVG 渲染，不用 emoji。
 * 实心 #F59E0B，空心 #E3E3DC（描边同色 1px）。
 */

function Star({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      className={cn(
        'shrink-0',
        filled
          ? 'text-[#F59E0B]'
          : 'text-[#E3E3DC] dark:text-[#4C4C45]',
      )}
    >
      <path
        d="M12 2.6l2.83 5.86 6.45.87-4.71 4.49 1.17 6.4L12 17.13l-5.74 3.09 1.17-6.4-4.71-4.49 6.45-.87L12 2.6z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function GradeStars({
  grade,
  size = 14,
  className,
}: {
  grade: MatchGrade
  size?: number
  className?: string
}) {
  if (!grade) {
    return (
      <span className={cn('text-[12px] font-medium text-ink-4', className)} title="未评级">
        --
      </span>
    )
  }
  const count = grade.length // '⭐' 为 BMP 单码元，length 即星数（1-3）
  return (
    <span
      className={cn('inline-flex shrink-0 items-center gap-0.5', className)}
      title="命脉卖点强对口 = ⭐⭐⭐"
      aria-label={`匹配评级 ${count} 星`}
    >
      {[0, 1, 2].map((i) => (
        <Star key={i} filled={i < count} size={size} />
      ))}
    </span>
  )
}
