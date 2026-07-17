/**
 * 占位桩页：由后续页面代理替换为真实实现。
 * 样式与全站卡片语言一致（白卡 + e0 + 建设中徽标）。
 */
export default function Stub({ title, description }: { title: string; description?: string }) {
  return (
    <div className="card-base flex min-h-[320px] flex-col items-center justify-center gap-3 p-10 text-center">
      <span className="rounded-pill bg-accent-50 px-2.5 py-1 text-[12px] font-medium text-accent-ink">
        建设中
      </span>
      <h1 className="text-section text-ink-1">{title}</h1>
      <p className="max-w-[420px] text-[13px] leading-[1.7] text-ink-3">
        {description ?? '该页面正在建设中，敬请期待。数据口径与交互规范见全局设计文档与 REST API 契约。'}
      </p>
    </div>
  )
}
