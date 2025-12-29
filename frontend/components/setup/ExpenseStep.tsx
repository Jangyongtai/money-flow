"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2, Smartphone, GraduationCap, CreditCard, Wallet, ShoppingBag, CalendarClock } from "lucide-react"
import { formatNumber, parseNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

type Expense = {
  id: string
  category: "ACADEMY" | "PHONE" | "INSURANCE" | "RENT" | "SUBSCRIPTION" | "OTHER"
  name: string
  amount: number
  billingDay?: number
  source?: string // auto-debt 등
  originId?: string
  auto?: boolean
}

const EXPENSE_TYPES = [
  { type: "ACADEMY", label: "학원비", icon: GraduationCap, color: "text-blue-700 bg-blue-100 border-blue-200" },
  { type: "PHONE", label: "통신비", icon: Smartphone, color: "text-indigo-700 bg-indigo-100 border-indigo-200" },
  { type: "INSURANCE", label: "보험/의료", icon: CreditCard, color: "text-emerald-700 bg-emerald-100 border-emerald-200" },
  { type: "RENT", label: "주거/관리비", icon: Wallet, color: "text-amber-700 bg-amber-100 border-amber-200" },
  { type: "SUBSCRIPTION", label: "구독/서비스", icon: CalendarClock, color: "text-purple-700 bg-purple-100 border-purple-200" },
  { type: "OTHER", label: "기타", icon: ShoppingBag, color: "text-gray-700 bg-gray-100 border-gray-200" },
] as const

interface ExpenseStepProps {
  onNext: (expenses: Expense[]) => void
  initialData?: Expense[]
  linkedDebts?: { id: string; name: string; paymentAmount?: number; paymentDay?: number }[]
}

export default function ExpenseStep({ onNext, initialData, linkedDebts = [] }: ExpenseStepProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]) // 사용자 입력
  const [autoExpenses, setAutoExpenses] = useState<Expense[]>([]) // 부채에서 자동 생성
  const [isSaving, setIsSaving] = useState(false)
  const initializedRef = useRef(false)
  const lastInitialDataRef = useRef<string>("")

  // 부채 → 자동 정기지출 변환
  useEffect(() => {
    const linked = linkedDebts || []
    const auto = linked
      .filter((d) => (d.paymentAmount || 0) > 0)
      .map<Expense>((d) => ({
        id: `auto-debt-${d.id}`,
        category: "OTHER",
        name: `${d.name || "부채"} 이자/납입`,
        amount: Number(d.paymentAmount) || 0,
        billingDay: d.paymentDay || undefined,
        source: "debt",
        originId: d.id,
        auto: true,
      }))
    // ID 기준 중복 제거
    const uniqueAuto = Array.from(new Map(auto.map((a) => [a.id, a])).values())
    setAutoExpenses(uniqueAuto)
  }, [linkedDebts])

  useEffect(() => {
    // initialData가 없거나 빈 배열이면 초기화하지 않음
    if (!initialData || !Array.isArray(initialData)) {
      // 초기 로드 시에만 빈 배열로 설정 (이미 expenses가 있으면 유지)
      if (!initializedRef.current && expenses.length === 0) {
        initializedRef.current = true
      }
      return
    }

    // 중복 제거: 같은 ID가 있으면 하나만 유지
    const uniqueExpenses = initialData.reduce((acc, expense) => {
      if (!acc.find((e) => e.id === expense.id)) {
        acc.push(expense)
      }
      return acc
    }, [] as Expense[])

    // 현재 initialData의 문자열 표현 (정렬하여 일관성 유지)
    const sortedUnique = uniqueExpenses.sort((a, b) => a.id.localeCompare(b.id))
    const currentDataStr = JSON.stringify(sortedUnique.map(e => ({ id: e.id, name: e.name, amount: e.amount, category: e.category, billingDay: e.billingDay })))

    // 이전 데이터와 비교하여 실제로 변경되었을 때만 업데이트
    if (lastInitialDataRef.current !== currentDataStr) {
      lastInitialDataRef.current = currentDataStr
      
      // 현재 expenses와 비교하여 실제로 다른 경우에만 업데이트
      const currentExpenses = expenses.sort((a, b) => a.id.localeCompare(b.id))
      const currentExpensesStr = JSON.stringify(currentExpenses.map(e => ({ id: e.id, name: e.name, amount: e.amount, category: e.category, billingDay: e.billingDay })))
      
      if (currentExpensesStr !== currentDataStr) {
        console.log("[ExpenseStep] initialData 업데이트:", uniqueExpenses.length, "개 항목 (이전:", expenses.length, "개)")
        // 자동 생성 항목(과거 저장된 auto) 제외 후 사용자 입력만 유지
        const manualOnly = uniqueExpenses.filter((e) => !String(e.id).startsWith("auto-debt-") && e.source !== "debt")
        setExpenses(manualOnly)
        initializedRef.current = true
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData])

  const addExpense = (category: Expense["category"]) => {
    const newExpense: Expense = {
      id: Date.now().toString(),
      category,
      name: category === "ACADEMY" ? "학원비" : category === "PHONE" ? "통신비" : "",
      amount: 0,
    }
    setExpenses([...expenses, newExpense])
  }

  const removeExpense = (id: string) => {
    setExpenses(expenses.filter((e) => e.id !== id))
  }

  const updateExpense = (id: string, field: keyof Expense, value: any) => {
    setExpenses(expenses.map((e) => (e.id === id ? { ...e, [field]: value } : e)))
  }

  const combinedExpenses = useMemo(() => {
    const merged = [...autoExpenses, ...expenses]
    const unique = new Map<string, Expense>()
    merged.forEach((e) => {
      if (!unique.has(e.id)) unique.set(e.id, e)
    })
    return Array.from(unique.values())
  }, [autoExpenses, expenses])
  const totalExpense = combinedExpenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="space-y-6">
      <CardHeader className="pb-4">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">정기 지출 입력</h2>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 pt-4">
          {EXPENSE_TYPES.map((t) => (
            <button
              key={t.type}
              onClick={() => addExpense(t.type as Expense["category"])}
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-transparent hover:border-gray-300 hover:bg-gray-50 transition-all active:scale-95"
            >
              <div className={cn("p-2.5 rounded-full mb-1.5", t.color)}>
                <t.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-gray-600">{t.label}</span>
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-2 sm:px-4">
        <div className="bg-amber-50 rounded-2xl p-4 sm:p-6 text-center shadow-inner space-y-1.5">
          <div className="text-amber-600 text-sm">월 정기지출 합계</div>
          <div className="text-4xl font-bold tracking-tight text-amber-900">
            {formatNumber(totalExpense)} <span className="text-xl font-normal opacity-80">만원</span>
          </div>
        </div>

        <div className="space-y-3">
          {combinedExpenses.length === 0 && (
            <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-xl">
              정기 지출이 없습니다.<br />위 아이콘을 눌러 추가해주세요.
            </div>
          )}

          {combinedExpenses.map((exp) => {
            const typeInfo = EXPENSE_TYPES.find((t) => t.type === exp.category) || EXPENSE_TYPES[5]
            return (
              <div
                key={exp.id}
                className="relative bg-white p-2 sm:p-3 rounded-xl border border-gray-100 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-lg shrink-0", typeInfo.color)}>
                    <typeInfo.icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <Input
                          className="h-8 border-none shadow-none focus-visible:ring-0 p-0 font-medium text-base placeholder:text-gray-300"
                          placeholder="항목명 (예: OO학원, 통신비)"
                          value={exp.name}
                          onChange={(e) => !exp.auto && updateExpense(exp.id, "name", e.target.value)}
                          readOnly={!!exp.auto}
                        />
                        <div className="text-xs text-gray-400">{typeInfo.label}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded text-gray-700">
                        <span>납부일</span>
                        <input
                          className="w-10 bg-transparent text-right font-bold outline-none"
                          placeholder="?"
                          value={exp.billingDay || ""}
                          onChange={(e) => !exp.auto && updateExpense(exp.id, "billingDay", e.target.value)}
                          readOnly={!!exp.auto}
                        />
                        <span>일</span>
                      </div>
                      {exp.auto && (
                        <span className="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                          ● 자동등록(부채)
                        </span>
                      )}
                    </div>

                    <div className="w-full relative pt-1">
                      <Input
                        className="h-10 text-right pr-9 font-bold text-lg border-gray-200 focus-visible:ring-blue-500 bg-gray-50/50 text-amber-900"
                        type="text"
                        placeholder="0"
                        value={exp.amount > 0 ? formatNumber(exp.amount) : ""}
                        onChange={(e) => {
                          if (exp.auto) return
                          const val = parseNumber(e.target.value)
                          if (!isNaN(val)) updateExpense(exp.id, "amount", val)
                        }}
                        readOnly={!!exp.auto}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none font-medium">만원</span>
                    </div>
                  </div>
                </div>

                {!exp.auto && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeExpense(exp.id)}
                    className="absolute top-2 right-2 h-8 w-8 text-gray-300 hover:text-blue-600 hover:bg-blue-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>

        <div className="pt-4">
          <Button
            className="w-full h-14 text-lg font-bold text-white rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 shadow-lg shadow-amber-200 hover:shadow-amber-300 hover:-translate-y-[1px] active:translate-y-0 transition-transform transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={async () => {
              if (isSaving) return // 이미 저장 중이면 무시
              setIsSaving(true)
              try {
                // 중복 제거: 같은 ID가 있으면 하나만 유지
                const uniqueExpenses = combinedExpenses.reduce((acc, expense) => {
                  if (!acc.find((e) => e.id === expense.id)) {
                    acc.push(expense)
                  }
                  return acc
                }, [] as Expense[])
                await onNext(uniqueExpenses)
              } finally {
                // 약간의 지연 후 저장 상태 해제 (중복 클릭 방지)
                setTimeout(() => {
                  setIsSaving(false)
                }, 1000)
              }
            }}
            disabled={isSaving}
          >
            {isSaving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </CardContent>
    </div>
  )
}


