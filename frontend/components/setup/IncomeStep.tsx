"use client"

import { useEffect, useMemo, useState } from "react"
import { CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Wallet, Briefcase, Landmark, PiggyBank, CreditCard, CalendarClock, Trash2 } from "lucide-react"
import { formatNumber, parseNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

type Income = {
  id: string
  name: string
  amount: number
  payDay?: number
  source?: "SALARY" | "RENT" | "DIVIDEND" | "SIDE" | "OTHER" | "ASSET"
  originId?: string
  auto?: boolean
}

const INCOME_TYPES = [
  { type: "SALARY", label: "급여", icon: Briefcase, color: "text-blue-700 bg-blue-100 border-blue-200" },
  { type: "RENT", label: "임대료", icon: Landmark, color: "text-indigo-700 bg-indigo-100 border-indigo-200" },
  { type: "DIVIDEND", label: "배당/이자", icon: PiggyBank, color: "text-emerald-700 bg-emerald-100 border-emerald-200" },
  { type: "SIDE", label: "부업/프리랜스", icon: Wallet, color: "text-amber-700 bg-amber-100 border-amber-200" },
  { type: "OTHER", label: "기타", icon: CreditCard, color: "text-gray-700 bg-gray-100 border-gray-200" },
] as const

interface IncomeStepProps {
  onNext: (incomes: Income[]) => void
  initialData?: Income[]
  linkedAssets?: { id: string; name: string; monthlyIncome?: number; monthlyIncomeDay?: number }[]
}

export default function IncomeStep({ onNext, initialData, linkedAssets = [] }: IncomeStepProps) {
  const [incomes, setIncomes] = useState<Income[]>([])
  const [autoIncomes, setAutoIncomes] = useState<Income[]>([])

  useEffect(() => {
    if (initialData && Array.isArray(initialData) && initialData.length > 0) {
      // 자동 생성 항목은 제외하고 수동 입력만 유지
      const manualOnly = initialData.filter((i) => !String(i.id).startsWith("auto-asset-") && i.source !== "ASSET")
      setIncomes(manualOnly)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialData ?? [])])

  // 자산 -> 자동 정기수입 (월세 등)
  useEffect(() => {
    const seen = new Set<string>()
    const auto = (linkedAssets || [])
      .filter((a) => (a.monthlyIncome || 0) > 0)
      .filter((a) => {
        if (seen.has(a.id)) return false
        seen.add(a.id)
        return true
      })
      .map<Income>((a) => ({
        id: `auto-asset-${a.id}`,
        name: `${a.name || "자산"} 월수입`,
        amount: Number(a.monthlyIncome) || 0,
        payDay: a.monthlyIncomeDay || undefined,
        source: "ASSET",
        originId: a.id,
        auto: true,
      }))
    setAutoIncomes(auto)
  }, [linkedAssets])

  const addIncome = (source: Income["source"]) => {
    const income: Income = {
      id: Date.now().toString(),
      source,
      name: source === "SALARY" ? "급여" : "",
      amount: 0,
    }
    setIncomes([...incomes, income])
  }

  const removeIncome = (id: string) => {
    setIncomes(incomes.filter((i) => i.id !== id))
  }

  const updateIncome = (id: string, field: keyof Income, value: any) => {
    setIncomes(incomes.map((i) => (i.id === id ? { ...i, [field]: value } : i)))
  }

  const combinedIncomes = useMemo(() => {
    const unique: Record<string, Income> = {}
    ;[...autoIncomes, ...incomes].forEach((i) => {
      if (!unique[i.id]) unique[i.id] = i
    })
    return Object.values(unique)
  }, [autoIncomes, incomes])
  const totalIncome = combinedIncomes.reduce((sum, i) => sum + i.amount, 0)

  return (
    <div className="space-y-6">
      <CardHeader className="pb-4">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">정기 수입 입력</h2>
          <p className="text-gray-500 text-sm hidden md:block">
            급여/임대료/배당 등 매월 들어오는 금액을 입력하세요 (단위: <span className="text-blue-600 font-bold">만원</span>)
          </p>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2 pt-4">
          {INCOME_TYPES.map((t) => (
            <button
              key={t.type}
              onClick={() => addIncome(t.type as Income["source"])}
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
        <div className="bg-emerald-50 rounded-2xl p-4 sm:p-6 text-center shadow-inner space-y-1.5">
          <div className="text-emerald-600 text-sm">월 정기수입 합계</div>
          <div className="text-4xl font-bold tracking-tight text-emerald-900">
            {formatNumber(totalIncome)} <span className="text-xl font-normal opacity-80">만원</span>
          </div>
        </div>

        <div className="space-y-3">
          {combinedIncomes.length === 0 && (
            <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-xl">
              정기 수입이 없습니다.<br />위 아이콘을 눌러 추가해주세요.
            </div>
          )}

          {combinedIncomes.map((i) => {
            const typeInfo = INCOME_TYPES.find((t) => t.type === i.source) || INCOME_TYPES[4]
            return (
              <div key={i.id} className="relative bg-white p-2 sm:p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-start gap-3 lg:gap-4">
                  <div className={cn("p-2 rounded-lg shrink-0", typeInfo.color)}>
                    <typeInfo.icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <Input
                          className="h-10 border-none shadow-none focus-visible:ring-0 p-0 font-medium text-base placeholder:text-gray-300"
                          placeholder="항목명 (예: 급여, 임대료)"
                          value={i.name}
                          onChange={(e) => !i.auto && updateIncome(i.id, "name", e.target.value)}
                          readOnly={!!i.auto}
                        />
                        <div className="text-xs text-gray-400">{typeInfo.label}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span>{typeInfo.label}</span>
                      <div className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded">
                        <span>입금일</span>
                        <input
                          className="w-10 bg-transparent text-right font-bold outline-none"
                          placeholder="?"
                          value={i.payDay || ""}
                          onChange={(e) => !i.auto && updateIncome(i.id, "payDay", e.target.value)}
                          readOnly={!!i.auto}
                        />
                        <span>일</span>
                      </div>
                      {i.auto && (
                        <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                          ● 자동등록(자산)
                        </span>
                      )}
                    </div>

                    <div className="w-full relative pt-1">
                      <Input
                        className="h-12 text-right pr-10 font-bold text-xl border-gray-200 focus-visible:ring-emerald-500 bg-gray-50/50 text-emerald-900"
                        type="text"
                        placeholder="0"
                        value={i.amount > 0 ? formatNumber(i.amount) : ""}
                        onChange={(e) => {
                          if (i.auto) return
                          const val = parseNumber(e.target.value)
                          if (!isNaN(val)) updateIncome(i.id, "amount", val)
                        }}
                        readOnly={!!i.auto}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none font-medium">만원</span>
                    </div>
                  </div>
                </div>

                {!i.auto && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIncome(i.id)}
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
            className="w-full h-14 text-lg font-bold text-white rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-[1px] active:translate-y-0 transition-transform transition-shadow"
            onClick={() => onNext(combinedIncomes)}
          >
            저장
          </Button>
        </div>
      </CardContent>
    </div>
  )
}


