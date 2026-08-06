import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpen,
  Check,
  ChevronDown,
  Eye,
  RefreshCw,
  Search,
  Shuffle,
  Target,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { QaItem } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * 面试问答 `/qa`（interview-qa）：浏览 + 自测双模式。
 * 数据：GET /api/qa（server/data/qa.json ← 飞书「面试问答准备」）。
 * 自测进度存 localStorage：jh-qa-known（记住了）/ jh-qa-review（再练）。
 */

const KNOWN_KEY = 'jh-qa-known'
const REVIEW_KEY = 'jh-qa-review'

type Mode = 'browse' | 'quiz'

function loadIds(key: string): number[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as number[]
  } catch {
    return []
  }
}

function saveIds(key: string, ids: number[]) {
  localStorage.setItem(key, JSON.stringify(ids))
}

export default function InterviewQa() {
  const [mode, setMode] = useState<Mode>('browse')
  const [items, setItems] = useState<QaItem[]>([])
  const [cats, setCats] = useState<string[]>([])
  const [dims, setDims] = useState<string[]>([])
  const [cat, setCat] = useState('')
  const [dim, setDim] = useState('')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<number | null>(null)
  const [known, setKnown] = useState<number[]>(() => loadIds(KNOWN_KEY))
  const [review, setReview] = useState<number[]>(() => loadIds(REVIEW_KEY))

  // ── 自测状态 ──
  const [quizN, setQuizN] = useState(5)
  const [quiz, setQuiz] = useState<QaItem[]>([])
  const [quizIdx, setQuizIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [quizDone, setQuizDone] = useState(false)
  const [knownThisRun, setKnownThisRun] = useState(0)

  useEffect(() => {
    api
      .qaMeta()
      .then((m) => {
        setCats(m.cats)
        setDims(m.dims)
      })
      .catch((e) => toast.error(e.message))
  }, [])

  const loadList = useCallback(() => {
    api
      .listQa({ cat: cat || undefined, dim: dim || undefined, q: q || undefined })
      .then((r) => setItems(r.questions))
      .catch((e) => toast.error(e.message))
  }, [cat, dim, q])

  useEffect(() => {
    if (mode === 'browse') loadList()
  }, [mode, loadList])

  // 搜索防抖
  useEffect(() => {
    if (mode !== 'browse') return
    const t = window.setTimeout(loadList, 250)
    return () => window.clearTimeout(t)
  }, [q, mode, loadList])

  const progress = useMemo(() => {
    if (items.length === 0) return 0
    const done = items.filter((x) => known.includes(x.id)).length
    return Math.round((done / items.length) * 100)
  }, [items, known])

  function startQuiz() {
    api
      .qaRandom(quizN, cat || undefined, dim || undefined)
      .then((r) => {
        if (r.questions.length === 0) {
          toast.error('当前筛选下没有题目')
          return
        }
        // 优先把「再练」的题放前面
        const sorted = [...r.questions].sort((a, b) => {
          const ra = review.includes(a.id) ? 0 : 1
          const rb = review.includes(b.id) ? 0 : 1
          return ra - rb
        })
        setQuiz(sorted)
        setQuizIdx(0)
        setRevealed(false)
        setQuizDone(false)
        setKnownThisRun(0)
      })
      .catch((e) => toast.error(e.message))
  }

  function answer(correct: boolean) {
    const cur = quiz[quizIdx]
    if (!cur) return
    if (correct) {
      setKnown((prev) => {
        const next = prev.includes(cur.id) ? prev : [...prev, cur.id]
        saveIds(KNOWN_KEY, next)
        return next
      })
      setReview((prev) => {
        const next = prev.filter((x) => x !== cur.id)
        saveIds(REVIEW_KEY, next)
        return next
      })
      setKnownThisRun((n) => n + 1)
    } else {
      setReview((prev) => {
        const next = prev.includes(cur.id) ? prev : [...prev, cur.id]
        saveIds(REVIEW_KEY, next)
        return next
      })
    }
    if (quizIdx + 1 >= quiz.length) {
      setQuizDone(true)
    } else {
      setQuizIdx((i) => i + 1)
      setRevealed(false)
    }
  }

  const cur = quiz[quizIdx]

  return (
    <div className="mx-auto w-full max-w-[880px] px-4 py-6">
      {/* 标题 + 模式切换 */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">面试问答</h1>
          <p className="text-subtle text-[12px]">
            政策原文 + Agent 工程化 · 共 {items.length ? items.length : '…'} 条 · 已掌握 {progress}%
          </p>
        </div>
        <div className="flex rounded-lg border border-border p-0.5">
          <button
            type="button"
            onClick={() => setMode('browse')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
              mode === 'browse' ? 'bg-accent-500 text-white' : 'text-subtle hover:text-foreground',
            )}
          >
            <BookOpen size={14} /> 浏览
          </button>
          <button
            type="button"
            onClick={() => setMode('quiz')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
              mode === 'quiz' ? 'bg-accent-500 text-white' : 'text-subtle hover:text-foreground',
            )}
          >
            <Target size={14} /> 自测
          </button>
        </div>
      </div>

      {mode === 'browse' ? (
        <>
          {/* 搜索 */}
          <div className="relative mb-3">
            <Search size={15} className="text-subtle absolute top-1/2 left-3 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索问题关键词…"
              className="border-border bg-card w-full rounded-lg border py-2 pr-3 pl-9 text-[13px] outline-none focus:border-accent-500"
            />
          </div>

          {/* 分类 Tab */}
          <div className="scrollbar-none -mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
            <button
              type="button"
              onClick={() => setCat('')}
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
                cat === '' ? 'bg-accent-500 text-white' : 'bg-subtle text-subtle hover:text-foreground',
              )}
            >
              全部
            </button>
            {cats.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
                  cat === c ? 'bg-accent-500 text-white' : 'bg-subtle text-subtle hover:text-foreground',
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {/* 维度筛选 */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setDim('')}
              className={cn(
                'rounded-md border px-2.5 py-0.5 text-[11px] transition-colors',
                dim === '' ? 'border-accent-500 text-accent-500' : 'border-border text-subtle hover:text-foreground',
              )}
            >
              全部维度
            </button>
            {dims.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDim(d)}
                className={cn(
                  'rounded-md border px-2.5 py-0.5 text-[11px] transition-colors',
                  dim === d ? 'border-accent-500 text-accent-500' : 'border-border text-subtle hover:text-foreground',
                )}
              >
                {d}
              </button>
            ))}
          </div>

          {/* 问答列表 */}
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {items.map((item) => {
                const isOpen = openId === item.id
                const isKnown = known.includes(item.id)
                const isReview = review.includes(item.id)
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="card-base overflow-hidden p-0"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : item.id)}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left"
                    >
                      <span
                        className={cn(
                          'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium',
                          isKnown
                            ? 'bg-emerald-50 text-emerald-600'
                            : isReview
                              ? 'bg-amber-50 text-amber-600'
                              : 'bg-subtle text-subtle',
                        )}
                      >
                        {isKnown ? '✓' : isReview ? '再练' : item.dim}
                      </span>
                      <span className="flex-1 text-[13px] leading-snug">{item.q}</span>
                      <ChevronDown
                        size={15}
                        className={cn('text-subtle shrink-0 transition-transform', isOpen && 'rotate-180')}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                        >
                          <div className="border-border border-t px-4 py-3">
                            <p className="mb-2 text-[13px] leading-relaxed whitespace-pre-wrap">{item.a}</p>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-subtle truncate text-[10px]">📎 {item.src}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (isKnown) {
                                    setKnown((prev) => {
                                      const next = prev.filter((x) => x !== item.id)
                                      saveIds(KNOWN_KEY, next)
                                      return next
                                    })
                                  } else {
                                    setKnown((prev) => {
                                      const next = [...prev, item.id]
                                      saveIds(KNOWN_KEY, next)
                                      return next
                                    })
                                    setReview((prev) => {
                                      const next = prev.filter((x) => x !== item.id)
                                      saveIds(REVIEW_KEY, next)
                                      return next
                                    })
                                  }
                                }}
                                className={cn(
                                  'shrink-0 rounded-md border px-2 py-0.5 text-[11px] transition-colors',
                                  isKnown
                                    ? 'border-emerald-500 text-emerald-600'
                                    : 'border-border text-subtle hover:text-foreground',
                                )}
                              >
                                {isKnown ? '✓ 已掌握' : '标记掌握'}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </AnimatePresence>
            {items.length === 0 && (
              <div className="card-base flex flex-col items-center gap-2 py-10 text-subtle">
                <Search size={22} />
                <p className="text-[13px]">没有匹配的问答</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* ── 自测模式 ── */}
          {quiz.length === 0 ? (
            <div className="card-base flex flex-col gap-4 p-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-subtle text-[12px]">抽题数</span>
                  {[5, 10, 15].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setQuizN(n)}
                      className={cn(
                        'rounded-md border px-2.5 py-0.5 text-[12px]',
                        quizN === n ? 'border-accent-500 text-accent-500' : 'border-border text-subtle',
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-subtle text-[12px]">范围</span>
                  <button
                    type="button"
                    onClick={() => setCat('')}
                    className={cn(
                      'rounded-md border px-2.5 py-0.5 text-[12px]',
                      cat === '' ? 'border-accent-500 text-accent-500' : 'border-border text-subtle',
                    )}
                  >
                    全部分类
                  </button>
                  {cats.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCat(c)}
                      className={cn(
                        'rounded-md border px-2.5 py-0.5 text-[12px]',
                        cat === c ? 'border-accent-500 text-accent-500' : 'border-border text-subtle',
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-subtle text-[12px]">
                自测规则：先默答 → 展开答案对照 → 标记「记住了」或「再练」。再练的题下次优先出现。
                {review.length > 0 && ` 当前待复习 ${review.length} 题。`}
              </div>
              <button
                type="button"
                onClick={startQuiz}
                className="bg-accent-500 hover:bg-accent-600 flex items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-medium text-white transition-colors"
              >
                <Shuffle size={15} /> 开始自测
              </button>
            </div>
          ) : quizDone ? (
            <div className="card-base flex flex-col items-center gap-3 p-8 text-center">
              <div className="bg-emerald-50 text-emerald-600 flex h-12 w-12 items-center justify-center rounded-full">
                <Check size={22} />
              </div>
              <p className="text-[15px] font-medium">本轮完成 🎉</p>
              <p className="text-subtle text-[13px]">
                {quiz.length} 题 · 答对（记住）{knownThisRun} 题 · 待复习 {quiz.length - knownThisRun} 题
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={startQuiz}
                  className="bg-accent-500 hover:bg-accent-600 flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] text-white transition-colors"
                >
                  <RefreshCw size={14} /> 再来一轮
                </button>
                <button
                  type="button"
                  onClick={() => setQuiz([])}
                  className="rounded-lg border border-border px-4 py-2 text-[13px] text-subtle transition-colors hover:text-foreground"
                >
                  返回设置
                </button>
              </div>
            </div>
          ) : (
            <div className="card-base p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-subtle text-[12px]">
                  第 {quizIdx + 1} / {quiz.length} 题
                  {review.includes(cur.id) && <span className="text-amber-600"> · 复习题</span>}
                </span>
                <span className="text-subtle text-[11px]">{cur.cat} · {cur.dim}</span>
              </div>
              <div className="mb-1 h-1 overflow-hidden rounded-full bg-subtle">
                <div
                  className="bg-accent-500 h-full rounded-full transition-all"
                  style={{ width: `${((quizIdx + (revealed ? 1 : 0)) / quiz.length) * 100}%` }}
                />
              </div>
              <p className="my-4 text-[15px] leading-relaxed font-medium">{cur.q}</p>

              {!revealed ? (
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-accent-500 py-2.5 text-[13px] text-accent-500 transition-colors hover:bg-accent-50"
                >
                  <Eye size={15} /> 看答案（先在心里默答一遍）
                </button>
              ) : (
                <>
                  <div className="border-border mb-4 rounded-lg border bg-subtle/50 p-3.5">
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{cur.a}</p>
                    <p className="text-subtle mt-2 truncate text-[10px]">📎 {cur.src}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => answer(true)}
                      className="bg-emerald-500 hover:bg-emerald-600 flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13px] font-medium text-white transition-colors"
                    >
                      <Check size={15} /> 记住了
                    </button>
                    <button
                      type="button"
                      onClick={() => answer(false)}
                      className="border-amber-500 hover:bg-amber-50 flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2.5 text-[13px] font-medium text-amber-600 transition-colors"
                    >
                      <RefreshCw size={14} /> 再练
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
