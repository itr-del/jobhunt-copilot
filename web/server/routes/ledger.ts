import { Hono } from 'hono';
import path from 'node:path';
import { isJobSource, isJobStatus, isMatchGrade, nextLedgerId, readLedger, writeLedger } from '../ledger.js';
import type { Job } from '../types.js';
import {
  getWorkspace,
  readText,
  safeFileName,
  sanitizeFilePart,
  todayStr,
  withWriteLock,
  writeText,
} from '../workspace.js';

async function readJson(c: { req: { json: () => Promise<unknown> } }): Promise<Record<string, unknown> | null> {
  try {
    const body = await c.req.json();
    if (body && typeof body === 'object' && !Array.isArray(body)) return body as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export const ledgerRoutes = new Hono();

/** GET /api/ledger —— 全量台账 */
ledgerRoutes.get('/ledger', (c) => {
  const ws = getWorkspace();
  return c.json({ rows: readLedger(ws) });
});

/**
 * POST /api/ledger —— 新行：status=已收藏、date_added/last_action=今天、id 自增；
 * jd_text 非空则写 02-jobs/jd/<company>-<position>.md 并回填 jd_file；
 * company+position 重复 → 409 { error, existing }
 */
ledgerRoutes.post('/ledger', async (c) => {
  const body = await readJson(c);
  if (!body) return c.json({ error: '请求体不是合法 JSON 对象' }, 400);
  const company = asString(body.company);
  const position = asString(body.position);
  const source = asString(body.source);
  if (!company) return c.json({ error: '缺少必填字段：company' }, 400);
  if (!position) return c.json({ error: '缺少必填字段：position' }, 400);
  if (!source) return c.json({ error: '缺少必填字段：source' }, 400);
  if (!isJobSource(source)) return c.json({ error: `source 非法：${source}（允许 boss/liepin/linkedin/lagou/官网/内推/猎头/其他）` }, 400);
  const city = asString(body.city);
  const salaryRange = asString(body.salary_range);
  const notes = asString(body.notes);
  const jdText = typeof body.jd_text === 'string' ? body.jd_text : '';

  return withWriteLock(() => {
    const ws = getWorkspace();
    const jobs = readLedger(ws);
    const existing = jobs.find((j) => j.company === company && j.position === position);
    if (existing) {
      return c.json({ error: `台账已存在相同公司+岗位：${company} · ${position}`, existing }, 409);
    }
    let jdFile = '';
    if (jdText.trim() !== '') {
      jdFile = `${sanitizeFilePart(company)}-${sanitizeFilePart(position)}.md`;
      writeText(path.join(ws.dir, '02-jobs', 'jd', jdFile), jdText);
    }
    const today = todayStr();
    const row: Job = {
      id: nextLedgerId(jobs),
      date_added: today,
      company,
      position,
      source,
      city,
      salary_range: salaryRange,
      jd_file: jdFile,
      match_grade: '',
      status: '已收藏',
      last_action: today,
      next_step: '待初筛',
      notes,
    };
    jobs.push(row);
    writeLedger(ws, jobs);
    return c.json({ row });
  });
});

/**
 * PATCH /api/ledger/:id —— 局部更新 { status?, next_step?, notes?, match_grade?, last_action? }；
 * 改 status 时服务端自动把 last_action 设为今天（除非显式传 last_action）；id 不存在 → 404
 */
ledgerRoutes.patch('/ledger/:id', async (c) => {
  const id = c.req.param('id');
  const body = await readJson(c);
  if (!body) return c.json({ error: '请求体不是合法 JSON 对象' }, 400);
  if (body.status !== undefined && !isJobStatus(body.status)) {
    return c.json({ error: `status 非法：${String(body.status)}` }, 400);
  }
  if (body.match_grade !== undefined && !isMatchGrade(body.match_grade)) {
    return c.json({ error: `match_grade 非法：${String(body.match_grade)}（允许 "" / ⭐ / ⭐⭐ / ⭐⭐⭐）` }, 400);
  }

  return withWriteLock(() => {
    const ws = getWorkspace();
    const jobs = readLedger(ws);
    const row = jobs.find((j) => j.id === id);
    if (!row) return c.json({ error: `台账不存在 id：${id}` }, 404);

    const statusChanged = body.status !== undefined;
    if (isJobStatus(body.status)) row.status = body.status;
    if (body.next_step !== undefined) row.next_step = typeof body.next_step === 'string' ? body.next_step : row.next_step;
    if (body.notes !== undefined) row.notes = typeof body.notes === 'string' ? body.notes : row.notes;
    if (isMatchGrade(body.match_grade)) row.match_grade = body.match_grade;
    if (body.last_action !== undefined) {
      row.last_action = typeof body.last_action === 'string' ? body.last_action : row.last_action;
    } else if (statusChanged) {
      row.last_action = todayStr();
    }
    writeLedger(ws, jobs);
    return c.json({ row });
  });
});

/** GET /api/jd/:file —— JD Markdown 原文；空/不存在 → 404 */
ledgerRoutes.get('/jd/:file', (c) => {
  const file = safeFileName(c.req.param('file'));
  if (!file) return c.json({ error: '非法文件名（禁止 .. 与绝对路径，仅允许 .md/.csv）' }, 400);
  const ws = getWorkspace();
  const raw = readText(path.join(ws.dir, '02-jobs', 'jd', file));
  if (raw == null) return c.json({ error: `JD 文件不存在：${file}` }, 404);
  return c.json({ raw });
});
