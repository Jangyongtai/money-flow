"use client"

import { CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatNumber } from "@/lib/format"

type Asset = { id: string; type: string; name: string; balance: number }
type Debt = { id: string; type: string; name: string; amount: number; interestRate?: number; paymentDay?: number; paymentAmount?: number }
type Expense = { id: string; category?: string; name: string; amount: number; billingDay?: number }
type Income = { id: string; name: string; amount: number; payDay?: number }

export default function SummaryStep({
  assets,
  debts,
  expenses,
  incomes,
  onGoDashboard,
}: {
  assets: Asset[]
  debts: Debt[]
  expenses: Expense[]
  incomes: Income[]
  onGoDashboard: () => void
}) {
  const totalAssets = assets.reduce((sum, a) => sum + (Number(a.balance) || 0), 0)
  const totalDebts = debts.reduce((sum, d) => sum + (Number(d.amount) || 0), 0)
  const totalDebtPayment = debts.reduce((sum, d) => sum + (Number(d.paymentAmount) || 0), 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  const totalIncomes = incomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
  const netWorth = totalAssets - totalDebts
  const monthlyOutflow = totalDebtPayment + totalExpenses

  return (
    <div className="space-y-6">
      <CardHeader className="pb-4">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">종합</h2>
          <p className="text-gray-500 text-sm">자산/부채를 한 번에 확인하세요.</p>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-xl bg-white border p-4">
            <div className="text-xs text-gray-500">총 자산</div>
            <div className="text-2xl font-bold text-blue-700">{formatNumber(totalAssets)}만원</div>
          </div>
          <div className="rounded-xl bg-white border p-4">
            <div className="text-xs text-gray-500">총 부채</div>
            <div className="text-2xl font-bold text-slate-900">{formatNumber(totalDebts)}만원</div>
          </div>
          <div className="rounded-xl bg-white border p-4">
            <div className="text-xs text-gray-500">월 정기지출</div>
            <div className="text-2xl font-bold text-amber-700">{formatNumber(monthlyOutflow)}만원</div>
          </div>
          <div className="rounded-xl bg-white border p-4">
            <div className="text-xs text-gray-500">월 정기수입</div>
            <div className="text-2xl font-bold text-emerald-700">{formatNumber(totalIncomes)}만원</div>
          </div>
          <div className="rounded-xl bg-white border p-4">
            <div className="text-xs text-gray-500">순자산</div>
            <div className="text-2xl font-bold text-slate-900">{formatNumber(netWorth)}만원</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-white p-4">
            <div className="text-sm font-semibold mb-3">자산</div>
            {assets.length === 0 ? (
              <div className="text-sm text-gray-400">등록된 자산이 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {assets.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{a.name}</div>
                      <div className="text-xs text-gray-400">{a.type}</div>
                    </div>
                    <div className="font-bold text-slate-900">{formatNumber(Number(a.balance) || 0)}만원</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-white p-4">
            <div className="text-sm font-semibold mb-3">부채</div>
            {debts.length === 0 ? (
              <div className="text-sm text-gray-400">등록된 부채가 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {debts.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{d.name}</div>
                      <div className="text-xs text-gray-400">
                        {d.type}
                        {d.interestRate ? ` · ${d.interestRate}%` : ""}
                        {d.paymentDay ? ` · ${d.paymentDay}일` : ""}
                        {d.paymentAmount ? ` · 월 ${formatNumber(Number(d.paymentAmount) || 0)}만원` : ""}
                      </div>
                    </div>
                    <div className="font-bold text-slate-900">{formatNumber(Number(d.amount) || 0)}만원</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-white p-4">
            <div className="text-sm font-semibold mb-3">정기 지출</div>
            {expenses.length === 0 ? (
              <div className="text-sm text-gray-400">등록된 정기 지출이 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {expenses.map((e) => (
                  <div key={e.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{e.name}</div>
                      <div className="text-xs text-gray-400">
                        {e.category || "기타"}
                        {e.billingDay ? ` · ${e.billingDay}일` : ""}
                      </div>
                    </div>
                    <div className="font-bold text-slate-900">{formatNumber(Number(e.amount) || 0)}만원</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-white p-4">
            <div className="text-sm font-semibold mb-3">정기 수입</div>
            {incomes.length === 0 ? (
              <div className="text-sm text-gray-400">등록된 정기 수입이 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {incomes.map((i) => (
                  <div key={i.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{i.name}</div>
                      <div className="text-xs text-gray-400">
                        {i.payDay ? `입금일 ${i.payDay}일` : ""}
                      </div>
                    </div>
                    <div className="font-bold text-slate-900">{formatNumber(Number(i.amount) || 0)}만원</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Button
          className="w-full h-14 text-lg font-bold text-white rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-[1px] active:translate-y-0 transition-transform transition-shadow"
          onClick={onGoDashboard}
        >
          대시보드로 이동
        </Button>
      </CardContent>
    </div>
  )
}


