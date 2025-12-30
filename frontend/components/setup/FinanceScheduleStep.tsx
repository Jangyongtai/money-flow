"use client"

import { useState, useMemo } from "react"
import { CardContent, CardHeader } from "@/components/ui/card"
import { formatNumber } from "@/lib/format"
import { Calendar, ArrowDownCircle, ArrowUpCircle, CalendarDays, List } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import FinanceCalendar from "./FinanceCalendar"

type Asset = { id: string; type: string; name: string; balance: number; monthlyIncome?: number }
type Debt = { id: string; type: string; name: string; amount: number; interestRate?: number; paymentDay?: number; paymentAmount?: number }
type Expense = { id: string; category?: string; name: string; amount: number; billingDay?: number }
type Income = { id: string; name: string; amount: number; payDay?: number }

type EventItem = {
  dayLabel: string
  day: number | null
  title: string
  amount: number
  direction: "IN" | "OUT"
  meta?: string
}

export default function FinanceScheduleStep({
  assets,
  debts,
  expenses,
  incomes,
  initialViewMode,
}: {
  assets: Asset[]
  debts: Debt[]
  expenses: Expense[]
  incomes: Income[]
  initialViewMode?: "calendar" | "list"
}) {
  // ID 기준 중복 제거 (불완전한 ID 대비 fallback key)
  const uniqueIncomes = useMemo(() => {
    const map = new Map<string, Income>()
    incomes.forEach((i, idx) => {
      const key = i.id || `income-${idx}`
      if (!map.has(key)) map.set(key, i)
    })
    return Array.from(map.values())
  }, [incomes])

  const uniqueDebts = useMemo(() => {
    const map = new Map<string, Debt>()
    debts.forEach((d, idx) => {
      const key = d.id || `debt-${idx}`
      if (!map.has(key)) map.set(key, d)
    })
    return Array.from(map.values())
  }, [debts])

  const uniqueExpenses = useMemo(() => {
    const map = new Map<string, Expense>()
    expenses.forEach((e, idx) => {
      const key = e.id || `expense-${idx}`
      if (!map.has(key)) map.set(key, e)
    })
    return Array.from(map.values())
  }, [expenses])

  const events: EventItem[] = []

  // Inflows
  uniqueIncomes.forEach((i) => {
    events.push({
      day: i.payDay ?? null,
      dayLabel: i.payDay ? `${i.payDay}일` : "일자 미지정",
      title: i.name || "정기수입",
      amount: Number(i.amount) || 0,
      direction: "IN",
    })
  })

  // Outflows
  uniqueDebts.forEach((d) => {
    const payAmt = Number(d.paymentAmount) || 0
    if (payAmt > 0) {
      // 이름이 비슷하거나, 같은 날짜+금액이 이미 지출에 있으면 중복 방지
      const isAlreadyInExpenses = uniqueExpenses.some(e =>
        (e.name.includes(d.name) || d.name.includes(e.name)) ||
        (Number(e.billingDay) === d.paymentDay && Number(e.amount) === payAmt)
      );

      if (!isAlreadyInExpenses) {
        events.push({
          day: d.paymentDay ?? null,
          dayLabel: d.paymentDay ? `${d.paymentDay}일` : "일자 미지정",
          title: d.name || "부채 납입",
          amount: payAmt,
          direction: "OUT",
          meta: d.interestRate ? `${d.interestRate}%` : undefined,
        })
      }
    }
  })
  uniqueExpenses.forEach((e) => {
    events.push({
      day: e.billingDay ?? null,
      dayLabel: e.billingDay ? `${e.billingDay}일` : "일자 미지정",
      title: e.name || e.category || "정기지출",
      amount: Number(e.amount) || 0,
      direction: "OUT",
      meta: e.category,
    })
  })

  const grouped = events.reduce<Record<string, EventItem[]>>((acc, ev) => {
    // 일자 미지정 항목은 제외
    if (ev.day === null) return acc
    const key = String(ev.day).padStart(2, "0")
    acc[key] = acc[key] ? [...acc[key], ev] : [ev]
    return acc
  }, {})

  const sortedKeys = Object.keys(grouped).sort((a, b) => Number(a) - Number(b))
  const totalIn = events.filter((e) => e.direction === "IN").reduce((s, e) => s + e.amount, 0)
  const totalOut = events.filter((e) => e.direction === "OUT").reduce((s, e) => s + e.amount, 0)

  const [viewMode, setViewMode] = useState<"calendar" | "list">(initialViewMode || "calendar")

  return (
    <div className="space-y-6">
      <CardHeader className="pb-4">
        <div className="w-full max-w-2xl rounded-2xl border border-blue-100 bg-white shadow-sm px-4 py-3 flex items-center justify-end">
          {/* 뷰 모드 전환 버튼 - 명확한 토글 스타일 */}
          <div className="w-full max-w-[320px]">
            <div className="grid grid-cols-2 bg-gray-100 rounded-full p-1 shadow-inner">
              <Button
                type="button"
                variant="ghost"
                aria-pressed={viewMode === "calendar"}
                onClick={() => setViewMode("calendar")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-full py-2 text-sm font-semibold transition-all",
                  viewMode === "calendar"
                    ? "bg-white shadow text-blue-700"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <CalendarDays className="w-4 h-4" />
                달력
              </Button>
              <Button
                type="button"
                variant="ghost"
                aria-pressed={viewMode === "list"}
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-full py-2 text-sm font-semibold transition-all",
                  viewMode === "list"
                    ? "bg-white shadow text-blue-700"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <List className="w-4 h-4" />
                목록
              </Button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <div className="rounded-xl border p-4 bg-white">
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <ArrowUpCircle className="w-4 h-4 text-emerald-600" /> 월 수입
            </div>
            <div className="text-2xl font-bold text-emerald-700">{formatNumber(totalIn)}만원</div>
          </div>
          <div className="rounded-xl border p-4 bg-white">
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <ArrowDownCircle className="w-4 h-4 text-amber-600" /> 월 지출
            </div>
            <div className="text-2xl font-bold text-amber-700">{formatNumber(totalOut)}만원</div>
          </div>
          <div className="rounded-xl border p-4 bg-white">
            <div className="text-xs text-gray-500">월 순수입</div>
            <div className="text-2xl font-bold text-slate-900">{formatNumber(totalIn - totalOut)}만원</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-1 sm:px-2 py-4">
        {sortedKeys.length === 0 && events.length === 0 && (
          <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-xl">
            일정이 없습니다. (납부일/입금일을 입력하면 여기 표시됩니다.)
          </div>
        )}

        {viewMode === "calendar" && (
          <div className="py-2">
            <FinanceCalendar events={events} />
          </div>
        )}

        {viewMode === "list" && (
          <>
            {sortedKeys.length === 0 ? (
              <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-xl">
                일정이 없습니다. (납부일/입금일을 입력하면 여기 표시됩니다.)
              </div>
            ) : (
              sortedKeys.map((key) => (
                <div key={key} className="rounded-xl border bg-white p-4 space-y-2">
                  <div className="text-sm font-semibold text-gray-700">
                    {`${Number(key)}일`}
                  </div>
                  <div className="divide-y divide-gray-100">
                    {grouped[key].map((ev, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{ev.title}</div>
                          <div className="text-xs text-gray-400">
                            {ev.direction === "IN" ? "수입" : "지출"}
                          </div>
                        </div>
                        <div
                          className={cn(
                            "font-bold text-sm md:text-base",
                            ev.direction === "IN" ? "text-emerald-700" : "text-amber-700"
                          )}
                        >
                          {ev.direction === "IN" ? "+" : "-"}{formatNumber(ev.amount)}만원
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </CardContent>
    </div>
  )
}


