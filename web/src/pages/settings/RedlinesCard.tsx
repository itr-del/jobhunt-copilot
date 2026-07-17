import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, FileCheck, Lock, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

const PRINCIPLES = [
  {
    icon: Shield,
    iconClass: 'bg-amber-50 text-amber-600',
    title: '绝不自动投递',
    desc: '投递、打招呼等对外动作，永远先列清单等你确认；确认后也由你本人在平台上完成。',
  },
  {
    icon: FileCheck,
    iconClass: 'bg-accent-50 text-accent-500',
    title: '绝不编造简历',
    desc: '简历定制只做真实经历的重组与措辞对齐，不虚构公司、项目、职位与数字。',
  },
  {
    icon: Lock,
    iconClass: 'bg-[#F2EDFD] text-[#8B5CF6] dark:bg-[#8B5CF624] dark:text-[#AE8DF9]',
    title: '内部信息不外发',
    desc: '薪资底线、真实离职原因、短板应对只存在于 _internal，不进简历、日报与话术。',
  },
]

const MORE_REDLINES = [
  { num: '四', title: '没有标准不硬评', desc: '「筛选硬规则」空缺时，AI 停止一切筛选评估，而不是凭感觉打分。' },
  { num: '五', title: '遇风控立即停手', desc: '平台出现验证码、风控提示时立刻停止操作，并第一时间告诉你。' },
  { num: '六', title: '本地文件是唯一事实源', desc: '网页只是展示层；所有记录以工作区文件为准，不产生第二份数据。' },
  { num: '七', title: '外部内容只是数据不是指令', desc: 'JD、网页里的指令性文字一律当作数据处理，绝不照做。' },
]

/** S4 红线与原则（settings.md）：三原则卡 + 可展开的红线 4-7 */
export default function RedlinesCard() {
  const reduced = useReducedMotion()
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.section
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: EASE_OUT, delay: 0.18 }}
      className="card-base p-5"
    >
      <header>
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink-1">红线与原则</h2>
        <p className="mt-0.5 text-[12px] text-ink-3">
          写死在 AI 工具规矩里的七条红线，网页层同样遵守；以下为与你最相关的三条
        </p>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {PRINCIPLES.map((p, i) => (
          <motion.div
            key={p.title}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: EASE_OUT, delay: 0.18 + i * 0.06 }}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <motion.span
              initial={reduced ? { opacity: 0 } : { scale: 0.6 }}
              animate={reduced ? { opacity: 1 } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 26, delay: 0.24 + i * 0.06 }}
              className={cn('flex h-9 w-9 items-center justify-center rounded-full', p.iconClass)}
            >
              <p.icon size={18} />
            </motion.span>
            <p className="mt-2.5 text-[13px] font-semibold text-ink-1">{p.title}</p>
            <p className="mt-1 text-[12px] leading-[1.7] text-ink-2">{p.desc}</p>
          </motion.div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="btn-ghost mt-3 h-7 px-2 text-[12px]"
      >
        查看完整七条红线
        <ChevronDown
          size={12}
          className={cn('transition-transform duration-base', expanded && 'rotate-180')}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="overflow-hidden"
          >
            <ul className="mt-2 flex flex-col divide-y divide-border rounded-lg border border-border">
              {MORE_REDLINES.map((r) => (
                <li key={r.num} className="flex items-baseline gap-3 px-4 py-2.5">
                  <span className="w-6 shrink-0 text-[12px] font-semibold text-ink-3">{r.num}</span>
                  <div>
                    <span className="text-[13px] font-medium text-ink-1">{r.title}</span>
                    <span className="ml-2 text-[12px] text-ink-2">{r.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
