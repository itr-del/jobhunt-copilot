/**
 * 状态 / 来源的展示元数据（design.md §3.4 / §3.5）。
 * 与 StatusBadge / SourceTag 组件共用；图表、时间线等场景可直接取用颜色值。
 */
import type { JobSource, JobStatus } from '@/lib/api'

// ---------------------------------------------------------------------------
// 状态（10 态，全站唯一状态语言）
// ---------------------------------------------------------------------------

/** 状态主色（徽标文字/圆点、图表系列、时间线节点共用） */
export const STATUS_COLOR: Record<JobStatus, string> = {
  已收藏: '#64748B',
  待投递: '#B45309',
  已投递: '#2563EB',
  被查看: '#7C3AED',
  沟通中: '#0E7490',
  面试中: '#C2410C',
  offer: '#15803D',
  对方已拒: '#BE123C',
  已放弃: '#78716C',
  已结束: '#57534E',
}

/** 状态徽标配色类名（浅底深字；深色主题 14% 透明度底 + 提亮文字） */
export const STATUS_STYLE: Record<JobStatus, { badge: string; dot: string }> = {
  已收藏: {
    badge: 'bg-status-saved-bg text-status-saved-text dark:bg-[#64748B24] dark:text-[#929EAE]',
    dot: 'bg-status-saved-text dark:bg-[#929EAE]',
  },
  待投递: {
    badge: 'bg-status-pending-bg text-status-pending-text dark:bg-[#B4530924] dark:text-[#CA8753]',
    dot: 'bg-status-pending-text dark:bg-[#CA8753]',
  },
  已投递: {
    badge: 'bg-status-applied-bg text-status-applied-text dark:bg-[#2563EB24] dark:text-[#6692F1]',
    dot: 'bg-status-applied-text dark:bg-[#6692F1]',
  },
  被查看: {
    badge: 'bg-status-viewed-bg text-status-viewed-text dark:bg-[#7C3AED24] dark:text-[#A375F2]',
    dot: 'bg-status-viewed-text dark:bg-[#A375F2]',
  },
  沟通中: {
    badge: 'bg-status-chatting-bg text-status-chatting-text dark:bg-[#0E749024] dark:text-[#569EB1]',
    dot: 'bg-status-chatting-text dark:bg-[#569EB1]',
  },
  面试中: {
    badge: 'bg-status-interviewing-bg text-status-interviewing-text dark:bg-[#C2410C24] dark:text-[#D47A55]',
    dot: 'bg-status-interviewing-text dark:bg-[#D47A55]',
  },
  offer: {
    badge: 'bg-status-offer-bg text-status-offer-text dark:bg-[#15803D24] dark:text-[#5BA677]',
    dot: 'bg-status-offer-text dark:bg-[#5BA677]',
  },
  对方已拒: {
    badge: 'bg-status-rejected-bg text-status-rejected-text dark:bg-[#BE123C24] dark:text-[#D25976]',
    dot: 'bg-status-rejected-text dark:bg-[#D25976]',
  },
  已放弃: {
    badge: 'bg-status-abandoned-bg text-status-abandoned-text dark:bg-[#78716C24] dark:text-[#A09C98]',
    dot: 'bg-status-abandoned-text dark:bg-[#A09C98]',
  },
  已结束: {
    badge: 'bg-status-closed-bg text-status-closed-text dark:bg-[#57534E24] dark:text-[#898783]',
    dot: 'bg-status-closed-text dark:bg-[#898783]',
  },
}

/** 全部 10 态（合法流转顺序，终态在后） */
export const JOB_STATUSES: JobStatus[] = [
  '已收藏',
  '待投递',
  '已投递',
  '被查看',
  '沟通中',
  '面试中',
  'offer',
  '对方已拒',
  '已放弃',
  '已结束',
]

// ---------------------------------------------------------------------------
// 来源（存储值 → 显示名 → 色）
// ---------------------------------------------------------------------------

export type SourceMeta = { label: string; tag: string; chip: string }

/** 来源标签配色类名：tag = 整签（底色 + 文字色），chip = 16×16 首字符方块（来源色底） */
export const SOURCE_META: Record<JobSource, SourceMeta> = {
  boss: {
    label: 'BOSS直聘',
    tag: 'bg-source-boss-bg text-source-boss-text dark:bg-[#0E9F8024] dark:text-[#56BCA6]',
    chip: 'bg-source-boss-text dark:bg-[#56BCA6]',
  },
  liepin: {
    label: '猎聘',
    tag: 'bg-source-liepin-bg text-source-liepin-text dark:bg-[#EA580C24] dark:text-[#F08A55]',
    chip: 'bg-source-liepin-text dark:bg-[#F08A55]',
  },
  linkedin: {
    label: 'LinkedIn',
    tag: 'bg-source-linkedin-bg text-source-linkedin-text dark:bg-[#2563EB24] dark:text-[#6692F1]',
    chip: 'bg-source-linkedin-text dark:bg-[#6692F1]',
  },
  lagou: {
    label: '拉勾',
    tag: 'bg-source-lagou-bg text-source-lagou-text dark:bg-[#65A30D24] dark:text-[#93BF56]',
    chip: 'bg-source-lagou-text dark:bg-[#93BF56]',
  },
  官网: {
    label: '官网',
    tag: 'bg-source-official-bg text-source-official-text dark:bg-[#6366F124] dark:text-[#9294F5]',
    chip: 'bg-source-official-text dark:bg-[#9294F5]',
  },
  内推: {
    label: '内推',
    tag: 'bg-source-referral-bg text-source-referral-text dark:bg-[#8B5CF624] dark:text-[#AE8DF9]',
    chip: 'bg-source-referral-text dark:bg-[#AE8DF9]',
  },
  猎头: {
    label: '猎头',
    tag: 'bg-source-hunter-bg text-source-hunter-text dark:bg-[#DB277724] dark:text-[#E668A0]',
    chip: 'bg-source-hunter-text dark:bg-[#E668A0]',
  },
  其他: {
    label: '其他',
    tag: 'bg-source-other-bg text-source-other-text dark:bg-[#78716C24] dark:text-[#A09C98]',
    chip: 'bg-source-other-text dark:bg-[#A09C98]',
  },
}

/** 存储值 → 显示名 */
export const SOURCE_LABEL: Record<JobSource, string> = Object.fromEntries(
  Object.entries(SOURCE_META).map(([key, meta]) => [key, meta.label]),
) as Record<JobSource, string>

/** 来源主色（首字符方块、图表等场景直接用 hex） */
export const SOURCE_COLOR: Record<JobSource, string> = {
  boss: '#0E9F80',
  liepin: '#EA580C',
  linkedin: '#2563EB',
  lagou: '#65A30D',
  官网: '#6366F1',
  内推: '#8B5CF6',
  猎头: '#DB2777',
  其他: '#78716C',
}
