import path from 'node:path';
import type { ReportMeta } from './types.js';
import { formatDate, listMdFiles, readText, type Workspace } from './workspace.js';

const DAILY_RE = /^(\d{4}-\d{2}-\d{2})\.md$/;
const WEEKLY_RE = /^(\d{4})-W(\d{2})\.md$/i;

/** ISO 周 → 该周周一的当地日期（周报的排序日期用周一）。 */
export function isoWeekMonday(year: number, week: number): string {
  const jan4 = new Date(year, 0, 4);
  const dow = jan4.getDay() || 7; // 周一=1 … 周日=7
  const mondayW1 = new Date(jan4);
  mondayW1.setDate(jan4.getDate() - (dow - 1));
  const monday = new Date(mondayW1);
  monday.setDate(mondayW1.getDate() + (week - 1) * 7);
  return formatDate(monday);
}

function firstTitle(markdown: string, fallback: string): string {
  const m = markdown.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : fallback;
}

/** 日报+周报列表，按日期倒序（同日期按文件名倒序）。 */
export function listReports(ws: Workspace): ReportMeta[] {
  const dir = path.join(ws.dir, 'runtime', 'reports');
  const list: ReportMeta[] = [];
  for (const file of listMdFiles(dir)) {
    const daily = file.match(DAILY_RE);
    const weekly = file.match(WEEKLY_RE);
    if (!daily && !weekly) continue;
    const raw = readText(path.join(dir, file)) ?? '';
    if (daily) {
      list.push({ file, type: 'daily', date: daily[1], title: firstTitle(raw, daily[1]) });
    } else if (weekly) {
      const year = Number.parseInt(weekly[1], 10);
      const week = Number.parseInt(weekly[2], 10);
      list.push({
        file,
        type: 'weekly',
        date: isoWeekMonday(year, week),
        title: firstTitle(raw, file.replace(/\.md$/i, '')),
      });
    }
  }
  list.sort((a, b) => (a.date === b.date ? b.file.localeCompare(a.file) : b.date.localeCompare(a.date)));
  return list;
}
