import { Hono } from 'hono';
import path from 'node:path';
import type { ResumeMeta } from '../types.js';
import { fileDate, getWorkspace, listMdFiles, readText, safeFileName, withWriteLock, writeText } from '../workspace.js';

export const profileRoutes = new Hono();

function registerRawFileRoutes(route: string, relPath: string, label: string): void {
  profileRoutes.get(route, (c) => {
    const ws = getWorkspace();
    const raw = readText(path.join(ws.dir, relPath));
    if (raw == null) return c.json({ error: `${label}不存在：${relPath}` }, 404);
    return c.json({ raw });
  });
  profileRoutes.put(route, async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: '请求体不是合法 JSON 对象' }, 400);
    }
    const raw = (body as { raw?: unknown })?.raw;
    if (typeof raw !== 'string') return c.json({ error: '缺少字段：raw（字符串）' }, 400);
    await withWriteLock(() => {
      const ws = getWorkspace();
      writeText(path.join(ws.dir, relPath), raw);
    });
    return c.json({ ok: true });
  });
}

registerRawFileRoutes('/context', 'CONTEXT.md', 'CONTEXT.md');
registerRawFileRoutes('/profile/master', path.join('01-profile', 'master-resume.md'), '主简历');
registerRawFileRoutes('/profile/strategy', path.join('01-profile', '_internal', 'strategy.md'), '对内策略笔记');

/** GET /api/resumes —— runtime/resumes/ 定制版本列表 */
profileRoutes.get('/resumes', (c) => {
  const ws = getWorkspace();
  const dir = path.join(ws.dir, 'runtime', 'resumes');
  const list: ResumeMeta[] = [];
  for (const file of listMdFiles(dir)) {
    const base = file.replace(/\.md$/i, '');
    const dash = base.indexOf('-');
    const company = dash > 0 ? base.slice(0, dash) : '';
    const role = dash > 0 ? base.slice(dash + 1) : base;
    list.push({ file, company, role, updated: fileDate(path.join(dir, file)) });
  }
  list.sort((a, b) => b.updated.localeCompare(a.updated) || a.file.localeCompare(b.file));
  return c.json({ list });
});

/** GET /api/resumes/:file —— 单个定制简历 Markdown 原文 */
profileRoutes.get('/resumes/:file', (c) => {
  const file = safeFileName(c.req.param('file'));
  if (!file) return c.json({ error: '非法文件名' }, 400);
  const ws = getWorkspace();
  const raw = readText(path.join(ws.dir, 'runtime', 'resumes', file));
  if (raw == null) return c.json({ error: `定制简历不存在：${file}` }, 404);
  return c.json({ raw });
});
