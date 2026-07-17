import { Link } from 'react-router'
import { motion, useReducedMotion } from 'framer-motion'
import type { Stats } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * S5 · 面试日程卡（dashboard.md）：第一条为临近重点卡（橙色竖条 + 橙色淡底），
 * 其余为等待中弱化条目。倒计时徽标在 datetime 可解析时显示「N 天后」。
 * 数据：stats.upcomingInterviews。
 */

type Interview = Stats['upcomingInterviews'][number]

/** 从 datetime 文本提取日期（支持 "2025-07-19 14:00" / "07-19 14:00"），失败返回 null */
function parseInterviewDate(datetime: string): Date | null {
  const full = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(datetime)
  if (full) {
    const d = new Date(Number(full[1]), Number(full[2]) - 1, Number(full[3]))
    return Number.isNaN(d.getTime()) ? null : d
  }
  const short = /(?<!\d)(\d{1,2})-(\d{1,2})(?!\d)/.exec(datetime)
  if (short) {
    const d = new Date(new Date().getFullYear(), Number(short[1]) - 1, Number(short[2]))
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

/** 倒计时文案：0=今天，1=明天，其余「N 天后」；过去或不可解析返回 null */
function countdownLabel(datetime: string): string | null {
  const date = parseInterviewDate(datetime)
  if (!date) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((date.getTime() - today.getTime()) / 86_400_000)
  if (days < 0) return null
  if (days === 0) return '今天'
  if (days === 1) return '明天'
  return `${days} 天后`
}

function InterviewEntry({ interview, near }: { interview: Interview; near: boolean }) {
  const countdown = countdownLabel(interview.datetime)
  return (
    <div
      className={cn(
        'rounded-lg border-l-[3px] p-3 transition-colors duration-instant',
        near
          ? 'border-l-[#C2410C] bg-[#FCEEDF66] hover:bg-[#FCEEDF99] dark:bg-[#C2410C14] dark:hover:bg-[#C2410C20]'
          : 'border-l-[#D4D4CC] bg-surface hover:bg-subtle dark:border-l-[#42423A]',
      )}
    >
      <p className="text-[13px] font-semibold text-ink-1">
        {interview.company} · {interview.position}
      </p>
      <p className="mt-1 flex items-center gap-2 text-[12px] text-ink-2">
        <span className="tnum font-mono">
          {interview.round} · {interview.datetime}
        </span>
        {near && countdown && (
          <motion.span
            className="rounded-pill bg-[#C2410C] px-1.5 py-px text-[11px] font-medium leading-[1.6] text-white"
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ delay: 0.4, duration: 0.3, type: 'spring', stiffness: 300, damping: 15 }}
          >
            {countdown}
          </motion.span>
        )}
      </p>
      <Link
        to="/interviews"
        className="mt-1.5 inline-block text-[12px] text-accent-500 underline-offset-2 transition-colors duration-instant hover:text-accent-600 hover:underline"
      >
        打开面试档案 →
      </Link>
    </div>
  )
}

export default function InterviewCard({ stats }: { stats: Stats }) {
  const reduced = useReducedMotion()
  const items = stats.upcomingInterviews

  return (
    <section className="card-base p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-card-title text-ink-1">面试日程</h3>
        <Link to="/interviews" className="btn-ghost -mr-2 h-7 px-2 text-[12px]">
          全部档案 →
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="py-6 text-center text-[13px] text-ink-3">暂无面试安排</div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item, i) =>
            reduced ? (
              <InterviewEntry key={`${item.company}-${i}`} interview={item} near={i === 0} />
            ) : (
              <motion.div
                key={`${item.company}-${i}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.06 }}
              >
                <InterviewEntry interview={item} near={i === 0} />
              </motion.div>
            ),
          )}
        </div>
      )}
    </section>
  )
}
