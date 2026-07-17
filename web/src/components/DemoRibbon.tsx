import { Link } from 'react-router'
import { useHealth } from '@/hooks/useHealth'

/**
 * 演示模式细条（design.md §5.1）：高 28px，琥珀淡底，仅 demo 模式渲染。
 * 真实工作区模式不渲染此条。
 */
export default function DemoRibbon() {
  const health = useHealth()
  if (!health || health.mode !== 'demo') return null

  return (
    <div className="relative flex h-7 shrink-0 items-center justify-center border-b border-amber-border bg-amber-50 text-[12px] font-medium text-amber-600">
      <span>
        演示模式 · 数据来自内置示例工作区 <span className="font-mono">demo-workspace/</span>
      </span>
      <Link
        to="/settings#mode"
        className="absolute right-4 underline-offset-2 transition-colors duration-instant hover:underline"
      >
        了解如何切换真实工作区 →
      </Link>
    </div>
  )
}
