import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Copy, Monitor } from 'lucide-react'
import { toast } from 'sonner'
import { copyText } from '@/pages/context/copy'

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

interface Step {
  title: string
  desc: string
  /** 口令 chip 文案；null = 本工作台（不可复制） */
  command: string | null
}

const STEPS: Step[] = [
  { title: '初始化一次', desc: '在工作区里对 AI 说，生成全部文件', command: '初始化我的求职工作区' },
  { title: '每天一句话', desc: 'AI 跑完流水线：抓岗、初筛、记台账、出日报', command: '处理今天的求职' },
  { title: '回到这里拍板', desc: '看仪表盘待办，确认投递、更新进度', command: null },
  { title: '面试前后翻档案', desc: '面试前看预测问题，面完当场复盘', command: '帮我准备鸣沙数据这场面试' },
]

function CommandChip({ command }: { command: string }) {
  const onCopy = async () => {
    const ok = await copyText(command)
    if (ok) toast.success('已复制，去 AI 工具里粘贴')
    else toast.error('复制失败，请手动选择复制')
  }
  return (
    <motion.button
      type="button"
      onClick={() => void onCopy()}
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.12 }}
      title="点击复制口令"
      className="mt-auto inline-flex items-center gap-1.5 self-start rounded-md bg-accent-50 px-2 py-1 font-mono text-[12px] text-accent-ink"
    >
      <span className="break-all text-left">{command}</span>
      <Copy size={12} className="shrink-0" />
    </motion.button>
  )
}

/** S2 使用指引（settings.md）：四步 stepper + 可复制的口令 chip */
export default function GuideCard() {
  const reduced = useReducedMotion()
  return (
    <motion.section
      id="guide"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: EASE_OUT, delay: 0.06 }}
      className="card-base scroll-mt-6 p-5"
    >
      <header>
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink-1">使用指引</h2>
        <p className="mt-0.5 text-[12px] text-ink-3">
          网页负责"看"和"记"，智能活儿（筛选/写简历/调研）由 AI 工具完成
        </p>
      </header>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-stretch">
        {STEPS.map((step, i) => (
          <div key={step.title} className="contents md:flex md:min-w-0 md:flex-1 md:items-stretch">
            <motion.div
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: EASE_OUT, delay: i * 0.07 }}
              className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-lg border border-border bg-surface px-4 py-3.5"
            >
              <motion.span
                initial={reduced ? { opacity: 0 } : { scale: 0.5 }}
                animate={reduced ? { opacity: 1 } : { scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 28, delay: i * 0.07 + 0.08 }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-500 text-[13px] font-semibold text-white"
              >
                {i + 1}
              </motion.span>
              <p className="text-[13px] font-semibold text-ink-1">{step.title}</p>
              <p className="text-[12px] leading-[1.6] text-ink-2">{step.desc}</p>
              {step.command ? (
                <CommandChip command={step.command} />
              ) : (
                <span className="mt-auto inline-flex items-center gap-1.5 self-start rounded-md bg-accent-50 px-2 py-1 text-[12px] text-accent-ink">
                  <Monitor size={12} />
                  本工作台
                </span>
              )}
            </motion.div>
            {i < STEPS.length - 1 && (
              <motion.span
                aria-hidden
                initial={reduced ? { opacity: 0 } : { opacity: 0, x: -4 }}
                animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0 }}
                transition={{ duration: 0.15, delay: i * 0.07 + 0.3 }}
                className="hidden self-center px-1 text-ink-4 md:block"
              >
                <ArrowRight size={16} />
              </motion.span>
            )}
          </div>
        ))}
      </div>
    </motion.section>
  )
}
