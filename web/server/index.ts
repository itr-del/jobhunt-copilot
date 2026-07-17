import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import fs from 'node:fs';
import path from 'node:path';
import { interviewsRoutes } from './routes/interviews.js';
import { ledgerRoutes } from './routes/ledger.js';
import { profileRoutes } from './routes/profile.js';
import { reportsRoutes } from './routes/reports.js';
import { statsRoutes } from './routes/stats.js';
import type { Health } from './types.js';
import { getWorkspace, REPO_ROOT } from './workspace.js';

const API_VERSION = '1.0.0';
const PORT = Number.parseInt(process.env.PORT ?? '', 10) || 8787;
const DIST_DIR = path.join(REPO_ROOT, 'dist');

const app = new Hono();

// 开发期前端（vite :5173）跨域访问 /api 用；同源部署时无副作用
app.use('/api/*', cors());

// ── API 路由（契约 19 个端点）──
const api = new Hono();
api.get('/health', (c) => {
  const ws = getWorkspace();
  const health: Health = { ok: true, mode: ws.mode, workspaceDir: ws.dir, version: API_VERSION };
  return c.json(health);
});
api.route('/', statsRoutes);
api.route('/', ledgerRoutes);
api.route('/', reportsRoutes);
api.route('/', interviewsRoutes);
api.route('/', profileRoutes);
app.route('/api', api);

// /api 内未匹配路径统一 JSON 404
app.all('/api/*', (c) => c.json({ error: '接口不存在' }, 404));

// ── 生产模式：托管 dist/ + SPA fallback（除 /api 外全部回退 index.html）──
if (fs.existsSync(DIST_DIR)) {
  app.use('/*', serveStatic({ root: DIST_DIR }));
}
app.get('*', (c) => {
  const indexHtml = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexHtml)) {
    return c.html(fs.readFileSync(indexHtml, 'utf8'));
  }
  return c.json({ error: '前端未构建：dist/ 不存在（先运行 npm run build，或仅使用 /api）' }, 404);
});

app.notFound((c) => {
  if (c.req.path.startsWith('/api/')) return c.json({ error: '接口不存在' }, 404);
  return c.json({ error: '页面不存在' }, 404);
});

app.onError((err, c) => {
  console.error('[server] 未捕获错误：', err);
  return c.json({ error: `服务器内部错误：${err.message}` }, 500);
});

// 启动：解析工作区并校验关键文件（缺失自动从 demo-workspace 种子补齐，只补缺不覆盖）
const ws = getWorkspace();
console.log(`[server] 模式：${ws.mode} ｜ 工作区：${ws.dir}`);
console.log(`[server] 静态目录：${fs.existsSync(DIST_DIR) ? DIST_DIR : '（dist/ 不存在，仅提供 /api）'}`);

const server = serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`[server] jobhunt-copilot 后端已启动：http://localhost:${info.port}（API: /api/health）`);
});
server.on('error', (err) => {
  console.error(`[server] 启动失败：${err.message}（端口 ${PORT} 被占用？）`);
  process.exit(1);
});
