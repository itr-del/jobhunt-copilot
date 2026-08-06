import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { Toaster } from 'sonner'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'

// 路由级代码分割：Markdown 渲染器/编辑器较重的页面懒加载
const Jobs = lazy(() => import('@/pages/Jobs'))
const Reports = lazy(() => import('@/pages/Reports'))
const Interviews = lazy(() => import('@/pages/Interviews'))
const InterviewQa = lazy(() => import('@/pages/InterviewQa'))
const Context = lazy(() => import('@/pages/Context'))
const Strategy = lazy(() => import('@/pages/Strategy'))
const Settings = lazy(() => import('@/pages/Settings'))

function PageFallback() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent-500" />
    </div>
  )
}

export default function App() {
  return (
    <>
      <Layout>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/interviews/*" element={<Interviews />} />
            <Route path="/qa" element={<InterviewQa />} />
            <Route path="/context" element={<Context />} />
            <Route path="/strategy" element={<Strategy />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
      <Toaster position="top-right" gap={8} offset={16} duration={4000} />
    </>
  )
}
