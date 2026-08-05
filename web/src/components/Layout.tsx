import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import { X } from 'lucide-react'
import DemoRibbon from '@/components/DemoRibbon'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import { cn } from '@/lib/utils'

/**
 * App Shell（design.md §5.1）：DemoRibbon + Sidebar + Topbar + 内容槽。
 * 使用 children 模式：App.tsx 以 <Layout><Routes>…</Routes></Layout> 包裹。
 * 仅内容区滚动，侧栏 / Topbar 固定（§6.3）。
 *
 * 移动端（<768px）：侧栏收为汉堡抽屉（遮罩 + 滑入面板），Topbar 左侧显示菜单按钮。
 */

const MOBILE_HINT_KEY = 'jh-desktop-hint-dismissed'

/** 是否处于移动端视口（<768px） */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const apply = () => setIsMobile(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  return isMobile
}

/** 移动端一次性提示条：手机模式已可用，侧栏收进抽屉 */
function MobileHint() {
  const [visible, setVisible] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (window.localStorage.getItem(MOBILE_HINT_KEY)) return
    if (!isMobile) return
    const t = window.setTimeout(() => setVisible(true), 400)
    return () => window.clearTimeout(t)
  }, [isMobile])

  if (!visible) return null
  return (
    <div className="flex h-8 shrink-0 items-center justify-center gap-2 border-b border-amber-border bg-amber-50 px-3 text-[12px] font-medium text-amber-600">
      <span className="truncate">📱 已进入手机模式：点左上角 ☰ 打开导航</span>
      <button
        type="button"
        aria-label="关闭提示"
        className="rounded p-0.5 transition-colors hover:bg-amber-100"
        onClick={() => {
          window.localStorage.setItem(MOBILE_HINT_KEY, '1')
          setVisible(false)
        }}
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { pathname } = useLocation()

  // 移动端抽屉：切换路由时自动收起
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])
  useEffect(() => {
    if (!isMobile) setDrawerOpen(false)
  }, [isMobile, pathname])

  // 抽屉打开时锁定 body 滚动
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-app text-ink-1">
      <DemoRibbon />
      <MobileHint />
      <div className="flex min-h-0 flex-1">
        {/* 桌面端：固定侧栏 */}
        <div className={cn('hidden md:flex', isMobile && 'hidden')}>
          <Sidebar />
        </div>

        {/* 移动端：抽屉遮罩 + 滑入面板 */}
        {isMobile && (
          <>
            <div
              className={cn(
                'fixed inset-0 z-overlay bg-black/40 transition-opacity duration-200',
                drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
              onClick={closeDrawer}
              aria-hidden={!drawerOpen}
            />
            <div
              className={cn(
                'fixed inset-y-0 left-0 z-drawer transition-transform duration-200 ease-out',
                drawerOpen ? 'translate-x-0' : '-translate-x-full',
              )}
            >
              <Sidebar />
            </div>
          </>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenuClick={() => setDrawerOpen((v) => !v)} drawerOpen={drawerOpen} />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-content px-4 pb-12 pt-5 md:px-8 md:pt-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
