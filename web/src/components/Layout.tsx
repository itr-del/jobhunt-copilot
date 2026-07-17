import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import DemoRibbon from '@/components/DemoRibbon'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'

/**
 * App Shell（design.md §5.1）：DemoRibbon + Sidebar + Topbar + 内容槽。
 * 使用 children 模式：App.tsx 以 <Layout><Routes>…</Routes></Layout> 包裹。
 * 仅内容区滚动，侧栏 / Topbar 固定（§6.3）。
 */

const MOBILE_HINT_KEY = 'jh-desktop-hint-dismissed'

/** <768px 一次性提示条（§5.3）：本工作台为桌面端设计 */
function MobileHint() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (window.localStorage.getItem(MOBILE_HINT_KEY)) return
    const mq = window.matchMedia('(max-width: 767px)')
    const apply = () => setVisible(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  if (!visible) return null
  return (
    <div className="flex h-8 shrink-0 items-center justify-center gap-2 border-b border-amber-border bg-amber-50 px-3 text-[12px] font-medium text-amber-600">
      <span className="truncate">本工作台为桌面端设计，建议使用电脑浏览器访问</span>
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
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-app text-ink-1">
      <DemoRibbon />
      <MobileHint />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-content px-8 pb-12 pt-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
