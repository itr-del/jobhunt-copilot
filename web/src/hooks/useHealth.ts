import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Health } from '@/lib/api'

let cache: Health | null = null
let inflight: Promise<Health | null> | null = null

/**
 * 共享的 GET /api/health 读取（模块级缓存，多组件挂载只发一次请求）。
 * 失败返回 null 且不缓存，下次挂载自动重试。
 */
export function useHealth(): Health | null {
  const [health, setHealth] = useState<Health | null>(cache)

  useEffect(() => {
    if (cache) {
      setHealth(cache)
      return
    }
    let alive = true
    inflight ??= api.health().then(
      (h) => {
        cache = h
        return h
      },
      () => {
        inflight = null
        return null
      },
    )
    void inflight.then((h) => {
      if (alive && h) setHealth(h)
    })
    return () => {
      alive = false
    }
  }, [])

  return health
}
