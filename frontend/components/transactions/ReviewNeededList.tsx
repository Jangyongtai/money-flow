"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, CheckCircle2, X } from "lucide-react"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

type Transaction = {
  id: string
  date: string
  type: "INCOME" | "EXPENSE"
  category?: string
  name: string
  amount: number
  description?: string
  originalText?: string
  confidence?: number
  needsReview?: boolean
  userConfirmed?: boolean
  aiCategory?: string
}

interface ReviewNeededListProps {
  transactions: Transaction[]
  onUpdate: (id: string, updates: Partial<Transaction>) => void
  onConfirm: (id: string) => void
}

import { CATEGORIES } from "@/lib/categories"

export default function ReviewNeededList({ transactions, onUpdate, onConfirm }: ReviewNeededListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; category: string }>({ name: "", category: "" })

  const needsReview = transactions.filter(t => t.needsReview && !t.userConfirmed)

  if (needsReview.length === 0) {
    return null
  }

  // 기본적으로 모든 항목을 수정 모드로 시작
  const startEdit = (transaction: Transaction) => {
    setEditingId(transaction.id)
    setEditForm({
      name: transaction.name,
      category: transaction.category || transaction.aiCategory || "기타",
    })
  }

  const saveEdit = (id: string) => {
    if (!editForm.category || editForm.category.trim() === "") {
      alert("카테고리를 선택해주세요.")
      return
    }
    onUpdate(id, {
      name: editForm.name,
      category: editForm.category,
      userConfirmed: true,
      needsReview: false,
    })
    setEditingId(null)
  }

  const handleConfirm = (id: string) => {
    onConfirm(id)
  }

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <h3 className="text-lg font-semibold text-amber-900">확인 필요 항목</h3>
          <span className="text-sm text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
            {needsReview.length}건
          </span>
        </div>
        <p className="text-sm text-amber-700 mt-1">
          확인해주세요. 항목과 카테고리를 선택한 후 저장해주세요.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {needsReview.map((transaction) => (
          <div
            key={transaction.id}
            className="bg-white border border-amber-200 rounded-lg p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-500">{transaction.date}</span>
                  {transaction.originalText && (
                    <span className="text-xs text-gray-400 italic">
                      원본: {transaction.originalText}
                    </span>
                  )}
                </div>
                
                {editingId === transaction.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="항목명"
                      className="text-sm"
                    />
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">카테고리 선택</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => saveEdit(transaction.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        저장
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(null)}
                      >
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="font-medium text-gray-900">{transaction.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {transaction.category || transaction.aiCategory || "기타"}
                      </span>
                      {transaction.confidence !== undefined && (
                        <span className="text-xs text-gray-400">
                          신뢰도: {Math.round(transaction.confidence * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <div
                  className={cn(
                    "font-bold text-lg",
                    transaction.type === "INCOME" ? "text-green-600" : "text-red-600"
                  )}
                >
                  {transaction.type === "INCOME" ? "+" : "-"}
                  {formatNumber(transaction.amount)}만원
                </div>
              </div>
            </div>
            
            {editingId !== transaction.id && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startEdit(transaction)}
                  className="text-xs"
                >
                  수정
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

