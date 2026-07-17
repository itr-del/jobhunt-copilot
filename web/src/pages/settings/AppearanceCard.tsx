import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import type { DensityPref, ThemePref } from '@/pages/settings/appearance'
import {
  SIDEBAR_KEY,
  applyDensity,
  applyTheme,
  ensureSystemListener,
  getDensityPref,
  getThemePref,
} from '@/pages/settings/appearance'
import { cn } from '@/lib/utils'

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

const THEME_OPTIONS: { key: ThemePref; label: string }[] = [
  { key: 'light', label: '浅色' },
  { key: 'dark', label: '深色' },
  { key: 'system', label: '跟随系统' },
]

/** 主题小预览块：墨条 + 青点 */
function ThemePreview({ kind }: { kind: ThemePref }) {
  const block = (dark: boolean, clip?: 'left' | 'right') => (
    <span
      className={cn(
        'flex h-full flex-1 flex-col gap-1 p-1.5',
        dark ? 'bg-[#1C1C19]' : 'bg-white',
        clip === 'left' && 'rounded-l-[5px]',
        clip === 'right' && 'rounded-r-[5px]',
        !clip && 'rounded-[5px]',
      )}
    >
      <span className={cn('h-1 w-3/4 rounded-full', dark ? 'bg-[#ECECE5]' : 'bg-ink-1')} />
      <span className={cn('h-1 w-1/2 rounded-full', dark ? 'bg-[#4C4C45]' : 'bg-ink-4')} />
      <span className="mt-auto h-1.5 w-1.5 rounded-full bg-accent-500" />
    </span>
  )
  return (
    <span className="flex h-9 w-full overflow-hidden rounded-[5px] border border-border">
      {kind === 'light' && block(false)}
      {kind === 'dark' && block(true)}
      {kind === 'system' && (
        <>
          {block(false, 'left')}
          {block(true, 'right')}
        </>
      )}
    </span>
  )
}

/** S3 外观（settings.md）：主题三选 radio 卡 + 密度 segmented + 侧栏开关。即时生效 + Toast */
export default function AppearanceCard() {
  const reduced = useReducedMotion()
  const [theme, setTheme] = useState<ThemePref>(() => getThemePref())
  const [density, setDensity] = useState<DensityPref>(() => getDensityPref())
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.localStorage.getItem(SIDEBAR_KEY) === '1',
  )

  const onTheme = (next: ThemePref) => {
    setTheme(next)
    applyTheme(next, !reduced)
    ensureSystemListener()
    toast.success('外观偏好已保存（仅本浏览器）')
  }

  const onDensity = (next: DensityPref) => {
    setDensity(next)
    applyDensity(next)
    toast.success('外观偏好已保存（仅本浏览器）')
  }

  const onSidebar = (checked: boolean) => {
    setSidebarCollapsed(checked)
    window.localStorage.setItem(SIDEBAR_KEY, checked ? '1' : '0')
    toast.success('外观偏好已保存（仅本浏览器）')
  }

  return (
    <motion.section
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: EASE_OUT, delay: 0.12 }}
      className="card-base p-5"
    >
      <header>
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink-1">外观</h2>
      </header>

      {/* 主题选择 */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {THEME_OPTIONS.map((opt) => {
          const active = theme === opt.key
          return (
            <motion.button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onTheme(opt.key)}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'relative flex h-[84px] flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors duration-fast',
                active ? 'border-[1.5px] border-accent-500 bg-accent-50' : 'border-border bg-surface hover:border-strong',
              )}
            >
              <ThemePreview kind={opt.key} />
              <span className="text-[12px] font-medium text-ink-1">{opt.label}</span>
              {active && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent-500 text-white"
                >
                  <Check size={10} strokeWidth={3} />
                </motion.span>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* 界面密度 */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-[13px] text-ink-2">界面密度</span>
        <div className="flex items-center gap-1 rounded-md bg-subtle p-0.5">
          {(
            [
              { key: 'comfortable', label: '舒适' },
              { key: 'compact', label: '紧凑' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => onDensity(opt.key)}
              aria-pressed={density === opt.key}
              className={cn(
                'relative h-6 rounded-[5px] px-2.5 text-[12px] transition-colors duration-fast',
                density === opt.key ? 'text-ink-1' : 'text-ink-3 hover:text-ink-1',
              )}
            >
              {density === opt.key && (
                <motion.span
                  layoutId="density-indicator"
                  className="absolute inset-0 rounded-[5px] bg-surface shadow-e0"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative">{opt.label}</span>
            </button>
          ))}
        </div>
        <span className="text-[11px] text-ink-3">只改间距不改字号，保护可读性</span>
      </div>

      {/* 侧栏 */}
      <div className="mt-4 flex items-center gap-3">
        <span className="text-[13px] text-ink-2">侧栏</span>
        <Switch checked={sidebarCollapsed} onCheckedChange={onSidebar} aria-label="默认折叠为图标栏" />
        <span className="text-[12px] text-ink-3">默认折叠为图标栏</span>
      </div>
    </motion.section>
  )
}
