import { Hono } from 'hono';
import path from 'node:path';
import { listUpcomingInterviews } from '../interviews.js';
import { readLedger } from '../ledger.js';
import { listReports } from '../reports.js';
import { APPLIED_STATUSES, JOB_STATUSES, type JobStatus, type Stats } from '../types.js';
import { daysAgoStr, extractDate, getWorkspace, readText, todayStr } from '../workspace.js';

export const statsRoutes = new Hono();

/** 解析 CONTEXT.md「七、待定决策清单」节：每条列表项一条原文（去掉列表符号）。 */
function parsePendingDecisions(raw: string): string[] {
  const lines = raw.split('\n');
  const start = lines.findIndex((l) => /^##\s*七、待定决策清单/.test(l));
  if (start < 0) return [];
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s/.test(line)) break;
    const t = line.trim();
    if (t.startsWith('- ') || t.startsWith('* ')) {
      const text = t.slice(2).trim();
      if (text) out.push(text);
    }
  }
  return out;
}

/** GET /api/stats —— 仪表盘数据（服务端从台账 + CONTEXT + 面试档案 + 报告计算） */
statsRoutes.get('/stats', (c) => {
  const ws = getWorkspace();
  const rows = readLedger(ws);
  const today = todayStr();

  // 今日概况
  const added = rows.filter((r) => r.date_added === today).length;
  const passed = rows.filter((r) => r.match_grade !== '' && extractDate(r.last_action) === today).length;
  const pendingConfirm = rows.filter((r) => r.status === '待投递').length;
  const applied = rows.filter((r) => APPLIED_STATUSES.has(r.status) && extractDate(r.last_action) === today).length;

  // 漏斗：10 态全给，含 0
  const funnel = JOB_STATUSES.map((status: JobStatus) => ({
    status,
    count: rows.filter((r) => r.status === status).length,
  }));

  // 近 14 天趋势：added 按 date_added，applied 按 last_action（且状态已过已投递）
  const trend14d = Array.from({ length: 14 }, (_, i) => {
    const date = daysAgoStr(13 - i);
    return {
      date,
      added: rows.filter((r) => r.date_added === date).length,
      applied: rows.filter((r) => APPLIED_STATUSES.has(r.status) && extractDate(r.last_action) === date).length,
    };
  });

  // 最近动态：台账 last_action + 报告日期，合成最近 10 条
  const activity: Stats['recentActivity'] = [];
  for (const r of rows) {
    const date = extractDate(r.last_action);
    if (!date) continue;
    const desc = r.last_action.replace(date, '').trim();
    activity.push({
      time: date,
      text: `${r.company} ${r.position}：${desc || `状态更新为 ${r.status}`}`,
      kind: 'ledger',
    });
  }
  for (const report of listReports(ws)) {
    activity.push({ time: report.date, text: `${report.title} 已生成`, kind: 'report' });
  }
  activity.sort((a, b) => b.time.localeCompare(a.time));
  const recentActivity = activity.slice(0, 10);

  // 待定决策：CONTEXT.md 第七节
  const contextRaw = readText(path.join(ws.dir, 'CONTEXT.md')) ?? '';
  const decisions = parsePendingDecisions(contextRaw);

  const stats: Stats = {
    today: { added, passed, pendingConfirm, applied },
    funnel,
    trend14d,
    upcomingInterviews: listUpcomingInterviews(ws),
    recentActivity,
    pending: { confirmJobs: rows.filter((r) => r.status === '待投递'), decisions },
  };
  return c.json(stats);
});
