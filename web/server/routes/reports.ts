import { Hono } from 'hono';
import path from 'node:path';
import { listReports } from '../reports.js';
import { getWorkspace, readText, safeFileName } from '../workspace.js';

export const reportsRoutes = new Hono();

/** GET /api/reports —— 日报+周报，按日期倒序 */
reportsRoutes.get('/reports', (c) => {
  const ws = getWorkspace();
  return c.json({ list: listReports(ws) });
});

/** GET /api/reports/:file —— 报告 Markdown 原文 */
reportsRoutes.get('/reports/:file', (c) => {
  const file = safeFileName(c.req.param('file'));
  if (!file) return c.json({ error: '非法文件名（禁止 .. 与绝对路径，仅允许 .md/.csv）' }, 400);
  const ws = getWorkspace();
  const raw = readText(path.join(ws.dir, 'runtime', 'reports', file));
  if (raw == null) return c.json({ error: `报告不存在：${file}` }, 404);
  return c.json({ raw });
});
