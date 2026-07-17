/**
 * 标准 CSV 读写小解析器（RFC 4180 风格）：
 * - 引号包裹字段，字段内引号用两个双引号转义（"" → "）
 * - 支持 \n / \r\n / \r 换行
 * - 写回时对含 , " \n \r 的字段自动加引号
 */

/** 把 CSV 文本解析为二维字符串数组（含表头行）。 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ',') {
      pushField();
      i++;
      continue;
    }
    if (c === '\n') {
      pushRow();
      i++;
      continue;
    }
    if (c === '\r') {
      if (text[i + 1] === '\n') {
        pushRow();
        i += 2;
      } else {
        pushRow();
        i++;
      }
      continue;
    }
    field += c;
    i++;
  }
  // 末尾没有换行符时收尾最后一行
  if (field !== '' || row.length > 0) {
    pushRow();
  }
  return rows;
}

/** 把二维字符串数组序列化为 CSV 文本（末尾带换行）。 */
export function stringifyCsv(rows: string[][]): string {
  const lines = rows.map((r) =>
    r
      .map((f) => {
        const s = f ?? '';
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      })
      .join(','),
  );
  return lines.join('\n') + '\n';
}
