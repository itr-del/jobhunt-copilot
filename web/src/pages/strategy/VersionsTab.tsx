import { useState } from 'react'
import { useNavigate } from 'react-router'
import { motion, useReducedMotion } from 'framer-motion'
import { Copy, Download, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Job, ResumeMeta } from '@/lib/api'
import StatusBadge from '@/components/StatusBadge'
import { copyText } from '@/pages/context/copy'
import { cn } from '@/lib/utils'

const EASE_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]

/**
 * Tab 3 · 定制版本（strategy.md S7/S8）：说明条 + 版本列表表格。
 * 预览弹窗由 Strategy 页持有（需要 masterRaw 做差异对比）。
 */
export default function VersionsTab({
  list,
  jobs,
  onPreview,
}: {
  list: ResumeMeta[]
  jobs: Job[]
  onPreview: (meta: ResumeMeta) => void
}) {
  const reduced = useReducedMotion()
  const navigate = useNavigate()
  const [downloading, setDownloading] = useState<string | null>(null)

  const findJob = (meta: ResumeMeta): Job | undefined =>
    jobs.find((j) => j.company === meta.company) ??
    jobs.find((j) => meta.company && j.company.includes(meta.company))

  const onCopyName = async (file: string) => {
    const ok = await copyText(file)
    if (ok) toast.success('文件名已复制')
    else toast.error('复制失败')
  }

  const onDownload = async (meta: ResumeMeta) => {
    if (downloading) return
    setDownloading(meta.file)
    try {
      const { raw } = await api.getResume(meta.file)
      const blob = new Blob([raw], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = meta.file
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast.error(`下载失败：${e instanceof Error ? e.message : '未知错误'}`)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="flex max-w-[860px] flex-col gap-4">
      {/* S7 说明条 */}
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: EASE_OUT }}
        className="flex min-h-10 items-center rounded-lg bg-accent-50 px-3 py-2 text-[12.5px] leading-[1.6] text-accent-ink"
      >
        按 JD 定制的简历版本。生成方式：对 AI 说「帮我为 J-20250710-001 定制简历」——只重组真实经历，绝不编造；外发前必须经过你确认。
      </motion.div>

      {list.length === 0 ? (
        /* 空态（S 空态 + public 插画） */
        <div className="card-base flex flex-col items-center justify-center gap-3 p-12 text-center">
          <motion.img
            src="/empty-reports.svg"
            alt=""
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="h-[110px] w-[160px]"
          />
          <p className="text-[14px] font-semibold text-ink-1">
            <span className="font-mono">runtime/resumes/</span> 还是空的
          </p>
          <p className="max-w-[360px] text-[13px] leading-[1.7] text-ink-3">
            对 AI 说「帮我为某个岗位定制简历」就会生成第一份
          </p>
        </div>
      ) : (
        /* S8 版本列表 */
        <div className="card-base overflow-hidden">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border bg-subtle">
                {['文件名', '关联岗位', '基于', '生成时间', '操作'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-medium text-ink-2 last:text-right">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((meta, i) => {
                const job = findJob(meta)
                return (
                  <motion.tr
                    key={meta.file}
                    initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                    animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: EASE_OUT, delay: Math.min(i, 12) * 0.035 }}
                    className={cn(
                      'h-14 border-b border-border transition-colors last:border-b-0 hover:bg-subtle/60',
                    )}
                  >
                    <td className="max-w-[280px] px-4 py-2">
                      <span className="block truncate font-mono text-[13px] text-ink-1" title={meta.file}>
                        {meta.file}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {job ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/jobs?id=${encodeURIComponent(job.id)}`)}
                          className="group flex items-center gap-2 text-left"
                          title={`打开岗位抽屉：${job.id}`}
                        >
                          <span className="text-[13px] text-ink-1 group-hover:text-accent-500 group-hover:underline">
                            {job.company} · {job.position}
                          </span>
                          <StatusBadge status={job.status} />
                        </button>
                      ) : (
                        <span className="text-[13px] text-ink-2">
                          {meta.company ? `${meta.company} · ${meta.role}` : meta.role}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-[12px] text-ink-3">
                      master-resume.md + JD 要点重组
                    </td>
                    <td className="tnum whitespace-nowrap px-4 py-2 font-mono text-[12px] text-ink-3">
                      {meta.updated}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-0.5">
                        <button type="button" className="btn-ghost h-7 px-2 text-[12px]" onClick={() => onPreview(meta)}>
                          <Eye size={12} />
                          预览
                        </button>
                        <button
                          type="button"
                          className="btn-ghost h-7 px-2 text-[12px]"
                          onClick={() => void onCopyName(meta.file)}
                        >
                          <Copy size={12} />
                          复制
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          aria-label={`下载 ${meta.file}`}
                          title="下载 .md"
                          disabled={downloading === meta.file}
                          onClick={() => void onDownload(meta)}
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
