# AGENTS.md —— jobhunt-copilot 仓库级说明

先判断你是哪种身份，再决定怎么用这个仓库。

## 一、你是**使用者**（求职者，想用这套工作流找工作）

不要在本仓库里直接干活。本仓库是"工作流模板库"，你的数据不该写在这里。

1. 对本仓库说"**帮我初始化求职工作区**"，AI 会走 `skills/jobhunt-init/SKILL.md`，在你指定的位置建一个属于你自己的求职工作区。
2. 之后所有日常操作（筛岗位、记台账、出日报）都在**你的工作区**里进行，以工作区里的 `AGENTS.md` 和 `CONTEXT.md` 为准。
3. 你的求职数据（台账、简历、策略笔记）永远只写进你的工作区，**不写回本仓库**。

## 二、你是**维护者**（要改这套工作流本身）

### 本仓库结构

```
jobhunt-copilot/
├── README.md / AGENTS.md / docs/DESIGN.md   ← 门面与设计文档
├── .claude-plugin/                          ← Claude Code 插件声明
├── commands/                                ← slash 命令薄壳，只做路由，不写流程
└── skills/                                  ← 全部工作流（每个 skill 一个目录）
    ├── jobhunt-init/    初始化工作区（含 scripts/ 与工作区模板 templates/）
    ├── career-grill/    逼问式梳理求职目标
    ├── jobhunt-daily/   每日流水线：查岗位→筛 JD→确认后投递→台账→日报
    ├── market-mapping/  市场调研
    ├── resume-tailor/   按 JD 定制简历
    ├── interview-prep/  面试准备与复盘
    └── jobhunt-ask/     总路由
```

### 维护时的红线

- **用户数据不得写入本仓库**。仓库里只允许出现模板与占位符；发现真实求职数据（真实姓名、公司、薪资）混入，立即清除。模板里不预置任何数字标准（薪资线、城市、年限都是用户的，只写"待梳理"）。
- **对外不可逆动作先确认**：投递、打招呼、发消息给 HR，默认逐个先经用户确认。维护涉及平台操作的流程时，措辞必须与 `skills/jobhunt-daily/SKILL.md` 的红线块保持一致。
- **绝不编造简历和面试内容**是全局红线（标注"不可删"）：所有 skill 引用时措辞必须一致，见各 SKILL.md 红线块。
- 改工作流行为改 `skills/`，改命令入口改 `commands/`（薄壳只路由，不复制流程），改设计口径先改 `docs/DESIGN.md` 并同步 README。
- 跨 skill 的共用事实（台账表头、状态枚举、CONTEXT.md 章节、红线措辞）只有一份定义，引用而非复制；改动时全局搜索同步。

## 三、铁律

无论你是哪种身份：**先读事实源，别凭记忆**。使用者的事实源是工作区的 CONTEXT.md；维护者的事实源是本仓库的 docs/DESIGN.md 与各 SKILL.md。
