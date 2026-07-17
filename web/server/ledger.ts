import path from 'node:path';
import { parseCsv, stringifyCsv } from './csv.js';
import type { Job, JobSource, JobStatus, MatchGrade } from './types.js';
import { readText, todayStr, writeText, type Workspace } from './workspace.js';

/** 契约规定的台账表头（写回时保持该列顺序） */
export const LEDGER_HEADER = [
  'id',
  'date_added',
  'company',
  'position',
  'source',
  'city',
  'salary_range',
  'jd_file',
  'match_grade',
  'status',
  'last_action',
  'next_step',
  'notes',
] as const;

export function ledgerPath(ws: Workspace): string {
  return path.join(ws.dir, '02-jobs', 'job-ledger.csv');
}

function emptyJob(): Job {
  return {
    id: '',
    date_added: '',
    company: '',
    position: '',
    source: '其他',
    city: '',
    salary_range: '',
    jd_file: '',
    match_grade: '',
    status: '已收藏',
    last_action: '',
    next_step: '',
    notes: '',
  };
}

/** 读取全量台账（按文件内表头映射列；文件缺失/无数据返回空数组）。 */
export function readLedger(ws: Workspace): Job[] {
  const text = readText(ledgerPath(ws));
  if (text == null) return [];
  const rows = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ''));
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  const colIndex = new Map<string, number>();
  header.forEach((h, i) => colIndex.set(h, i));
  const jobs: Job[] = [];
  for (const r of rows.slice(1)) {
    const job = emptyJob();
    for (const key of LEDGER_HEADER) {
      const idx = colIndex.get(key);
      if (idx == null) continue;
      const value = r[idx] ?? '';
      (job as Record<string, string>)[key] = value;
    }
    if (!job.id) continue;
    jobs.push(job);
  }
  return jobs;
}

/** 按契约表头原顺序写回台账。 */
export function writeLedger(ws: Workspace, jobs: Job[]): void {
  const rows: string[][] = [[...LEDGER_HEADER]];
  for (const j of jobs) {
    rows.push(LEDGER_HEADER.map((k) => j[k]));
  }
  writeText(ledgerPath(ws), stringifyCsv(rows));
}

/**
 * 生成当日台账 id：J-YYYYMMDD-NN，当日序号递增
 * （扫描现有同日前缀 id 的最大序号 +1，至少两位数字）。
 */
export function nextLedgerId(jobs: Job[]): string {
  const compact = todayStr().replace(/-/g, '');
  const prefix = `J-${compact}-`;
  let max = 0;
  for (const j of jobs) {
    if (!j.id.startsWith(prefix)) continue;
    const seq = Number.parseInt(j.id.slice(prefix.length), 10);
    if (Number.isFinite(seq) && seq > max) max = seq;
  }
  return `${prefix}${String(max + 1).padStart(2, '0')}`;
}

export function isJobSource(v: unknown): v is JobSource {
  return typeof v === 'string' && (['boss', 'liepin', 'linkedin', 'lagou', '官网', '内推', '猎头', '其他'] as string[]).includes(v);
}

export function isJobStatus(v: unknown): v is JobStatus {
  return (
    typeof v === 'string' &&
    (['已收藏', '待投递', '已投递', '被查看', '沟通中', '面试中', 'offer', '对方已拒', '已放弃', '已结束'] as string[]).includes(v)
  );
}

export function isMatchGrade(v: unknown): v is MatchGrade {
  return typeof v === 'string' && (['', '⭐', '⭐⭐', '⭐⭐⭐'] as string[]).includes(v);
}
