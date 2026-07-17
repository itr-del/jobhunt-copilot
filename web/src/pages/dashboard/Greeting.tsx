import { useNavigate } from 'react-router'
import { motion, useReducedMotion } from 'framer-motion'
import type { Stats } from '@/lib/api'

/**
 * S1 · 问候区（dashboard.md）：左文右钮。
 * 问候语按时段切换；日期数字 mono；「N 个投递等你确认」渲染为琥珀链接，
 * 点击平滑滚动到待办清单卡。右侧 Amber 主按钮跳 /jobs?status=待投递。
 */

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const
const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

function greetingByHour(hour: number): string {
  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

export default function Greeting({
  stats,
  onScrollToTodo,
}: {
  stats: Stats
  onScrollToTodo: () => void
}) {
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const now = new Date()
  const greeting = greetingByHour(now.getHours())
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`
  const pending = stats.today.pendingConfirm

  return (
    <section className="flex flex-wrap items-end justify-between gap-4 pt-2">
      <div className="flex min-w-0 flex-col gap-1.5">
        {/* 主问候：按字 split，每字 y 12px→0 + opacity，stagger 45ms */}
        <h2 className="text-greeting text-ink-1" aria-label={greeting}>
          {greeting.split('').map((char, i) => (
            <motion.span
              key={`${char}-${i}`}
              aria-hidden
              className="inline-block"
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT, delay: i * 0.045 }}
            >
              {char}
            </motion.span>
          ))}
        </h2>
        <p className="text-[13px] text-ink-2">
          今天是{' '}
          <span className="tnum font-mono">
            {now.getFullYear()} 年 {now.getMonth() + 1} 月 {now.getDate()} 日
          </span>{' '}
          {WEEKDAYS[now.getDay()]}
        </p>
        <p className="text-[13px] text-ink-2">
          今天新增 <span className="tnum font-medium text-ink-1">{stats.today.added}</span> 个岗位
          {pending > 0 ? (
            <>
              ，
              <button
                type="button"
                onClick={onScrollToTodo}
                className="font-medium text-amber-600 underline-offset-2 transition-colors duration-instant hover:underline"
              >
                <span className="tnum">{pending}</span> 个投递等你确认
              </button>
            </>
          ) : (
            '，今天没有等你确认的投递'
          )}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {pending > 0 && (
          <button
            type="button"
            className="btn-amber"
            onClick={() => navigate(`/jobs?status=${encodeURIComponent('待投递')}`)}
          >
            去确认今日投递（<span className="tnum">{pending}</span>）
          </button>
        )}
        <button
          type="button"
          className="btn-ghost"
          onClick={() => navigate(`/reports?date=${today}`)}
        >
          查看今日日报
        </button>
      </div>
    </section>
  )
}
