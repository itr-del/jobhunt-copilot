import { Hono } from 'hono';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../workspace.js';

/**
 * 面试问答 `/api/qa`（interview-qa）：数据来自 server/data/qa.json（飞书「面试问答准备」导出）。
 *
 * 端点：
 *   GET /api/qa           全量（?cat=分类 &dim=维度 &q=关键词，均为可选过滤）
 *   GET /api/qa/meta      分类/维度选项 + 总数（前端 Tab/筛选用）
 *   GET /api/qa/random    随机抽题（?n=数量，默认 5；?cat=&dim= 限定范围）
 */

export type QaItem = {
  id: number;
  cat: string;
  dim: string;
  q: string;
  a: string;
  src: string;
};

const QA_FILE = path.join(REPO_ROOT, 'server', 'data', 'qa.json');

let cache: { items: QaItem[]; mtimeMs: number } | null = null;

function loadQa(): QaItem[] {
  try {
    const stat = fs.statSync(QA_FILE);
    if (cache && cache.mtimeMs === stat.mtimeMs) return cache.items;
    const raw = fs.readFileSync(QA_FILE, 'utf8');
    const data = JSON.parse(raw) as { questions: QaItem[] };
    cache = { items: data.questions ?? [], mtimeMs: stat.mtimeMs };
    return cache.items;
  } catch (err) {
    console.error('[qa] 读取 qa.json 失败：', err);
    return [];
  }
}

function pick<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export const qaRoutes = new Hono();

qaRoutes.get('/qa', (c) => {
  const cat = c.req.query('cat')?.trim();
  const dim = c.req.query('dim')?.trim();
  const q = c.req.query('q')?.trim().toLowerCase();
  let items = loadQa();
  if (cat) items = items.filter((x) => x.cat === cat);
  if (dim) items = items.filter((x) => x.dim === dim);
  if (q) items = items.filter((x) => x.q.toLowerCase().includes(q) || x.a.toLowerCase().includes(q));
  return c.json({ count: items.length, questions: items });
});

qaRoutes.get('/qa/meta', (c) => {
  const items = loadQa();
  const cats = [...new Set(items.map((x) => x.cat))].sort((a, b) => a.localeCompare(b, 'zh'));
  const dims = [...new Set(items.map((x) => x.dim))].sort((a, b) => a.localeCompare(b, 'zh'));
  return c.json({ count: items.length, cats, dims });
});

qaRoutes.get('/qa/random', (c) => {
  const n = Math.min(Number.parseInt(c.req.query('n') ?? '5', 10) || 5, 50);
  const cat = c.req.query('cat')?.trim();
  const dim = c.req.query('dim')?.trim();
  let items = loadQa();
  if (cat) items = items.filter((x) => x.cat === cat);
  if (dim) items = items.filter((x) => x.dim === dim);
  return c.json({ count: Math.min(n, items.length), questions: pick(items, n) });
});
