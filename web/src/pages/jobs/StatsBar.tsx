import { motion, useReducedMotion } from 'framer-motion'
import { Download, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { Job } from '@/lib/api'
import { useHealth } from '@/hooks/useHealth'
import { downloadCsv, IN_PROGRESS, mondayOf } from './utils'

/**
 * S1 · 页头统计条（jobs.md）：一行 28px，非卡片。
 * `共 N 条 · 进行中 N · 等你确认 N（琥珀链接）· 本周新增 N`，右侧 Ghost「下载 CSV」。
 * 数字 mono；不做滚动动画；演示模式下载后给提示 Toast。
 */
export default function StatsBar({
  rows,
  filtered,
  today,
  onFilterPending,
  onAdd,
}: {
  rows: Job[]
  /** 当前筛选结果（下载 CSV 用） */
  filtered: Job[]
  today: string
  /** 点击「等你确认」→ 状态筛选勾选「待投递」 */
  onFilterPending: () => void
  /** 页面主操作「+ 新增岗位」（Topbar 为共享组件，主按钮按 scaffold 约定放在页面区） */
  onAdd: () => void
}) {
  const reduced = useReducedMotion()
  const health = useHealth()

  const total = rows.length
  const inProgress = rows.filter((r) => IN_PROGRESS.includes(r.status)).length
  const pending = rows.filter((r) => r.status === '待投递').length
  const weekStart = mondayOf(today)
  const weekAdded = rows.filter((r) => r.date_added >= weekStart && r.date_added <= today).length

  const handleDownload = () => {
    downloadCsv(filtered)
    if (health?.mode === 'demo') {
      toast('演示模式：已生成下载', { description: `已导出当前筛选结果 ${filtered.length} 条` })
    } else {
      toast.success('已生成下载', { description: `已导出当前筛选结果 ${filtered.length} 条` })
    }
  }

  return (
    <motion.div
      className="flex h-7 items-center text-[13px] text-ink-2"
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <span>
        共 <span className="tnum font-mono text-ink-1">{total}</span> 条
      </span>
      <span aria-hidden className="mx-2 text-ink-4">
        ·
      </span>
      <span>
        进行中 <span className="tnum font-mono text-ink-1">{inProgress}</span>
      </span>
      <span aria-hidden className="mx-2 text-ink-4">
        ·
      </span>
      <button
        type="button"
        onClick={onFilterPending}
        title="点击按「待投递」筛选"
        className="rounded-sm text-amber-600 underline-offset-2 transition-colors duration-instant hover:text-amber-500 hover:underline"
      >
        等你确认 <span className="tnum font-mono">{pending}</span>
      </button>
      <span aria-hidden className="mx-2 text-ink-4">
        ·
      </span>
      <span>
        本周新增 <span className="tnum font-mono text-ink-1">{weekAdded}</span>
      </span>

      <button type="button" onClick={handleDownload} className="btn-ghost ml-auto h-7 px-2">
        <Download size={14} aria-hidden />
        下载 CSV
      </button>
      <button type="button" onClick={onAdd} className="btn-primary ml-2" title="新增岗位（快捷键 n）">
        <Plus size={14} aria-hidden />
        新增岗位
      </button>
    </motion.div>
  )
}
