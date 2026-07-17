import { useState } from 'react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import type { Job, JobSource, MatchGrade } from '@/lib/api'
import { api } from '@/lib/api'
import GradeStars from '@/components/GradeStars'
import { SOURCE_LABEL } from '@/lib/meta'
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
 * S5 · 新增岗位弹窗（jobs.md）：宽 640px，两列网格。
 * 保存 → POST /api/ledger（status=已收藏）；评级非空时补 PATCH match_grade（契约 POST 不收评级）。
 * 公司+岗位重复 → 409：错误 Toast + 直接打开原岗位抽屉。
 * JD 框聚焦高度 8→10 行过渡 180ms；字段聚焦标签 120ms 变青色。
 */

const SOURCE_ORDER: JobSource[] = ['boss', 'liepin', 'linkedin', 'lagou', '官网', '内推', '猎头', '其他']

const GRADE_CHOICES: { value: MatchGrade; label: string }[] = [
  { value: '', label: '未评' },
  { value: '⭐', label: '一星' },
  { value: '⭐⭐', label: '二星' },
  { value: '⭐⭐⭐', label: '三星' },
]

function Field({
  label,
  required,
  children,
  className,
}: {
  label: string
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`group ${className ?? ''}`}>
      <label className="mb-1.5 block text-[12px] font-medium text-ink-2 transition-colors duration-instant group-focus-within:text-accent-500">
        {label}
        {required && <span className="ml-0.5 text-[#DC2626]">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass =
  'h-8 w-full rounded-md border border-border bg-surface px-3 text-[13px] text-ink-1 transition-[box-shadow,border-color] duration-instant placeholder:text-ink-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500'

export default function AddJobModal({
  onClose,
  onCreated,
  onConflict,
}: {
  onClose: () => void
  /** 保存成功（row 为服务端返回的新行） */
  onCreated: (row: Job) => void
  /** 公司+岗位重复：父级匹配原行并打开其抽屉，返回是否找到 */
  onConflict: (company: string, position: string) => boolean
}) {
  const [company, setCompany] = useState('')
  const [position, setPosition] = useState('')
  const [source, setSource] = useState<JobSource>('boss')
  const [city, setCity] = useState('')
  const [salary, setSalary] = useState('')
  const [grade, setGrade] = useState<MatchGrade>('')
  const [jd, setJd] = useState('')
  const [jdFocused, setJdFocused] = useState(false)
  const [busy, setBusy] = useState(false)

  const valid = company.trim() !== '' && position.trim() !== ''

  const submit = async () => {
    if (!valid || busy) return
    // 本地预检：公司+岗位为去重键（服务端 409 为最终裁决）
    if (onConflict(company.trim(), position.trim())) {
      toast.error(
        `台账已有「${company.trim()} · ${position.trim()}」——去重键是公司+岗位，已为你打开原岗位`,
      )
      onClose()
      return
    }
    setBusy(true)
    try {
      const { row } = await api.createJob({
        company: company.trim(),
        position: position.trim(),
        source,
        city: city.trim() || undefined,
        salary_range: salary.trim() || undefined,
        jd_text: jd.trim() || undefined,
      })
      // 契约 POST 不接收评级：非「未评」时补一次 PATCH
      if (grade) {
        try {
          await api.updateJob(row.id, { match_grade: grade })
          row.match_grade = grade
        } catch {
          toast.error('评级保存失败，可稍后在详情里补')
        }
      }
      toast.success('已收藏 · 等待下一轮初筛', { description: `${row.company} · ${row.position}` })
      onCreated(row)
      onClose()
    } catch (e) {
      // 409 去重：api client 只透传错误文案，这里按公司+岗位在本地找原行开抽屉
      if (onConflict(company.trim(), position.trim())) {
        toast.error(
          `台账已有「${company.trim()} · ${position.trim()}」——去重键是公司+岗位，已为你打开原岗位`,
        )
        onClose()
      } else {
        toast.error(e instanceof Error ? e.message : '保存失败，请重试')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalShell onClose={onClose} label="新增岗位" width={640}>
      <div className="p-6">
        <h2 className="text-[16px] font-semibold text-ink-1">新增岗位</h2>
        <p className="mt-1 text-[13px] leading-[1.6] text-ink-2">
          粘贴 JD 全文，补几个关键字段。保存后岗位进入「已收藏」，由 AI 在下一轮工作流里初筛评级。
        </p>

        <form
          className="mt-5"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="公司" required>
              <input
                autoFocus
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={inputClass}
                placeholder="如 蜂鸟互动"
              />
            </Field>
            <Field label="岗位" required>
              <input
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className={inputClass}
                placeholder="如 产品经理（工具方向）"
              />
            </Field>
            <Field label="来源">
              <Select value={source} onValueChange={(v) => setSource(v as JobSource)}>
                <SelectTrigger className="h-8 w-full text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_ORDER.map((s) => (
                    <SelectItem key={s} value={s} className="text-[13px]">
                      {SOURCE_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="城市">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputClass}
                placeholder="如 杭州 / 远程"
              />
            </Field>
            <Field label="薪资范围">
              <input
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className={`${inputClass} font-mono text-[12.5px]`}
                placeholder="如 26-38K·14薪，或 面议"
              />
            </Field>
            <Field label="评级">
              <Select value={grade || 'none'} onValueChange={(v) => setGrade((v === 'none' ? '' : v) as MatchGrade)}>
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
            </Field>
            <Field label="JD 全文" className="col-span-2">
              <div className="relative">
                <textarea
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                  onFocus={() => setJdFocused(true)}
                  onBlur={() => setJdFocused(false)}
                  rows={8}
                  placeholder="把招聘 App 里的岗位描述整段粘贴到这里…"
                  className="w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-[13px] leading-[1.6] text-ink-1 placeholder:text-ink-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
                  style={{ height: jdFocused ? 216 : 172, transition: 'height 180ms cubic-bezier(0.16, 1, 0.3, 1)' }}
                />
                <span className="tnum pointer-events-none absolute bottom-2 right-2 font-mono text-[11px] text-ink-3">
                  {jd.length} 字
                </span>
              </div>
            </Field>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
              取消
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!valid || busy}
              title={valid ? undefined : '公司和岗位必填'}
            >
              {busy && <Spinner className="size-3.5" aria-hidden />}
              保存岗位
            </button>
          </div>
        </form>
      </div>
    </ModalShell>
  )
}
