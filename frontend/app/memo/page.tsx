"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Trash2, Pin } from "lucide-react"
import { addMemo as addMemoApi, addMemoComment, deleteMemo, getMemos, updateMemo } from "@/lib/api"

type Memo = {
  id: string
  content: string
  pinned?: boolean
  createdAt: string
  updatedAt: string
  comments?: { id: string; content: string; createdAt: string }[]
}

export default function MemoPage() {
  const [content, setContent] = useState("")
  const [memos, setMemos] = useState<Memo[]>([])
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const data = await getMemos()
        setMemos(data)
      } catch (e) {
        console.error(e)
        alert("메모를 불러오지 못했습니다.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const addMemo = async () => {
    if (!content.trim()) return
    try {
      const created = await addMemoApi(content.trim())
      setMemos([created, ...memos])
      setContent("")
    } catch (e) {
      console.error(e)
      alert("메모를 저장하지 못했습니다.")
    }
  }

  const removeMemo = async (id: string) => {
    try {
      await deleteMemo(id)
      setMemos(memos.filter((m) => m.id !== id))
    } catch (e) {
      console.error(e)
      alert("메모를 삭제하지 못했습니다.")
    }
  }

  const togglePin = async (id: string) => {
    const target = memos.find((m) => m.id === id)
    if (!target) return
    try {
      const updated = await updateMemo(id, target.content)
      updated.pinned = !target.pinned
      const next = memos.map((m) => (m.id === id ? { ...m, pinned: updated.pinned } : m))
      next.sort((a, b) => Number(b.pinned) - Number(a.pinned))
      setMemos(next)
    } catch (e) {
      console.error(e)
      alert("고정/해제를 실패했습니다.")
    }
  }

  const addComment = async (memoId: string) => {
    const text = (commentDraft[memoId] || "").trim()
    if (!text) return
    try {
      const comment = await addMemoComment(memoId, text)
      setMemos(
        memos.map((m) =>
          m.id === memoId
            ? { ...m, comments: [...(m.comments || []), comment] }
            : m
        )
      )
      setCommentDraft({ ...commentDraft, [memoId]: "" })
    } catch (e) {
      console.error(e)
      alert("댓글을 저장하지 못했습니다.")
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-1 py-4">
      <div className="max-w-5xl w-full mx-auto space-y-4">
        <Card className="p-4 sm:p-6 space-y-3">
          <div className="text-lg font-bold text-gray-900">메모</div>
          <Textarea
            placeholder="메모를 입력하세요 (한 칸에 길게 작성)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[140px]"
          />
          <Button className="w-full h-11 text-base font-semibold" onClick={addMemo} disabled={loading}>
            저장
          </Button>
          <div className="text-xs text-gray-400">
            * 서버에 저장되어 PC/모바일에서 동일하게 확인됩니다.
          </div>
        </Card>

        {loading ? (
          <div className="text-center text-gray-400 py-8">불러오는 중...</div>
        ) : (
          <div className="space-y-2">
            {memos.length === 0 ? (
              <div className="text-center text-gray-400 py-8 border border-dashed rounded-xl bg-white">
                저장된 메모가 없습니다.
              </div>
            ) : (
              memos.map((memo) => (
                <Card
                  key={memo.id}
                  className="p-3 sm:p-4 bg-white border border-gray-100 shadow-sm flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {new Date(memo.createdAt).toLocaleString()}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        수정: {new Date(memo.updatedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => togglePin(memo.id)}
                        className="h-8 w-8 text-gray-400 hover:text-blue-600"
                        title="고정"
                      >
                        <Pin className={`w-4 h-4 ${memo.pinned ? "fill-blue-500 text-blue-500" : ""}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMemo(memo.id)}
                        className="h-8 w-8 text-gray-300 hover:text-red-500"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {memo.content && (
                    <div className="whitespace-pre-wrap text-sm text-gray-700 break-words">{memo.content}</div>
                  )}

                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    <div className="flex items-start gap-2">
                      <Textarea
                        placeholder="댓글 남기기"
                        value={commentDraft[memo.id] || ""}
                        onChange={(e) =>
                          setCommentDraft({ ...commentDraft, [memo.id]: e.target.value })
                        }
                        className="min-h-[60px] text-sm"
                      />
                      <Button
                        variant="secondary"
                        className="h-full mt-0 text-sm px-3"
                        onClick={() => addComment(memo.id)}
                      >
                        등록
                      </Button>
                    </div>
                    {memo.comments && memo.comments.length > 0 && (
                      <div className="space-y-1">
                        {memo.comments.map((c) => (
                          <div key={c.id} className="text-xs text-gray-700 bg-gray-50 rounded-md px-2 py-1">
                            <div className="text-[11px] text-gray-400">
                              {new Date(c.createdAt).toLocaleString()}
                            </div>
                            <div className="whitespace-pre-wrap">{c.content}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  )
}

