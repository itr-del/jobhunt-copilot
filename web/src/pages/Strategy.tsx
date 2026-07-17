import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CircleHelp, Lock, PencilLine, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Job, ResumeMeta } from '@/lib/api'
import HowToModal from '@/pages/strategy/HowToModal'
import InternalTab from '@/pages/strategy/InternalTab'
import MasterTab from '@/pages/strategy/MasterTab'
import SplitEditor from '@/pages/strategy/SplitEditor'
import VersionModal from '@/pages/strategy/VersionModal'
import VersionsTab from '@/pages/strategy/VersionsTab'
import { splitStrategy } from '@/pages/strategy/parse'
import { cn } from '@/lib/utils'

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

type TabKey = 'strategy' | 'master' | 'versions'
const TABS: { key: TabKey; label: string; locked?: boolean }[] = [
  { key: 'strategy', label: '对内策略', locked: true },
  { key: 'master', label: '对外简历' },
  { key: 'versions', label: '定制版本' },
]

function Bone({ className }: { className?: string }) {
  return <div className={cn('animate-breathe rounded-md bg-subtle', className)} />
}

function StrategySkeleton() {
  return (
    <div aria-label="加载中">
      <Bone className="h-11 w-full rounded-lg" />
      <Bone className="mt-4 h-11 w-full rounded-lg" />
      <div className="mt-4 flex max-w-[760px] flex-col gap-4">
        {[180, 150, 130].map((h, i) => (
          <div key={i} className="card-base p-5" style={{ height: h }}>
            <Bone className="mb-3 h-5 w-40" />
            <Bone className="mb-2 h-4 w-full" />
            <Bone className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 策略与简历 `/strategy`（strategy.md）：三 Tab——对内策略（⚠️ 不外发）/ 对外主简历 / 定制版本。
 * URL 状态 ?tab=strategy|master|versions；快捷键 1/2/3 切 Tab，e 编辑当前文件。
 */
export default function Strategy() {
  const reduced = useReducedMotion()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: TabKey = tabParam === 'master' || tabParam === 'versions' ? tabParam : 'strategy'

  const [strategyRaw, setStrategyRaw] = useState<string | null>(null)
  const [masterRaw, setMasterRaw] = useState<string | null>(null)
  const [resumes, setResumes] = useState<ResumeMeta[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingStrategy, setEditingStrategy] = useState(false)
  const [editingMaster, setEditingMaster] = useState(false)
  const [previewMeta, setPreviewMeta] = useState<ResumeMeta | null>(null)
  const [howToOpen, setHowToOpen] = useState(false)

  const setTab = useCallback(
    (next: TabKey) => {
      setSearchParams(next === 'strategy' ? {} : { tab: next }, { replace: true })
    },
    [setSearchParams],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [strategy, master, resumeList, ledger] = await Promise.all([
        api.getStrategy(),
        api.getMasterResume(),
        api.listResumes(),
        api.listLedger(),
      ])
      setStrategyRaw(strategy.raw)
      setMasterRaw(master.raw)
      setResumes(resumeList.list)
      setJobs(ledger.rows)
      setError(null)
    } catch (e) {
      const message = e instanceof Error ? e.message : '未知错误'
      setError(message)
      toast.error(`策略与简历加载失败：${message}`, {
        action: { label: '重试', onClick: () => void load() },
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // 快捷键：1/2/3 切 Tab，e 编辑当前文件
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingStrategy || editingMaster || previewMeta || howToOpen) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      )
        return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '1') setTab('strategy')
      else if (e.key === '2') setTab('master')
      else if (e.key === '3') setTab('versions')
      else if (e.key === 'e') {
        if (tab === 'strategy') setEditingStrategy(true)
        else if (tab === 'master') setEditingMaster(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editingStrategy, editingMaster, previewMeta, howToOpen, tab, setTab])

  const saveStrategy = useCallback(async (raw: string) => {
    try {
      await api.putStrategy(raw)
      setStrategyRaw(raw)
      return true
    } catch (e) {
      toast.error(`保存失败：${e instanceof Error ? e.message : '未知错误'}`)
      return false
    }
  }, [])

  const saveMaster = useCallback(async (raw: string) => {
    try {
      await api.putMasterResume(raw)
      setMasterRaw(raw)
      return true
    } catch (e) {
      toast.error(`保存失败：${e instanceof Error ? e.message : '未知错误'}`)
      return false
    }
  }, [])

  if (loading) return <StrategySkeleton />

  if (error && strategyRaw == null) {
    return (
      <div className="card-base flex min-h-[240px] flex-col items-center justify-center gap-3 p-10 text-center">
        <p className="text-[14px] font-medium text-ink-1">策略与简历加载失败</p>
        <p className="max-w-[420px] text-[13px] text-ink-3">{error}</p>
        <button type="button" className="btn-secondary mt-1" onClick={() => void load()}>
          <RefreshCw size={13} />
          重试
        </button>
      </div>
    )
  }

  // 整文件编辑模式
  if (editingStrategy && strategyRaw != null) {
    return (
      <SplitEditor
        initialRaw={strategyRaw}
        hint={{ tone: 'amber', text: '内部文件，保存后仅自己可见' }}
        saveToast="策略笔记已保存"
        draftKey="jh-strategy-draft"
        onSave={saveStrategy}
        onClose={() => setEditingStrategy(false)}
      />
    )
  }
  if (editingMaster && masterRaw != null) {
    return (
      <SplitEditor
        initialRaw={masterRaw}
        hint={{
          tone: 'teal',
          text: '对外文件：只写真实经历；薪资底线与离职原因别写在这里（去对内策略）。',
        }}
        saveToast="主简历已更新"
        draftKey="jh-master-draft"
        onSave={saveMaster}
        onClose={() => setEditingMaster(false)}
      />
    )
  }

  return (
    <div>
      {/* 页面主操作（随 Tab 变化） */}
      <div className="mb-3 flex justify-end">
        {tab === 'strategy' && (
          <button type="button" className="btn-primary" onClick={() => setEditingStrategy(true)}>
            <PencilLine size={14} />
            编辑策略
          </button>
        )}
        {tab === 'versions' && (
          <button type="button" className="btn-secondary" onClick={() => setHowToOpen(true)}>
            <CircleHelp size={14} />
            如何生成新版本
          </button>
        )}
      </div>

      {/* S1 Tab 栏 */}
      <div className="flex h-11 items-center border-b border-border">
        {TABS.map((t) => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex h-full items-center gap-1.5 px-4 text-[13px] font-medium transition-colors duration-fast',
                active ? 'text-ink-1' : 'text-ink-3 hover:text-ink-1',
              )}
            >
              {t.locked && <Lock size={12} className="text-amber-500" aria-label="内部信息" />}
              {t.label}
              {t.key === 'versions' && (
                <span className="tnum font-mono text-[12px] text-ink-3">（{resumes.length}）</span>
              )}
              {active && (
                <motion.span
                  layoutId="strategy-tab-bar"
                  className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-accent-500"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          )
        })}
        {/* 内外提示图例 */}
        <span className="ml-auto hidden items-center gap-1 text-[11px] text-ink-3 md:flex">
          <Lock size={11} className="text-amber-500" />
          带此标的区域绝不外发
        </span>
      </div>

      {/* Tab 内容：160ms 交叉淡入 + 4px 上移 */}
      <div className="pt-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
          >
            {tab === 'strategy' && strategyRaw != null && (
              <InternalTab raw={strategyRaw} sections={splitStrategy(strategyRaw)} />
            )}
            {tab === 'master' && masterRaw != null && (
              <MasterTab raw={masterRaw} onEdit={() => setEditingMaster(true)} />
            )}
            {tab === 'versions' && (
              <VersionsTab list={resumes} jobs={jobs} onPreview={setPreviewMeta} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <VersionModal meta={previewMeta} masterRaw={masterRaw} onClose={() => setPreviewMeta(null)} />
      <HowToModal open={howToOpen} onClose={() => setHowToOpen(false)} />
    </div>
  )
}
