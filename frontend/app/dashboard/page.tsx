"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatNumber } from "@/lib/format"
import { getAssets, getDebts, getExpenses, getIncomes, getTransactionSources } from "@/lib/api"
import { FileText } from "lucide-react"

type Asset = { id: string; type: string; name: string; balance: number; monthlyIncome?: number }
type Debt = { id: string; type: string; name: string; amount: number; interestRate?: number; paymentDay?: number; paymentAmount?: number }
type Expense = { id: string; category?: string; name: string; amount: number; billingDay?: number }
type Income = { id: string; name: string; amount: number; payDay?: number }

export default function DashboardPage() {
  const profileId = "default-profile"
  const [assets, setAssets] = useState<Asset[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [incomes, setIncomes] = useState<Income[]>([])
  const [sources, setSources] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [a, d, e, inc, src] = await Promise.allSettled([
          getAssets(profileId),
          getDebts(profileId),
          getExpenses(profileId),
          getIncomes(profileId),
          getTransactionSources(profileId).catch(() => []), // sources는 실패해도 계속 진행
        ])
        setAssets(a.status === 'fulfilled' ? (a.value ?? []) : [])
        setDebts(d.status === 'fulfilled' ? (d.value ?? []) : [])
        setExpenses(e.status === 'fulfilled' ? (e.value ?? []) : [])
        setIncomes(inc.status === 'fulfilled' ? (inc.value ?? []) : [])
        setSources(src.status === 'fulfilled' ? (src.value ?? []) : [])
        setError(null)
      } catch (err: any) {
        console.error(err)
        setError("데이터를 불러오지 못했습니다.")
      }
    }
    load()
  }, [profileId])

  // ID 기준 중복 제거
  const uniqueAssets = useMemo(() => [...new Map(assets.map((a) => [a.id, a])).values()], [assets])
  const uniqueDebts = useMemo(() => [...new Map(debts.map((d) => [d.id, d])).values()], [debts])
  const uniqueExpenses = useMemo(() => [...new Map(expenses.map((e) => [e.id, e])).values()], [expenses])
  const uniqueIncomes = useMemo(() => [...new Map(incomes.map((i) => [i.id, i])).values()], [incomes])

  const totalAssets = useMemo(() => uniqueAssets.reduce((sum, a) => sum + (Number(a.balance) || 0), 0), [uniqueAssets])
  const totalDebts = useMemo(() => uniqueDebts.reduce((sum, d) => sum + (Number(d.amount) || 0), 0), [uniqueDebts])
  const totalDebtPayment = useMemo(() => uniqueDebts.reduce((sum, d) => sum + (Number(d.paymentAmount) || 0), 0), [uniqueDebts])
  const totalExpenses = useMemo(() => uniqueExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0), [uniqueExpenses])
  const totalIncomes = useMemo(() => uniqueIncomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0), [uniqueIncomes])
  const netWorth = totalAssets - totalDebts
  const monthlyOutflow = totalDebtPayment + totalExpenses
  const mobileLimit = 4

  return (
    <main className="min-h-screen bg-gray-50 px-0 py-4">
      <div className="max-w-7xl w-full mx-auto space-y-6 px-1 sm:px-4">
        {/* Desktop */}
        <div className="hidden lg:block space-y-4">
        <Card className="p-6">
          <div className="text-sm text-gray-500 mb-2">요약</div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="rounded-xl bg-white border p-4">
              <div className="text-xs text-gray-500">총 자산</div>
              <div className="text-2xl font-bold text-blue-700">{formatNumber(totalAssets)}만원</div>
            </div>
            <div className="rounded-xl bg-white border p-4">
              <div className="text-xs text-gray-500">총 부채</div>
              <div className="text-2xl font-bold text-slate-900">{formatNumber(totalDebts)}만원</div>
            </div>
            <div className="rounded-xl bg-white border p-4">
              <div className="text-xs text-gray-500">월 지출(부채 납입 + 정기)</div>
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
          {error && <div className="mt-2 text-sm text-red-500">{error}</div>}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6">
            <div className="text-sm text-gray-500 mb-3">자산</div>
            {assets.length === 0 ? (
              <div className="text-sm text-gray-400">저장된 자산이 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {uniqueAssets.map((a) => (
                  <div key={a.id} className="flex items-center justify-between border rounded-lg p-3 bg-white">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{a.name}</div>
                      <div className="text-xs text-gray-400">{a.type}</div>
                    </div>
                  <div className="font-bold text-slate-900">{formatNumber(Number(a.balance) || 0)}만원</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="text-sm text-gray-500 mb-3">부채</div>
            {debts.length === 0 ? (
              <div className="text-sm text-gray-400">저장된 부채가 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {uniqueDebts.map((d) => (
                  <div key={d.id} className="flex items-center justify-between border rounded-lg p-3 bg-white">
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
          </Card>
        </div>

          <Card className="p-6">
            <div className="text-sm text-gray-500 mb-3">지출</div>
          {expenses.length === 0 ? (
            <div className="text-sm text-gray-400">저장된 정기 지출이 없습니다.</div>
          ) : (
            <div className="space-y-2">
              {expenses.map((e, idx) => (
                <div key={`${e.id}-${idx}`} className="flex items-center justify-between border rounded-lg p-3 bg-white">
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
        </Card>

          <Card className="p-6">
            <div className="text-sm text-gray-500 mb-3">수입</div>
          {incomes.length === 0 ? (
            <div className="text-sm text-gray-400">저장된 정기 수입이 없습니다.</div>
          ) : (
            <div className="space-y-2">
              {uniqueIncomes.map((i) => (
                <div key={i.id} className="flex items-center justify-between border rounded-lg p-3 bg-white">
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
        </Card>

        {/* 데이터 출처 */}
        {sources.length > 0 && (
          <Card className="p-6 border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-gray-500" />
              <div className="text-sm font-semibold text-gray-700">info</div>
            </div>
            <div className="space-y-2">
              {sources.map((source, index) => {
                const formatDate = (dateStr: string) => {
                  try {
                    const date = new Date(dateStr)
                    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                  } catch {
                    return dateStr
                  }
                }
                
                return (
                  <div key={index} className="text-xs text-gray-600 bg-white p-3 rounded-lg border border-gray-200">
                    <div className="font-medium text-gray-800 mb-1">
                      {source.cardName}
                      {source.cardNumber && ` ${source.cardNumber}`}
                    </div>
                    <div className="text-gray-500">
                      {formatDate(source.dateRange.start)} ~ {formatDate(source.dateRange.end)} 참조
                      <span className="ml-2 text-gray-400">
                        ({source.transactionCount}건)
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
        </div>

        {/* Mobile */}
        <div className="block lg:hidden space-y-3">
          <Card className="p-3">
            <div className="text-base font-semibold text-gray-900 mb-2">요약</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white border p-2.5">
                <div className="text-[11px] text-gray-500">총 자산</div>
                <div className="text-lg font-bold text-blue-700">{formatNumber(totalAssets)}만</div>
              </div>
              <div className="rounded-lg bg-white border p-2.5">
                <div className="text-[11px] text-gray-500">총 부채</div>
                <div className="text-lg font-bold text-slate-900">{formatNumber(totalDebts)}만</div>
              </div>
              <div className="rounded-lg bg-white border p-2.5">
                <div className="text-[11px] text-gray-500">월 지출</div>
                <div className="text-lg font-bold text-amber-700">{formatNumber(monthlyOutflow)}만</div>
              </div>
              <div className="rounded-lg bg-white border p-2.5">
                <div className="text-[11px] text-gray-500">월 정기수입</div>
                <div className="text-lg font-bold text-emerald-700">{formatNumber(totalIncomes)}만</div>
              </div>
              <div className="col-span-2 rounded-lg bg-white border p-2.5">
                <div className="text-[11px] text-gray-500">순자산</div>
                <div className="text-lg font-bold text-slate-900">{formatNumber(netWorth)}만</div>
              </div>
            </div>
          </Card>

          <Card className="p-3">
            <div className="text-sm text-gray-500 mb-2">자산</div>
            {uniqueAssets.length === 0 ? (
              <div className="text-sm text-gray-400">저장된 자산이 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {uniqueAssets.slice(0, mobileLimit).map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border p-3 bg-white">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{a.name}</div>
                      <div className="text-[11px] text-gray-400">{a.type}</div>
                    </div>
                    <div className="font-bold text-slate-900">{formatNumber(Number(a.balance) || 0)}만</div>
                  </div>
                ))}
                {uniqueAssets.length > mobileLimit && (
                  <div className="text-xs text-gray-400 pl-1">+{uniqueAssets.length - mobileLimit}개 더 보기</div>
                )}
              </div>
            )}
          </Card>

          <Card className="p-3">
            <div className="text-sm text-gray-500 mb-2">부채</div>
            {uniqueDebts.length === 0 ? (
              <div className="text-sm text-gray-400">저장된 부채가 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {uniqueDebts.slice(0, mobileLimit).map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border p-3 bg-white">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{d.name}</div>
                      <div className="text-[11px] text-gray-400">
                        {d.type}
                        {d.interestRate ? ` · ${d.interestRate}%` : ""}
                        {d.paymentDay ? ` · ${d.paymentDay}일` : ""}
                        {d.paymentAmount ? ` · 월 ${formatNumber(Number(d.paymentAmount) || 0)}만` : ""}
                      </div>
                    </div>
                    <div className="font-bold text-slate-900">{formatNumber(Number(d.amount) || 0)}만</div>
                  </div>
                ))}
                {uniqueDebts.length > mobileLimit && (
                  <div className="text-xs text-gray-400 pl-1">+{uniqueDebts.length - mobileLimit}개 더 보기</div>
                )}
              </div>
            )}
          </Card>

          <Card className="p-3">
            <div className="text-sm text-gray-500 mb-2">지출</div>
            {uniqueExpenses.length === 0 ? (
              <div className="text-sm text-gray-400">저장된 정기 지출이 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {uniqueExpenses.slice(0, mobileLimit).map((e, idx) => (
                  <div key={`${e.id}-${idx}`} className="flex items-center justify-between rounded-lg border p-3 bg-white">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{e.name}</div>
                      <div className="text-[11px] text-gray-400">
                        {e.category || "기타"}
                        {e.billingDay ? ` · ${e.billingDay}일` : ""}
                      </div>
                    </div>
                    <div className="font-bold text-slate-900">{formatNumber(Number(e.amount) || 0)}만</div>
                  </div>
                ))}
                {uniqueExpenses.length > mobileLimit && (
                  <div className="text-xs text-gray-400 pl-1">+{uniqueExpenses.length - mobileLimit}개 더 보기</div>
                )}
              </div>
            )}
          </Card>

          <Card className="p-3">
            <div className="text-sm text-gray-500 mb-2">수입</div>
            {uniqueIncomes.length === 0 ? (
              <div className="text-sm text-gray-400">저장된 정기 수입이 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {uniqueIncomes.slice(0, mobileLimit).map((i) => (
                  <div key={i.id} className="flex items-center justify-between rounded-lg border p-3 bg-white">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{i.name}</div>
                      <div className="text-[11px] text-gray-400">
                        {i.payDay ? `입금일 ${i.payDay}일` : ""}
                      </div>
                    </div>
                    <div className="font-bold text-slate-900">{formatNumber(Number(i.amount) || 0)}만</div>
                  </div>
                ))}
                {uniqueIncomes.length > mobileLimit && (
                  <div className="text-xs text-gray-400 pl-1">+{uniqueIncomes.length - mobileLimit}개 더 보기</div>
                )}
              </div>
            )}
          </Card>

          {sources.length > 0 && (
            <Card className="p-4 border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <div className="text-sm font-semibold text-gray-700">데이터 출처</div>
              </div>
              <div className="space-y-2">
                {sources.map((source, index) => {
                  const formatDate = (dateStr: string) => {
                    try {
                      const date = new Date(dateStr)
                      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                    } catch {
                      return dateStr
                    }
                  }
                  return (
                    <div key={index} className="text-xs text-gray-600 bg-white p-3 rounded-lg border border-gray-200">
                      <div className="font-medium text-gray-800 mb-1">
                        {source.cardName}
                        {source.cardNumber && ` ${source.cardNumber}`}
                      </div>
                      <div className="text-gray-500">
                        {formatDate(source.dateRange.start)} ~ {formatDate(source.dateRange.end)} 참조
                        <span className="ml-2 text-gray-400">({source.transactionCount}건)</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </main>
  )
}

