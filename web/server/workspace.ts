import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** 工作区解析结果 */
export type Workspace = {
  /** 工作区根目录（绝对路径） */
  dir: string;
  /** demo = 仓库内置 demo-workspace/；workspace = WORKSPACE_DIR 指定 */
  mode: 'demo' | 'workspace';
};

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
/** 仓库根目录（server/ 的上一级） */
export const REPO_ROOT = path.resolve(SERVER_DIR, '..');
/** 仓库内置演示工作区（同时作为种子模板来源） */
export const DEMO_WORKSPACE_DIR = path.join(REPO_ROOT, 'demo-workspace');

/** 启动时必须存在的关键文件（缺失则从 demo-workspace 模板种子补齐，只补缺不覆盖） */
const REQUIRED_FILES = ['CONTEXT.md', path.join('02-jobs', 'job-ledger.csv')];

let cached: Workspace | null = null;

/**
 * 解析工作区：WORKSPACE_DIR 环境变量优先，未设置用仓库内置 demo-workspace/（demo 模式）。
 * 解析后校验关键文件，缺失自动用模板种子补齐（只补缺不覆盖），并写日志。
 */
export function getWorkspace(): Workspace {
  if (cached) return cached;
  const envDir = process.env.WORKSPACE_DIR?.trim();
  const ws: Workspace = envDir
    ? { dir: path.resolve(envDir), mode: 'workspace' }
    : { dir: DEMO_WORKSPACE_DIR, mode: 'demo' };
  ensureSeeded(ws);
  cached = ws;
  return ws;
}

/** 校验关键文件存在；缺失则从 DEMO_WORKSPACE_DIR 拷贝补齐（已存在的不覆盖）。 */
function ensureSeeded(ws: Workspace): void {
  for (const rel of REQUIRED_FILES) {
    const target = path.join(ws.dir, rel);
    if (fs.existsSync(target)) continue;
    const source = path.join(DEMO_WORKSPACE_DIR, rel);
    if (!fs.existsSync(source)) {
      console.warn(`[workspace] 关键文件缺失且模板不存在，无法补齐：${rel}`);
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
    console.log(`[workspace] 关键文件缺失，已从模板种子补齐：${rel} → ${target}`);
  }
}

let cachedDemoToday: string | null = null;

/**
 * demo 模式的"今天"：锚定到演示台账里出现过的最新日期（date_added / last_action 中的最大值），
 * 让内置示例数据永远自洽（仪表盘"今日"数字不会随真实时间清零）。找不到则退回真实今天。
 */
function demoAnchoredToday(): string {
  if (cachedDemoToday) return cachedDemoToday;
  let max = '';
  try {
    const csvPath = path.join(DEMO_WORKSPACE_DIR, '02-jobs', 'job-ledger.csv');
    const raw = fs.readFileSync(csvPath, 'utf8');
    for (const m of raw.matchAll(/\d{4}-\d{2}-\d{2}/g)) {
      if (m[0] > max) max = m[0];
    }
  } catch {
    // ignore
  }
  cachedDemoToday = max || formatDate(new Date());
  return cachedDemoToday;
}

/** 运行机器当地日期，YYYY-MM-DD。demo 模式下锚定到演示数据最新日期。 */
export function todayStr(): string {
  if (getWorkspace().mode === 'demo') return demoAnchoredToday();
  const d = new Date();
  return formatDate(d);
}

/** Date → 当地 YYYY-MM-DD。 */
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 今天日期减去 n 天，返回当地 YYYY-MM-DD。demo 模式下从锚定"今天"往前推。 */
export function daysAgoStr(n: number): string {
  const base = todayStr();
  const d = new Date(`${base}T12:00:00`);
  d.setDate(d.getDate() - n);
  return formatDate(d);
}

/** 从字符串中提取第一个 YYYY-MM-DD（last_action 允许带描述后缀，如 "2025-07-16 完成二面"）。 */
export function extractDate(s: string): string {
  const m = s.match(/\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : '';
}

/**
 * :file 路径参数安全校验：禁止 `..` 与绝对路径、禁止路径分隔符，只允许 .md/.csv。
 * 合法则返回原文件名；非法返回 null。
 */
export function safeFileName(file: string | undefined): string | null {
  if (!file) return null;
  if (file.includes('..')) return null;
  if (file.includes('/') || file.includes('\\')) return null;
  if (path.isAbsolute(file)) return null;
  if (!/\.(md|csv)$/i.test(file)) return null;
  return file;
}

/** 给没有扩展名的 :file 参数补 .md 后做安全校验（兼容 /api/interviews/鸣沙数据 这类调用）。 */
export function safeMdFileName(file: string | undefined): string | null {
  if (!file) return null;
  const withExt = /\.(md|csv)$/i.test(file) ? file : `${file}.md`;
  return safeFileName(withExt);
}

/** 生成 JD/简历等文件名时去掉路径分隔符与首尾空白。 */
export function sanitizeFilePart(s: string): string {
  return s.replace(/[/\\]/g, '-').trim();
}

/** 读 UTF-8 文本；不存在返回 null。 */
export function readText(absPath: string): string | null {
  try {
    return fs.readFileSync(absPath, 'utf8');
  } catch {
    return null;
  }
}

/** 写 UTF-8 文本（自动建父目录）。 */
export function writeText(absPath: string, content: string): void {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content, 'utf8');
}

/** 列出目录下 .md 文件名（不含子目录）；目录不存在返回空数组。 */
export function listMdFiles(absDir: string): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'))
    .map((e) => e.name);
}

/** 文件 mtime 的当地日期 YYYY-MM-DD；失败返回今天。 */
export function fileDate(absPath: string): string {
  try {
    return formatDate(fs.statSync(absPath).mtime);
  } catch {
    return todayStr();
  }
}

/** 进程内互斥锁：写操作串行化（单用户本地工具足够）。 */
let writeQueue: Promise<unknown> = Promise.resolve();

/** 串行执行写操作 fn，返回其结果。 */
export function withWriteLock<T>(fn: () => T | Promise<T>): Promise<T> {
  const run = writeQueue.then(() => fn());
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
