import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Health } from '@/lib/api'
import AboutCard from '@/pages/settings/AboutCard'
import AppearanceCard from '@/pages/settings/AppearanceCard'
import GuideCard from '@/pages/settings/GuideCard'
import RedlinesCard from '@/pages/settings/RedlinesCard'
import WorkspaceCard from '@/pages/settings/WorkspaceCard'
import { ensureSystemListener } from '@/pages/settings/appearance'
import { cn } from '@/lib/utils'

function Bone({ className }: { className?: string }) {
  return <div className={cn('animate-breathe rounded-md bg-subtle', className)} />
}

function SettingsSkeleton() {
  return (
    <div className="flex max-w-[760px] flex-col gap-4" aria-label="加载中">
      {[220, 200, 190, 190, 260].map((h, i) => (
        <div key={i} className="card-base p-5" style={{ height: h }}>
          <Bone className="mb-3 h-5 w-28" />
          <Bone className="mb-2 h-4 w-full" />
          <Bone className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  )
}

/**
 * 设置 `/settings`（settings.md）：工作区与运行模式 → 使用指引 → 外观 → 红线与原则 → 关于。
 * 单列卡片流 max-width 760px；锚点 #mode / #guide 直达。
 */
export default function Settings() {
  const location = useLocation()
  const [health, setHealth] = useState<Health | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setHealth(await api.health())
      setError(null)
    } catch (e) {
      const message = e instanceof Error ? e.message : '未知错误'
      setError(message)
      toast.error(`设置读取失败：${message}`, {
        action: { label: '重试', onClick: () => void load() },
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    ensureSystemListener()
  }, [load])

  // #mode / #guide 锚点直达
  useEffect(() => {
    if (loading) return
    const hash = location.hash.replace(/^#/, '')
    if (!hash) return
    const timer = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)
    return () => window.clearTimeout(timer)
  }, [loading, location.hash])

  if (loading) return <SettingsSkeleton />

  return (
    <div className="flex max-w-[760px] flex-col gap-4">
      <WorkspaceCard health={health} error={error} onRetry={() => void load()} />
      <GuideCard />
      <AppearanceCard />
      <RedlinesCard />
      <AboutCard health={health} />
    </div>
  )
}
