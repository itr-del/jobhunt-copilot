import { motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle,
  Ban,
  Banknote,
  Briefcase,
  Building2,
  MapPin,
  Shield,
  ShieldCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { parseRules } from '@/pages/context/parse'

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

/** 规则标题关键词 → 图标（design.md S5 规则卡图标列） */
function ruleIcon(key: string): LucideIcon {
  if (key.includes('城市') || key.includes('远程')) return MapPin
  if (key.includes('薪资')) return Banknote
  if (key.includes('行业')) return Ban
  if (key.includes('规模')) return Building2
  if (key.includes('坐班') || key.includes('出差')) return Briefcase
  if (key.includes('JD') || key.includes('信号')) return AlertTriangle
  return ShieldCheck
}

/** 薪资等数字（25K / 30-40K）mono 加粗 */
function emphasizeNumbers(text: string) {
  const parts = text.split(/(\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?K)/g)
  return parts.map((part, i) =>
    /^\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?K$/.test(part) ? (
      <span key={i} className="tnum font-mono font-semibold">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

/**
 * 三、筛选硬规则（全页视觉重心，context.md S5）：
 * 2 列规则小卡（白底 + 左 3px 青竖条，悬停竖条加宽 + e1）+ 底部琥珀固定纪律条。
 */
export default function HardRulesBody({ body }: { body: string }) {
  const reduced = useReducedMotion()
  const { rules, discipline } = parseRules(body)

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rules.map((rule, i) => {
          const Icon = ruleIcon(rule.key)
          return (
            <motion.div
              key={rule.key}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.22, ease: EASE_OUT, delay: i * 0.045 }}
              className="group flex gap-3 rounded-lg border border-border border-l-[3px] border-l-accent-500 bg-surface px-4 py-3.5 transition-[box-shadow,border-color,border-left-width] duration-instant hover:border-l-4 hover:shadow-e1"
            >
              <Icon size={16} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-ink-3">{rule.key}</div>
                <div className="mt-0.5 text-[14px] font-medium leading-[1.5] text-ink-1">
                  {emphasizeNumbers(rule.value)}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* 固定纪律条（不可删） */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: reduced ? 0 : rules.length * 0.045 + 0.1 }}
        className="mt-3 flex items-center gap-2.5 rounded-lg border border-amber-border bg-amber-50 px-4 py-3"
      >
        <Shield size={16} className="shrink-0 text-amber-600" aria-hidden />
        <p className="text-[13px] leading-[1.6] text-amber-600">
          <span className="font-semibold">固定纪律（不可删）：</span>
          {(discipline ?? '**绝不自动投递或打招呼**——先列清单等你确认。').replace(/\*\*/g, '')}
        </p>
      </motion.div>
    </div>
  )
}
