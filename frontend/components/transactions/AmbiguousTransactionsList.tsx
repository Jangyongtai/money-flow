"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle2, X, HelpCircle } from "lucide-react"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

type Transaction = {
  id: string
  date: string
  datetime?: string
  type: "INCOME" | "EXPENSE"
  category?: string
  name: string
  amount: number
  description?: string
  originalText?: string
  duplicateCheckConfidence?: number
  possibleDuplicate?: boolean
  sourceFile?: string
}

interface AmbiguousTransactionsListProps {
  transactions: Transaction[]
  onConfirm: (id: string) => void
  onReject: (id: string) => void
}

export default function AmbiguousTransactionsList({ 
  transactions, 
  onConfirm, 
  onReject 
}: AmbiguousTransactionsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (transactions.length === 0) {
    return null
  }

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-amber-600" />
          <h3 className="text-lg font-semibold text-amber-900">중복 가능성 있는 거래</h3>
          <span className="text-sm text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
            {transactions.length}건
          </span>
        </div>
        <p className="text-sm text-amber-700 mt-1">
          다음 거래들은 기존 거래와 유사합니다. 중복인지 확인해주세요.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="bg-white border border-amber-200 rounded-lg p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-500">{transaction.date}</span>
                  {transaction.datetime && (
                    <span className="text-xs text-gray-400">{transaction.datetime.split(" ")[1]}</span>
                  )}
                  {transaction.sourceFile && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {transaction.sourceFile}
                    </span>
                  )}
                </div>
                
                <div className="font-medium text-gray-900 mb-1">{transaction.name}</div>
                
                {transaction.originalText && transaction.originalText !== transaction.name && (
                  <div className="text-xs text-gray-400 italic mb-1">
                    원본: {transaction.originalText}
                  </div>
                )}
                
                <div className="flex items-center gap-2 mt-1">
                  {transaction.category && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {transaction.category}
                    </span>
                  )}
                  {transaction.duplicateCheckConfidence !== undefined && (
                    <span className="text-xs text-amber-600 font-medium">
                      중복 가능성: {Math.round(transaction.duplicateCheckConfidence * 100)}%
                    </span>
                  )}
                </div>
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
            
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => onConfirm(transaction.id)}
                className="bg-green-600 hover:bg-green-700 text-xs flex-1"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                중복 아님 (저장)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject(transaction.id)}
                className="text-red-600 border-red-300 hover:bg-red-50 text-xs flex-1"
              >
                <X className="w-3 h-3 mr-1" />
                중복임 (제외)
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

