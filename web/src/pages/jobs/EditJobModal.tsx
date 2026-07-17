import { useState } from 'react'
import { toast } from 'sonner'
import type { Job, MatchGrade } from '@/lib/api'
import { api } from '@/lib/api'
import GradeStars from '@/components/GradeStars'
import SourceTag from '@/components/SourceTag'
import { Spinner } from '@/components/ui/spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import ModalShell from './ModalShell'

/**
 * 「编辑基本信息」弹窗（jobs.md S4 底部操作条）。
 * 契约 PATCH 仅支持 match_grade / next_step / notes / status / last_action，
 * 因此公司/岗位/来源/城市/薪资展示为只读，评级与下一步可编辑保存。
 */

const GRADE_CHOICES: { value: MatchGrade; label: string }[] = [
  { value: '', label: '未评级' },
  { value: '⭐', label: '一星' },
  { value: '⭐⭐', label: '二星' },
  { value: '⭐⭐⭐', label: '三星' },
]

const readOnlyClass =
  'h-8 w-full cursor-not-allowed rounded-md border border-border bg-subtle px-3 text-[13px] text-ink-3'

export default function EditJobModal({
  job,
  onClose,
  onSaved,
}: {
  job: Job
  onClose: () => void
  onSaved: (row: Job) => void
}) {
  const [grade, setGrade] = useState<MatchGrade>(job.match_grade)
  const [nextStep, setNextStep] = useState(job.next_step)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (busy) return
    setBusy(true)
    try {
      const { row } = await api.updateJob(job.id, {
        match_grade: grade,
        next_step: nextStep.trim(),
      })
      toast.success('已保存', { description: `${row.company} · ${row.position}` })
      onSaved(row)
      onClose()
    } catch (e) {
      toast.error(`保存失败：${e instanceof Error ? e.message : '未知错误'}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalShell onClose={onClose} label="编辑基本信息" width={560}>
      <div className="p-6">
        <h2 className="text-[16px] font-semibold text-ink-1">编辑基本信息</h2>
        <p className="mt-1 text-[13px] leading-[1.6] text-ink-2">
          公司、岗位等基本信息由求职工作流维护；这里可调整评级与下一步。
        </p>

        <form
          className="mt-5"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="mb-1.5 block text-[12px] font-medium text-ink-2">公司</span>
              <div className={readOnlyClass}>{job.company}</div>
            </div>
            <div>
              <span className="mb-1.5 block text-[12px] font-medium text-ink-2">岗位</span>
              <div className={`${readOnlyClass} truncate`} title={job.position}>
                {job.position}
              </div>
            </div>
            <div>
              <span className="mb-1.5 block text-[12px] font-medium text-ink-2">来源</span>
              <div className={`${readOnlyClass} flex items-center`}>
                <SourceTag source={job.source} />
              </div>
            </div>
            <div>
              <span className="mb-1.5 block text-[12px] font-medium text-ink-2">城市</span>
              <div className={readOnlyClass}>{job.city || '—'}</div>
            </div>
            <div>
              <span className="mb-1.5 block text-[12px] font-medium text-ink-2">薪资范围</span>
              <div className={`${readOnlyClass} font-mono text-[12.5px]`}>
                {job.salary_range || '—'}
              </div>
            </div>
            <div className="group">
              <label className="mb-1.5 block text-[12px] font-medium text-ink-2 transition-colors duration-instant group-focus-within:text-accent-500">
                评级
              </label>
              <Select
                value={grade || 'none'}
                onValueChange={(v) => setGrade((v === 'none' ? '' : v) as MatchGrade)}
              >
                <SelectTrigger className="h-8 w-full text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_CHOICES.map((g) => (
                    <SelectItem key={g.label} value={g.value || 'none'} className="text-[13px]">
                      {g.value ? <GradeStars grade={g.value} size={12} /> : g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="group col-span-2">
              <label className="mb-1.5 block text-[12px] font-medium text-ink-2 transition-colors duration-instant group-focus-within:text-accent-500">
                下一步
              </label>
              <input
                value={nextStep}
                onChange={(e) => setNextStep(e.target.value)}
                placeholder="如 等 HR 回复，一周无动静跟进"
                className="h-8 w-full rounded-md border border-border bg-surface px-3 text-[13px] text-ink-1 transition-[box-shadow,border-color] duration-instant placeholder:text-ink-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
              取消
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy && <Spinner className="size-3.5" aria-hidden />}
              保存更改
            </button>
          </div>
        </form>
      </div>
    </ModalShell>
  )
}
