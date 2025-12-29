"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import AssetStep from "./AssetStep"
import DebtStep from "./DebtStep"

import { saveAssets, saveDebts, saveExpenses, saveIncomes, getAssets, getDebts, getExpenses, getIncomes } from "@/lib/api"
import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import ExpenseStep from "./ExpenseStep"
import IncomeStep from "./IncomeStep"

type StepKey = "ASSETS" | "DEBTS" | "EXPENSES"
type StepKeyExtended = StepKey | "INCOMES"

export default function Wizard() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const tabParam = searchParams.get("tab")
    
    // URL 파라미터를 StepKey로 변환
    const getStepFromTab = (tab: string | null): StepKeyExtended => {
        if (!tab) return "ASSETS"
        const tabMap: Record<string, StepKeyExtended> = {
            "assets": "ASSETS",
            "debts": "DEBTS",
            "expenses": "EXPENSES",
            "incomes": "INCOMES",
        }
        return tabMap[tab] || "ASSETS"
    }
    
    const [step, setStep] = useState<StepKeyExtended>(getStepFromTab(tabParam))
    
    // 탭 파라미터가 없으면 기본값으로 리다이렉트
    useEffect(() => {
        if (!tabParam) {
            router.replace("/?tab=assets")
        }
    }, [tabParam, router])
    const [profileId, setProfileId] = useState<string | null>(null)
    const [savedAssets, setSavedAssets] = useState<any[]>([])
    const [savedDebts, setSavedDebts] = useState<any[]>([])
    const [savedExpenses, setSavedExpenses] = useState<any[]>([])
    const [savedIncomes, setSavedIncomes] = useState<any[]>([])
    const [toast, setToast] = useState<string | null>(null)
    const showToast = (msg: string) => {
        setToast(msg)
        setTimeout(() => setToast(null), 1200)
    }
    // URL 파라미터 변경 감지
    useEffect(() => {
        const newStep = getStepFromTab(tabParam)
        setStep(newStep)
    }, [tabParam])

    const tabKeyToQuery = (step: StepKeyExtended) => {
        const reverseMap: Record<StepKeyExtended, string> = {
            ASSETS: "assets",
            DEBTS: "debts",
            EXPENSES: "expenses",
            INCOMES: "incomes",
        }
        return reverseMap[step] || "assets"
    }

    const handleTabChange = (next: StepKeyExtended) => {
        setStep(next)
        router.replace(`/?tab=${tabKeyToQuery(next)}`)
    }

    const normalizeAssets = (assets: any[]) =>
        (assets ?? []).map((a) => ({
            ...a,
            balance: Number(a.balance) || 0,
            monthlyIncome: a.monthlyIncome !== undefined && a.monthlyIncome !== null ? Number(a.monthlyIncome) : undefined,
            monthlyIncomeDay: a.monthlyIncomeDay !== undefined && a.monthlyIncomeDay !== null ? Number(a.monthlyIncomeDay) : undefined,
        }))

    const normalizeDebts = (debts: any[]) =>
        (debts ?? []).map((d) => ({
            ...d,
            amount: Number(d.amount) || 0,
            interestRate: d.interestRate !== undefined && d.interestRate !== null ? Number(d.interestRate) : undefined,
            paymentDay: d.paymentDay !== undefined && d.paymentDay !== null ? Number(d.paymentDay) : undefined,
            paymentAmount: d.paymentAmount !== undefined && d.paymentAmount !== null ? Number(d.paymentAmount) : undefined,
        }))

    useEffect(() => {
        const init = async () => {
            const id = "default-profile"
            setProfileId(id)
            try {
            const [assets, debts, expenses, incomes] = await Promise.all([getAssets(id), getDebts(id), getExpenses(id), getIncomes(id)])
            const normAssets = normalizeAssets(assets)
            // ID 기준 중복 제거
            const uniqueAssets = normAssets.reduce<any[]>((acc, cur) => {
                if (!acc.find((a) => a.id === cur.id)) acc.push(cur)
                return acc
            }, [])
            setSavedAssets(uniqueAssets)
            setSavedDebts(normalizeDebts(debts))
                setSavedExpenses(expenses ?? [])
                setSavedIncomes(incomes ?? [])
            } catch (e) {
                console.error("Failed to load initial data", e)
            }
        }
        init()
    }, [])

    const handleAssetsNext = async (assets: any[]) => {
        console.log("Saving Assets (Final):", assets)
        setSavedAssets(normalizeAssets(assets))
        if (!profileId) {
            showToast("프로필이 아직 준비되지 않았습니다. 잠시 후 다시 저장해주세요.")
            return
        }
        try {
            const ok = await saveAssets(profileId, assets)
            if (ok) {
                showToast("자산이 저장되었습니다.")
            } else {
                showToast("자산 저장에 실패했습니다.")
            }
        } catch (e) {
            console.error(e)
            showToast("자산 저장 중 오류가 발생했습니다.")
        }
    }

    const handleDebtsNext = async (debts: any[]) => {
        console.log("Saving Debts (Final):", debts)
        setSavedDebts(normalizeDebts(debts))

        if (profileId) {
            await saveDebts(profileId, debts)
            showToast("부채가 저장되었습니다.")
        }

        // stay on debts tab after save
    }

    const handleExpensesNext = async (expenses: any[]) => {
        console.log("Saving Expenses (Final):", expenses)
        setSavedExpenses(expenses)
        if (profileId) {
            await saveExpenses(profileId, expenses)
            showToast("정기지출이 저장되었습니다.")
        }
    }

    const handleIncomesNext = async (incomes: any[]) => {
        console.log("Saving Incomes (Final):", incomes)
        setSavedIncomes(incomes)
        if (profileId) {
            await saveIncomes(profileId, incomes)
            showToast("정기수입이 저장되었습니다.")
        }
    }

    return (
        <div className="flex min-h-screen items-start justify-center bg-gray-50 px-1 py-6 sm:px-2">
            <Card className="w-full max-w-5xl relative">
                {toast && (
                    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
                        <div className="rounded-full bg-gray-900/90 text-white px-4 py-2 text-sm shadow-lg shadow-blue-200 animate-in fade-in slide-in-from-top-2">
                            {toast}
                        </div>
                    </div>
                )}

                {/* 내부 메뉴 제거 - TOP 메뉴만 사용 */}

                {/* Keep steps mounted so switching tabs doesn't reset input state */}
                <div className={step === "ASSETS" ? "" : "hidden"}>
                    <AssetStep
                        onNext={handleAssetsNext}
                        // Always rely on internal localStorage logic of AssetStep if possible, 
                        // but keeping initialData for first load.
                        initialData={savedAssets}
                    />
                </div>

                <div className={step === "DEBTS" ? "" : "hidden"}>
                    <DebtStep
                        onNext={handleDebtsNext}
                        initialData={savedDebts}
                    />
                </div>

                <div className={step === "EXPENSES" ? "" : "hidden"}>
                    <ExpenseStep
                        onNext={handleExpensesNext}
                        initialData={savedExpenses}
                        linkedDebts={savedDebts}
                    />
                </div>

                <div className={step === "INCOMES" ? "" : "hidden"}>
                    <IncomeStep
                        onNext={handleIncomesNext}
                        initialData={savedIncomes}
                        linkedAssets={savedAssets}
                    />
                </div>

            </Card>
        </div>
    )
}
