import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * 「+ 新建档案」Modal（interviews.md 页面骨架）：
 * 输入公司名 + 岗位，生成模板文件（PUT /api/interviews/<company>.md）。
 * 提示：一般由 AI 在 interview-prep 流程里自动建档。
 */

function template(company: string, position: string): string {
  return `# 面试档案 —— ${company}

- 公司：${company}
- 岗位：${position}
- 状态：沟通中

## 公司调研要点

- （主营 / 阶段 / 产品体验 / 近期动态）

## 预测问题

### 1. （预测问题）

答题要点：（答题要点）

## 问答库

- Q：（常见问题） A：（回答口径）

## 轮次记录

## 复盘

## 下一步

## 状态变更记录
`
}

export default function NewArchiveDialog({
  open,
  onOpenChange,
  existingCompanies,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingCompanies: string[]
  onCreated: (company: string) => void
}) {
  const [company, setCompany] = useState('')
  const [position, setPosition] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setCompany('')
    setPosition('')
    setError('')
    setSaving(false)
  }

  const submit = async () => {
    const c = company.trim()
    const p = position.trim()
    if (!c) {
      setError('请填写公司名')
      return
    }
    if (!p) {
      setError('请填写岗位')
      return
    }
    if (existingCompanies.includes(c)) {
      setError(`${c} 的档案已存在`)
      return
    }
    setError('')
    setSaving(true)
    try {
      await api.putInterview(`${c}.md`, template(c, p))
      toast.success(`已创建「${c}」的面试档案`)
      onOpenChange(false)
      reset()
      onCreated(c)
    } catch (e) {
      toast.error(`创建失败：${e instanceof Error ? e.message : '未知错误'}`)
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) reset()
      }}
    >
      <DialogContent className="rounded-2xl border-border bg-surface p-6 shadow-e3 sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold text-ink-1">新建面试档案</DialogTitle>
          <DialogDescription className="text-[13px] text-ink-2">
            一般由 AI 在 interview-prep 流程里自动建档；也可以在这里手动补建。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-ink-2">公司名</span>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="如：鸣沙数据"
              autoFocus
              className="h-8 rounded-md border border-border bg-surface px-2.5 text-[13px] text-ink-1 outline-none placeholder:text-ink-4 focus:border-transparent focus:outline-2 focus:outline-accent-500"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-ink-2">岗位</span>
            <input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="如：高级产品经理（数据方向）"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submit()
              }}
              className="h-8 rounded-md border border-border bg-surface px-2.5 text-[13px] text-ink-1 outline-none placeholder:text-ink-4 focus:border-transparent focus:outline-2 focus:outline-accent-500"
            />
          </label>
          {error && <p className="text-[12px] text-[#DC2626]">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <button type="button" className="btn-secondary" onClick={() => onOpenChange(false)}>
            取消
          </button>
          <button type="button" className="btn-primary" onClick={() => void submit()} disabled={saving}>
            {saving ? '创建中…' : '创建档案'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
