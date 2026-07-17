import { useLocation } from 'react-router'
import { Search } from 'lucide-react'

/**
 * 顶部栏（design.md §7.3）：高 52px，白底，下边框 1px。
 * 左：当前页标题（20px/650）；右：⌘K 搜索触发框（220px，视觉占位）+ 今日日期芯片（mono）。
 * 页面主操作按钮由各页面区自行放置（见分页设计）。
 */

const PAGE_TITLE: Record<string, string> = {
  '/': '仪表盘',
  '/jobs': '岗位台账',
  '/reports': '每日简报',
  '/interviews': '面试档案',
  '/context': '求职标准',
  '/strategy': '策略与简历',
  '/settings': '设置',
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

function todayChip(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day} ${WEEKDAYS[d.getDay()]}`
}

export default function Topbar() {
  const { pathname } = useLocation()
  const title =
    PAGE_TITLE[pathname] ??
    PAGE_TITLE[Object.keys(PAGE_TITLE).find((p) => p !== '/' && pathname.startsWith(p)) ?? ''] ??
    '求职副驾'

  return (
    <header className="z-topbar flex h-[52px] shrink-0 items-center justify-between border-b border-border bg-surface px-8">
      <h1 className="text-page-title text-ink-1">{title}</h1>

      <div className="flex items-center gap-3">
        {/* ⌘K 命令面板触发框（视觉占位，命令面板由后续迭代实现） */}
        <div
          aria-hidden
          className="flex h-8 w-[220px] items-center gap-2 rounded-md bg-subtle px-2.5 text-[12px] text-ink-3"
        >
          <Search size={14} className="shrink-0" />
          <span className="truncate">搜索岗位、页面、操作…</span>
          <kbd className="kbd ml-auto">⌘K</kbd>
        </div>
        {/* 今日日期芯片 */}
        <span className="tnum flex h-8 items-center rounded-md bg-subtle px-2.5 font-mono text-[12px] text-ink-2">
          {todayChip()}
        </span>
      </div>
    </header>
  )
}
