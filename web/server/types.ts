/** 契约（contracts/api.md）数据类型，前后端共用定义，字段名不得擅改。 */

export const JOB_SOURCES = ['boss', 'liepin', 'linkedin', 'lagou', '官网', '内推', '猎头', '其他'] as const;
export type JobSource = (typeof JOB_SOURCES)[number];

export const MATCH_GRADES = ['', '⭐', '⭐⭐', '⭐⭐⭐'] as const;
export type MatchGrade = (typeof MATCH_GRADES)[number];

export const JOB_STATUSES = [
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
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/** 状态 >= 已投递（视为「已发生过投递动作」，终态里 对方已拒/已结束 也必经投递） */
export const APPLIED_STATUSES: ReadonlySet<string> = new Set([
  '已投递',
  '被查看',
  '沟通中',
  '面试中',
  'offer',
  '对方已拒',
  '已结束',
]);

/** 岗位台账行（与 02-jobs/job-ledger.csv 一一对应） */
export type Job = {
  id: string; // J-YYYYMMDD-NN，如 J-20260717-03
  date_added: string; // YYYY-MM-DD
  company: string;
  position: string;
  source: JobSource;
  city: string;
  salary_range: string; // 原文如 "25-40K·14薪"
  jd_file: string; // 相对 02-jobs/jd/ 的文件名，可为空
  match_grade: MatchGrade;
  status: JobStatus;
  last_action: string; // YYYY-MM-DD 或 ''（种子数据允许带描述后缀，服务端解析日期前缀）
  next_step: string;
  notes: string;
};

export type Health = { ok: true; mode: 'demo' | 'workspace'; workspaceDir: string; version: string };

export type Stats = {
  today: { added: number; passed: number; pendingConfirm: number; applied: number };
  funnel: { status: JobStatus; count: number }[];
  trend14d: { date: string; added: number; applied: number }[];
  upcomingInterviews: { company: string; position: string; round: string; datetime: string }[];
  recentActivity: { time: string; text: string; kind: 'ledger' | 'report' | 'interview' | 'context' }[];
  pending: { confirmJobs: Job[]; decisions: string[] };
};

export type ReportMeta = { file: string; type: 'daily' | 'weekly'; date: string; title: string };
export type InterviewMeta = {
  file: string;
  company: string;
  position: string;
  status: string;
  updated: string;
  snippet: string;
};
export type ResumeMeta = { file: string; company: string; role: string; updated: string };
