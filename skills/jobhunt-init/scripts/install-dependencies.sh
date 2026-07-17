#!/bin/sh
# install-dependencies.sh —— jobhunt-init 的前置依赖检查脚本
# 原则：只检查、不安装；装不上只警告不失败（脚本永远以退出码 0 结束）。
# 幂等：可以反复运行，不产生任何副作用，不改动用户系统。

set -u

echo "== jobhunt-copilot 前置依赖检查 =="
echo ""

# ---------- 小工具 ----------
have() {
    # 判断某个命令是否存在
    command -v "$1" >/dev/null 2>&1
}

warn_count=0
warn() {
    # 只警告，不失败
    warn_count=$((warn_count + 1))
    echo "  [警告] $1"
}

ok() {
    echo "  [ OK ] $1"
}

# ---------- 1. Node.js（部分可选 CLI 依赖它运行） ----------
echo "1) Node.js（可选 CLI 的运行时）"
if have node; then
    ok "已安装：$(node --version 2>/dev/null)"
else
    warn "未检测到 node。手动模式不受影响；若要装 boss-cli / liepin-cli，需要先有 Node.js（官网 https://nodejs.org 下载 LTS 版即可）。"
fi
echo ""

# ---------- 2. Chrome / Edge（可选 CLI 走浏览器登录态时用） ----------
echo "2) Chrome / Edge 浏览器（可选 CLI 复用登录态时用）"
browser_found=""
for b in google-chrome google-chrome-stable chromium chromium-browser microsoft-edge msedge; do
    if have "$b"; then
        browser_found="$b"
        break
    fi
done
# macOS 常见安装路径（命令行里查不到，直接看目录）
if [ -z "$browser_found" ]; then
    for p in "/Applications/Google Chrome.app" "/Applications/Microsoft Edge.app"; do
        if [ -d "$p" ]; then
            browser_found="$p"
            break
        fi
    done
fi
if [ -n "$browser_found" ]; then
    ok "检测到浏览器：$browser_found"
else
    warn "未检测到 Chrome/Edge。手动模式不受影响；可选 CLI 需要浏览器登录 Boss直聘/猎聘时才会用到。"
fi
echo ""

# ---------- 3. 可选 CLI（自行安装，本仓库不带；装不上不影响手动模式） ----------
echo "3) 可选 CLI（没有也能跑，装了更省事）"
if have boss-cli; then
    ok "boss-cli 已安装（可查 Boss直聘岗位、读 JD、查 HR 消息）"
else
    echo "  [提示] 未安装 boss-cli（求职者版，可选）。装上后 AI 可查新岗位；不装则手动粘贴 JD，功能一样完整。"
fi
if have liepin-cli; then
    ok "liepin-cli 已安装（可查猎聘岗位、读 JD）"
else
    echo "  [提示] 未安装 liepin-cli（求职者版，可选）。同上，不装就走手动粘贴模式。"
fi
if have lark-cli; then
    ok "lark-cli 已安装（日报可出飞书云文档、面试可建日历日程）"
else
    echo "  [提示] 未安装 lark-cli（可选）。没有就用本地 Markdown 日报 + 手动清单。"
fi
echo ""

# ---------- 4. 汇总与下一步 ----------
echo "== 检查完毕：发现 $warn_count 个警告（警告不阻塞，初始化照常进行）=="
echo ""
echo "下一步："
echo "  1. 告诉 AI 工作区建在哪个目录（默认当前目录）；"
echo "  2. AI 会按标准结构建目录、拷贝模板（已有文件只补缺不覆盖）；"
echo "  3. 初始化完成后对它说「帮我梳理求职目标」，走 career-grill 把筛选硬规则填进 CONTEXT.md。"
echo ""
echo "提示：上面标了 [警告]/[提示] 的可选项，以后任何时候装好都能直接用，不用重新初始化。"

# 永远成功退出：依赖缺失不是错误，是待办
exit 0
