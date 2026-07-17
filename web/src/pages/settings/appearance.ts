/**
 * 外观偏好（settings.md S3）：全部存 localStorage，前端自管理。
 * 主题 = html.dark class；密度 = html[data-density]（紧凑样式在 index.html 启动脚本里注入）。
 * 启动时的无闪烁应用见 index.html 内联 boot script（与本文件同一套 key）。
 */

export type ThemePref = 'light' | 'dark' | 'system'
export type DensityPref = 'comfortable' | 'compact'

export const THEME_KEY = 'jh-theme'
export const DENSITY_KEY = 'jh-density'
export const SIDEBAR_KEY = 'jh-sidebar-collapsed'

export function getThemePref(): ThemePref {
  const v = window.localStorage.getItem(THEME_KEY)
  return v === 'dark' || v === 'system' ? v : 'light'
}

export function getDensityPref(): DensityPref {
  return window.localStorage.getItem(DENSITY_KEY) === 'compact' ? 'compact' : 'comfortable'
}

function systemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** 应用主题；animate=true 时全站 200ms 颜色过渡（禁位移动画） */
export function applyTheme(pref: ThemePref, animate = true): void {
  const root = document.documentElement
  const dark = pref === 'dark' || (pref === 'system' && systemDark())
  if (animate) {
    root.classList.add('theme-anim')
    window.setTimeout(() => root.classList.remove('theme-anim'), 240)
  }
  root.classList.toggle('dark', dark)
  window.localStorage.setItem(THEME_KEY, pref)
}

export function applyDensity(pref: DensityPref): void {
  document.documentElement.setAttribute('data-density', pref)
  window.localStorage.setItem(DENSITY_KEY, pref)
}

/** 「跟随系统」时监听系统主题变化（页面挂载期间实时生效；启动时由 boot script 评估） */
let systemListenerInstalled = false
export function ensureSystemListener(): void {
  if (systemListenerInstalled) return
  systemListenerInstalled = true
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getThemePref() === 'system') applyTheme('system', false)
  })
}
