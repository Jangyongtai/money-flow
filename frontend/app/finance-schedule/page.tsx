"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { getAssets, getDebts, getExpenses, getIncomes } from "@/lib/api"
import FinanceScheduleStep from "@/components/setup/FinanceScheduleStep"

type Asset = { id: string; type: string; name: string; balance: number; monthlyIncome?: number }
type Debt = { id: string; type: string; name: string; amount: number; interestRate?: number; paymentDay?: number; paymentAmount?: number }
type Expense = { id: string; category?: string; name: string; amount: number; billingDay?: number }
type Income = { id: string; name: string; amount: number; payDay?: number }

function FinanceScheduleContent() {
  const searchParams = useSearchParams()
  const profileId = "default-profile"
  const [assets, setAssets] = useState<Asset[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [incomes, setIncomes] = useState<Income[]>([])
  const [loading, setLoading] = useState(true)
  const initialView = searchParams.get("view") || "calendar"

  useEffect(() => {
    const load = async () => {
      try {
        const [a, d, e, inc] = await Promise.allSettled([
          getAssets(profileId),
          getDebts(profileId),
          getExpenses(profileId),
          getIncomes(profileId),
        ])
        setAssets(a.status === 'fulfilled' ? (a.value ?? []) : [])
        setDebts(d.status === 'fulfilled' ? (d.value ?? []) : [])
        setExpenses(e.status === 'fulfilled' ? (e.value ?? []) : [])
        setIncomes(inc.status === 'fulfilled' ? (inc.value ?? []) : [])
      } catch (err: any) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [profileId])

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-500">로딩 중...</div>
    )
  }

  return (
    <Card className="p-0 overflow-hidden">
      <FinanceScheduleStep
        assets={assets}
        debts={debts}
        expenses={expenses}
        incomes={incomes}
        initialViewMode={initialView === "list" ? "list" : "calendar"}
      />
    </Card>
  )
}

export default function FinanceSchedulePage() {
  return (
    <main className="min-h-screen bg-gray-50 px-1 py-4">
      <div className="max-w-7xl mx-auto">
        <Suspense fallback={<div className="text-center py-20 text-gray-500">페이지 준비 중...</div>}>
          <FinanceScheduleContent />
        </Suspense>
      </div>
    </main>
  )
}

