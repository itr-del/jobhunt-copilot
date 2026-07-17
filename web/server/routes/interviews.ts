import { Hono } from 'hono';
import path from 'node:path';
import { listInterviews } from '../interviews.js';
import { getWorkspace, readText, safeMdFileName, withWriteLock, writeText } from '../workspace.js';

export const interviewsRoutes = new Hono();

/** GET /api/interviews —— 面试档案列表 */
interviewsRoutes.get('/interviews', (c) => {
  const ws = getWorkspace();
  return c.json({ list: listInterviews(ws) });
});

/** GET /api/interviews/:file —— 档案 Markdown 原文 */
interviewsRoutes.get('/interviews/:file', (c) => {
  const file = safeMdFileName(c.req.param('file'));
  if (!file) return c.json({ error: '非法文件名（禁止 .. 与绝对路径，仅允许 .md）' }, 400);
  const ws = getWorkspace();
  const raw = readText(path.join(ws.dir, '03-interview', file));
  if (raw == null) return c.json({ error: `面试档案不存在：${file}` }, 404);
  return c.json({ raw });
});

/** PUT /api/interviews/:file —— 整文件覆写 */
interviewsRoutes.put('/interviews/:file', async (c) => {
  const file = safeMdFileName(c.req.param('file'));
  if (!file) return c.json({ error: '非法文件名（禁止 .. 与绝对路径，仅允许 .md）' }, 400);
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
    writeText(path.join(ws.dir, '03-interview', file), raw);
  });
  return c.json({ ok: true });
});
