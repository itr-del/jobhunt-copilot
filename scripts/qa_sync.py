#!/usr/bin/env python3
"""面试问答数据同步：飞书多维表格 → web/server/data/qa.json

用法：
    python3 scripts/qa_sync.py            # 生成到 web/server/data/qa.json
    python3 scripts/qa_sync.py --out X    # 自定义输出路径

依赖：飞书应用凭证（bitable 读权限）。
当前说明：lark-cli bot-only 身份无 bitable 权限（20140），
数据更新暂由 OpenClaw feishu_bitable 工具导出后人工替换 qa.json；
本脚本保留结构，配置好具备 bitable 权限的凭证后即可自动化。
"""
import argparse
import json
import os
import subprocess
import sys
from datetime import datetime

APP_TOKEN = "QuiZboBrWaOhVxsl1Bzcm0KTnkf"
TABLE_ID = "tblO85xl0pg0fsO7"
DEFAULT_OUT = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "web", "server", "data", "qa.json"
)


def fetch_records() -> list[dict]:
    """经 lark-cli 拉取表格全量记录（含分页）。"""
    items: list[dict] = []
    page_token = ""
    while True:
        params = {"page_size": "100"}
        if page_token:
            params["page_token"] = page_token
        cmd = [
            "lark-cli", "api", "GET",
            f"/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{TABLE_ID}/records",
            "--params", json.dumps(params),
        ]
        r = subprocess.run(cmd, capture_output=True, text=True)
        try:
            data = json.loads(r.stdout)
        except json.JSONDecodeError:
            print(f"[qa_sync] lark-cli 输出解析失败：{r.stdout[:200]}", file=sys.stderr)
            break
        if not data.get("ok"):
            print(f"[qa_sync] lark-cli 调用失败：{data.get('error')}", file=sys.stderr)
            break
        items.extend(data["data"].get("items", []))
        page_token = (data.get("data") or {}).get("page_token") or ""
        if not page_token:
            break
    return items


def to_qa_json(records: list[dict]) -> dict:
    questions = []
    for rec in records:
        f = rec.get("fields", {})
        qid = f.get("序号")
        questions.append({
            "id": int(qid) if qid is not None else 0,
            "cat": f.get("分类") or "",
            "dim": f.get("维度") or "",
            "q": f.get("问题") or "",
            "a": f.get("答案") or "",
            "src": f.get("信源") or "",
        })
    questions.sort(key=lambda x: x["id"])
    return {
        "version": datetime.now().strftime("%Y-%m-%d"),
        "source": "飞书多维表格·面试问答准备",
        "count": len(questions),
        "questions": questions,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description="同步飞书面试问答到 qa.json")
    ap.add_argument("--out", default=DEFAULT_OUT, help="输出路径")
    ap.add_argument("--no-fetch", action="store_true", help="不调用 lark-cli（仅打印当前配置）")
    args = ap.parse_args()

    if args.no_fetch:
        print(f"app_token={APP_TOKEN}\ntable_id={TABLE_ID}\nout={args.out}")
        return

    records = fetch_records()
    if not records:
        print("[qa_sync] 未拉到记录（凭证无 bitable 权限？），未写入。", file=sys.stderr)
        sys.exit(1)
    payload = to_qa_json(records)
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=1)
    print(f"✅ qa.json 已生成：{payload['count']} 条 -> {args.out}")


if __name__ == "__main__":
    main()
