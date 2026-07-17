import { Route, Routes } from 'react-router'
import DetailPage from '@/pages/interviews/DetailPage'
import ListPage from '@/pages/interviews/ListPage'

/**
 * 面试档案 `/interviews`（interviews.md）：两个路由。
 * - 列表页：统计条 + 公司卡片网格（S1/S2）
 * - 详情页 `/interviews/:company`：档案头部 + 锚点导航内容区 + 编辑模式（S3-S6）
 *
 * 注意：App.tsx 中对应路由需声明为 `/interviews/*`（嵌套路由依赖父级 splat）。
 */
export default function Interviews() {
  return (
    <Routes>
      <Route index element={<ListPage />} />
      <Route path=":company" element={<DetailPage />} />
    </Routes>
  )
}
