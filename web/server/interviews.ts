import path from 'node:path';
import type { InterviewMeta } from './types.js';
import { extractDate, fileDate, listMdFiles, readText, type Workspace } from './workspace.js';

/** 从面试档案头部 "- 字段：值" 行解析字段（公司/岗位/状态），解析不出给空串。 */
export function parseInterviewField(raw: string, field: string): string {
  const re = new RegExp(`^\\s*[-*]?\\s*${field}\\s*[：:]\\s*(.+?)\\s*$`, 'm');
  const m = raw.match(re);
  if (!m) return '';
  return m[1].trim();
}

/** 状态字段专用：去掉尾随括号注释，如 "面试中（与台账 status 同步）" → "面试中"。 */
function parseInterviewStatus(raw: string): string {
  return parseInterviewField(raw, '状态').replace(/[（(].*$/, '').trim();
}

/** 提取「下一轮安排」行的内容（"下一轮安排："之后），没有则空串。 */
export function parseNextRoundLine(raw: string): string {
  const m = raw.match(/下一轮安排\s*[：:]\s*(.+?)\s*$/m);
  return m ? m[1].trim() : '';
}

/** 摘要：优先「下一轮安排」行，否则「下一步」节首行，否则正文首个非标题非引用行（截 80 字）。 */
function makeSnippet(raw: string): string {
  const next = parseNextRoundLine(raw);
  if (next) return `下一轮安排：${next}`;
  const stepSection = raw.match(/##\s*下一步\s*\n([\s\S]*?)(\n##\s|$)/);
  if (stepSection) {
    const line = stepSection[1]
      .split('\n')
      .map((l) => l.replace(/^\s*[-*]\s*/, '').trim())
      .find((l) => l !== '');
    if (line) return line.slice(0, 80);
  }
  const bodyLine = raw
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l !== '' && !l.startsWith('#') && !l.startsWith('>'));
  return bodyLine ? bodyLine.replace(/^\s*[-*]\s*/, '').slice(0, 80) : '';
}

/** 面试档案列表（company/position/status 从文件头解析，解析不出给空串）。 */
export function listInterviews(ws: Workspace): InterviewMeta[] {
  const dir = path.join(ws.dir, '03-interview');
  const list: InterviewMeta[] = [];
  for (const file of listMdFiles(dir)) {
    const abs = path.join(dir, file);
    const raw = readText(abs) ?? '';
    list.push({
      file,
      company: parseInterviewField(raw, '公司') || file.replace(/\.md$/i, ''),
      position: parseInterviewField(raw, '岗位'),
      status: parseInterviewStatus(raw),
      updated: fileDate(abs),
      snippet: makeSnippet(raw),
    });
  }
  list.sort((a, b) => b.updated.localeCompare(a.updated) || a.file.localeCompare(b.file));
  return list;
}

/** 即将进行的面试：解析「下一轮安排」行里的日期(+时间)与轮次；解析不出日期的跳过。 */
export function listUpcomingInterviews(ws: Workspace): { company: string; position: string; round: string; datetime: string }[] {
  const dir = path.join(ws.dir, '03-interview');
  const out: { company: string; position: string; round: string; datetime: string }[] = [];
  for (const file of listMdFiles(dir)) {
    const raw = readText(path.join(dir, file)) ?? '';
    const line = parseNextRoundLine(raw);
    if (!line) continue;
    const date = extractDate(line);
    if (!date) continue;
    const timeM = line.match(/(\d{1,2}:\d{2})/);
    const roundM = line.match(/(电话|视频|现场)?\s*((?:第?[一二三四五六七八九十\d]+面)|HR\s*面|终面)/);
    out.push({
      company: parseInterviewField(raw, '公司') || file.replace(/\.md$/i, ''),
      position: parseInterviewField(raw, '岗位'),
      round: roundM ? roundM[2].replace(/\s+/g, '') : '',
      datetime: timeM ? `${date} ${timeM[1]}` : date,
    });
  }
  out.sort((a, b) => a.datetime.localeCompare(b.datetime));
  return out;
}
