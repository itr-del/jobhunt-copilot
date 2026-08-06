import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import {
  BookOpenCheck,
  Briefcase,
  CalendarCheck,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  Newspaper,
  ScrollText,
  Settings,
  Target,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { api } from '@/lib/api'
import type { JobStatus } from '@/lib/api'
import { useHealth } from '@/hooks/useHealth'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/components/Layout'

/**
 * 侧边栏导航（design.md §7.2）：展开 232px / 折叠 60px（仅图标，悬停出浮层标签）。
 * 底部固定「工作区模式」芯片与折叠按钮。<1024px 自动折叠（§5.3）。
 * 移动端（<768px）：由 Layout 放入抽屉，固定 280px 宽度，隐藏折叠按钮。
 */

type NavItem = { label: string; path: string; icon: LucideIcon }
type NavGroup = { name: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    name: '工作台',
    items: [
      { label: '仪表盘', path: '/', icon: LayoutDashboard },
      { label: '岗位台账', path: '/jobs', icon: Briefcase },
      { label: '每日简报', path: '/reports', icon: Newspaper },
      { label: '面试档案', path: '/interviews', icon: CalendarCheck },
    ],
  },
  {
    name: '知识库',
    items: [
      { label: '面试问答', path: '/qa', icon: BookOpenCheck },
      { label: '求职标准', path: '/context', icon: Target },
      { label: '策略与简历', path: '/strategy', icon: ScrollText },
    ],
  },
  {
    name: '系统',
    items: [{ label: '设置', path: '/settings', icon: Settings }],
  },
]

/** 「进行中」口径：待投递 + 已投递 + 被查看 + 沟通中 + 面试中（与仪表盘漏斗标题一致） */
const IN_PROGRESS: JobStatus[] = ['待投递', '已投递', '被查看', '沟通中', '面试中']

function isActive(pathname: string, path: string): boolean {
  return path === '/' ? pathname === '/' : pathname.startsWith(path)
}

export default function Sidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const health = useHealth()
  const isMobile = useIsMobile()
  // 移动端抽屉内固定展开（不折叠）；桌面端保持原有自动折叠逻辑
  const [collapsed, setCollapsed] = useState(false)
  const [inProgress, setInProgress] = useState<number | null>(null)
  const [pendingConfirm, setPendingConfirm] = useState(0)

  // <1024px 自动折叠为 60px（§5.3）；移动端抽屉内始终展开
  useEffect(() => {
    if (isMobile) {
      setCollapsed(false)
      return
    }
    const mq = window.matchMedia('(max-width: 1023px)')
    const apply = () => setCollapsed(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [isMobile])

  // 导航计数徽标（失败时静默隐藏徽标，不影响导航）
  useEffect(() => {
    let alive = true
    api
      .stats()
      .then((s) => {
        if (!alive) return
        setInProgress(
          s.funnel
            .filter((f) => IN_PROGRESS.includes(f.status))
            .reduce((sum, f) => sum + f.count, 0),
        )
        setPendingConfirm(s.today.pendingConfirm)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const workspaceName = health
    ? health.mode === 'demo'
      ? 'demo-workspace'
      : health.workspaceDir.split(/[\\/]/).filter(Boolean).pop() || health.workspaceDir
    : null

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 ease-out',
        collapsed ? 'w-[60px]' : 'w-[232px]',
        isMobile && 'w-[280px] shadow-e2',
      )}
    >
      {/* 品牌区（§7.1） */}
      <div
        className={cn(
          'flex h-[52px] shrink-0 items-center border-b border-border',
          collapsed ? 'justify-center px-0' : 'gap-2 px-4',
        )}
      >
        <img
          src="/logo.svg"
          alt="求职副驾"
          className="h-6 w-6 shrink-0 hover:animate-wiggle"
        />
        {!collapsed && (
          <>
            <span className="text-[15px] font-semibold text-ink-1">求职副驾</span>
            <span className="ml-auto font-mono text-[10px] leading-tight text-ink-3">
              JobHunt
              <br />
              Copilot
            </span>
          </>
        )}
      </div>

      {/* 主导航 */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.name} className="mb-4 last:mb-0">
            {!collapsed && (
              <div className="px-2 pb-1.5 text-[11px] font-semibold tracking-[0.06em] text-ink-3">
                {group.name}
              </div>
            )}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.path)
                const Icon = item.icon
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group relative flex h-8 items-center rounded-md text-[13px] font-medium transition-colors duration-instant',
                        collapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5',
                        active
                          ? 'bg-accent-50 text-accent-ink'
                          : 'text-ink-2 hover:bg-subtle hover:text-ink-1',
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="sidebar-active-bar"
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                          className="absolute left-0 top-1/2 h-[18px] w-[2px] -translate-y-1/2 rounded-full bg-accent-500"
                        />
                      )}
                      <Icon size={16} className="shrink-0" aria-hidden />
                      {!collapsed && <span className="truncate">{item.label}</span>}

                      {/* 计数徽标：岗位台账 = 进行中数量 */}
                      {!collapsed && item.path === '/jobs' && inProgress !== null && (
                        <span className="tnum ml-auto font-mono text-[12px] text-ink-3">
                          {inProgress}
                        </span>
                      )}
                      {/* 待确认：仪表盘右侧琥珀圆点 + 数字 */}
                      {!collapsed && item.path === '/' && pendingConfirm > 0 && (
                        <span className="tnum ml-auto inline-flex items-center gap-1 font-mono text-[12px] text-amber-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 motion-safe:animate-pulse-dot" />
                          {pendingConfirm}
                        </span>
                      )}

                      {/* 折叠态悬停浮层标签 */}
                      {collapsed && (
                        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-[12px] text-ink-1 opacity-0 shadow-e2 transition-opacity duration-fast group-hover:opacity-100">
                          {item.label}
                          {item.path === '/jobs' && inProgress !== null ? ` · ${inProgress}` : ''}
                          {item.path === '/' && pendingConfirm > 0 ? ` · ${pendingConfirm} 待确认` : ''}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* 底部：工作区模式芯片 + 折叠按钮 */}
      <div className="shrink-0 border-t border-border p-2">
        <button
          type="button"
          onClick={() => navigate('/settings')}
          title="工作区模式，点击查看设置"
          className={cn(
            'flex h-8 w-full items-center rounded-md text-[12px] text-ink-2 transition-colors duration-instant hover:bg-subtle',
            collapsed ? 'justify-center' : 'gap-2 px-2',
          )}
        >
          <span
            className={cn(
              'h-2 w-2 shrink-0 rounded-full',
              health?.mode === 'demo' ? 'bg-amber-500' : 'bg-[#16A34A]',
            )}
          />
          {!collapsed && (
            <span className="truncate font-mono">{workspaceName ?? '工作区'}</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
          className={cn(
            'mt-1 flex h-8 w-full items-center rounded-md text-ink-3 transition-colors duration-instant hover:bg-subtle hover:text-ink-1',
            collapsed ? 'justify-center' : 'gap-2 px-2',
            isMobile && 'hidden',
          )}
        >
          {collapsed ? (
            <ChevronsRight size={16} />
          ) : (
            <>
              <ChevronsLeft size={16} />
              <span className="text-[12px]">折叠</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
