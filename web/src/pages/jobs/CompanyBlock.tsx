import { cn } from '@/lib/utils'
import { companyColor } from './utils'

/**
 * 公司首字符色块（jobs.md S3）：圆角 6px，按公司名 hash 取 8 暖色之一，白字。
 * size=28 用于表格行，size=36 用于详情抽屉头部。
 */
export default function CompanyBlock({
  name,
  size = 28,
  className,
}: {
  name: string
  size?: 28 | 36
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md font-semibold leading-none text-white dark:text-[#141412]',
        size === 36 ? 'h-9 w-9 text-[15px]' : 'h-7 w-7 text-[13px]',
        className,
      )}
      style={{ backgroundColor: companyColor(name) }}
    >
      {name.charAt(0)}
    </span>
  )
}
