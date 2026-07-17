---
name: jobhunt-init
description: 初始化求职工作区。当用户说"帮我初始化求职工作区""开始""搭建求职环境"，或第一次在空目录里想启动本工作流时触发。负责检查前置依赖、在用户指定位置按标准结构建工作区、拷贝模板、注册 skill 入口，最后引导用户走 career-grill。已有工作区时只补缺不覆盖。
---

# jobhunt-init —— 初始化求职工作区

把整个求职工作流的地基一次打好。只跑一次；已有工作区时进入"补缺模式"，绝不推倒重来。

## 铁律：先读事实源，别凭记忆

- 开工先确认本仓库的 `skills/jobhunt-init/templates/` 六个模板都在；缺模板先报告，不自己现编。
- 工作区结构、文件落点以本文件为准；**硬规则数字一个都不写**——薪资、城市之类的标准由用户后续走 career-grill 填进 CONTEXT.md。
- 判断没写进文件等于丢失：初始化过程做了什么、跳了什么，最后要向用户汇报清单。

## 主流程

### 1. 检查前置依赖

运行 `scripts/install-dependencies.sh`（只检查、不安装）：确认 Node、Chrome/Edge 是否可用，提示可选安装 `boss-cli` / `liepin-cli` / `lark-cli`。

- **完成判据**：脚本跑完，结果如实汇报用户。
- **降级路径**：脚本跑不起来或提示缺依赖，**只警告不失败**；把缺的可选项记成待办（见第 6 步汇报），不阻塞初始化。

### 2. 先看后动：探测已有工作区

让用户指定工作区位置（默认当前目录）。逐个检查标准结构里的文件是否已存在：

- `CONTEXT.md`、`02-jobs/job-ledger.csv` 已存在 → **跳过，绝不动**。这两份是用户家底。
- 其他文件已存在 → 跳过并记入"保留清单"，不覆盖。
- 缺的 → 记入"待补清单"，后面只补这些。
- **完成判据**：产出一份明确的"保留清单 + 待补清单"，并向用户说明本次只补缺不覆盖。

### 3. 创建工作区目录结构

在指定位置按标准结构建目录（已存在的目录跳过）：

```
CONTEXT.md  AGENTS.md  skills/  .agents/skills/  .claude/skills/  .qoder/skills/
01-profile/_internal/  02-jobs/jd/  03-interview/  04-offer/
_shared/templates/  runtime/reports/  runtime/resumes/
```

- **完成判据**：以上目录全部就位（新建或已存在）。

### 4. 拷贝模板骨架（只补不覆盖）

从本仓库 `skills/jobhunt-init/templates/` 拷贝，逐个对照第 2 步的待补清单：

| 模板 | 落点 |
| --- | --- |
| AGENTS.md | 工作区根目录 AGENTS.md |
| CONTEXT.md | 工作区根目录 CONTEXT.md |
| master-resume.md | 01-profile/master-resume.md |
| strategy-internal.md | 01-profile/_internal/strategy.md |
| job-ledger.csv | 02-jobs/job-ledger.csv |
| interview-record.md | _shared/templates/interview-record.md |

六个模板原样再拷一份到 `_shared/templates/`，供以后取用（如面试档案、新增方向）。

- **完成判据**：待补清单全部落地；保留清单里的文件一字节未动（重点核对 `02-jobs/job-ledger.csv` 与 `CONTEXT.md`）。

### 5. 注册三个项目级 skill 入口

把本仓库 `skills/` 整体拷入工作区 `skills/`（随工作区走，换机器也能用），再建三个符号链接指向它：

```
.agents/skills -> ../skills     .claude/skills -> ../skills     .qoder/skills -> ../skills
```

- **完成判据**：三个入口目录都能读到同一份 skill 文档。
- **降级路径**：文件系统不支持符号链接（如部分 Windows 环境）→ 改为拷贝 `skills/` 到三个入口位置，并在汇报里注明"入口是拷贝，升级 skill 后需重新同步"。

### 6. 汇报 + 引导下一步

向用户汇报：建了什么、保留了什么、缺哪些可选 CLI（待办）、三个入口是否就绪。然后明确引导：

> 工作区就绪。下一步走 **career-grill**：对它说"帮我梳理求职目标"，一次一问，把筛选硬规则写进 CONTEXT.md。硬规则没有填好之前，任何筛岗位流程都不会启动。

- **完成判据**：用户知道自己接下来该说哪句话。

## 什么时候不用本流程

- 工作区已完整存在、只是想继续今天的求职 → 走 `jobhunt-daily`。
- 工作区有了但筛选硬规则没填 → 走 `career-grill`，不用重跑 init。
- 想改单个文件（简历、策略笔记）→ 直接改，不用 init。
- 不知道该走哪个流程 → 走 `jobhunt-ask` 总路由。

## 红线（不可删）

- **绝不自动投递、打招呼或发消息给 HR**。对外动作默认逐个先经用户确认；用户本轮明确授权"合适的直接投"则本轮可放开，但逐一回报投了什么；跨轮不自动延续。初始化本身不触碰任何平台账号，不替用户登录、不代操作。
- 已有 `CONTEXT.md` 和 `02-jobs/job-ledger.csv` 绝不覆盖、绝不清空。
- 装不上的可选 CLI 只记待办，不擅自下载安装不明来源的工具。
