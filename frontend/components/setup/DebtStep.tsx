"use client"

import { useState, useEffect } from "react"
import { CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2, Building2, CreditCard, Landmark, CarFront } from "lucide-react"
import { formatNumber, parseNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

interface Debt {
    id: string
    type: "LOAN" | "CREDIT_CARD" | "FURNITURE" | "CAR" | "OTHER"
    name: string
    amount: number
    interestRate?: number // Optional for now
    paymentAmount?: number // 실제 월 납입금액 (원리금/이자 구분 없이 실제 지출)
    paymentDay?: number // Day of month (1-31)
}

interface DebtStepProps {
    onNext: (debts: Debt[]) => void
    initialData?: Debt[]
}

const DEBT_TYPES = [
    { type: "LOAN", label: "은행 대출", icon: Landmark, color: "text-sky-700 bg-sky-100 border-sky-200" },
    { type: "FURNITURE", label: "전세 자금 대출", icon: Building2, color: "text-indigo-600 bg-indigo-100 border-indigo-200" },
    { type: "CREDIT_CARD", label: "카드 할부/리볼빙", icon: CreditCard, color: "text-yellow-600 bg-yellow-100 border-yellow-200" },
    { type: "CAR", label: "자동차 할부", icon: CarFront, color: "text-blue-600 bg-blue-100 border-blue-200" },
] as const

export default function DebtStep({ onNext, initialData }: DebtStepProps) {
    const [debts, setDebts] = useState<Debt[]>([])

    const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`

    const addDebt = (type: Debt["type"]) => {
        const newDebt: Debt = {
            id: makeId(),
            type,
            name: type === 'LOAN' ? '신용 대출' : type === 'FURNITURE' ? '전세 대출' : '',
            amount: 0
        }
        setDebts([...debts, newDebt])
    }

    const removeDebt = (id: string) => {
        setDebts(debts.filter(d => d.id !== id))
    }

    const updateDebt = (id: string, field: keyof Debt, value: any) => {
        setDebts(debts.map(d => d.id === id ? { ...d, [field]: value } : d))
    }

    // Hydrate from parent initialData (DB/state)
    useEffect(() => {
        if (initialData && Array.isArray(initialData) && initialData.length > 0) {
            const unique = initialData.reduce<Debt[]>((acc, cur) => {
                if (!acc.find((d) => d.id === cur.id)) acc.push(cur)
                return acc
            }, [])
            setDebts(unique)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(initialData ?? [])])

    const totalDebt = debts.reduce((sum, d) => sum + d.amount, 0)
    const totalPayment = debts.reduce((sum, d) => sum + (d.paymentAmount || 0), 0)

    return (
        <div className="space-y-6">
            <CardHeader className="pb-4">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">부채(빚) 입력</h2>
                <p className="text-gray-500 text-sm hidden md:block">
                    갚아야 할 돈을 입력하세요 (단위: <span className="text-red-600 font-bold">만원</span>)
                </p>
                </div>

                {/* Quick Add Icons */}
                <div className="grid grid-cols-4 gap-2 pt-4">
                    {DEBT_TYPES.map((t) => (
                        <button
                            key={t.type}
                            onClick={() => addDebt(t.type as Debt["type"])}
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
                {/* Total Summary */}
                <div className="bg-slate-50 rounded-2xl p-4 sm:p-6 text-center shadow-inner space-y-1.5">
                    <div className="text-slate-600 text-sm mb-1">총 부채</div>
                    <div className="text-4xl font-bold tracking-tight text-slate-900">
                        {formatNumber(totalDebt)} <span className="text-xl font-normal opacity-80">만원</span>
                    </div>
                    <div className="text-sm text-slate-600">
                        월 납입(실제 지출): <span className="font-semibold text-slate-900">{formatNumber(totalPayment)} 만원</span>
                    </div>
                </div>

                {/* Debt List */}
                <div className="space-y-3">
                    {debts.length === 0 && (
                        <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-xl">
                            부채가 없다면 '다음'을 누르세요.<br />(정말 없으신가요? 부럽습니다! 🎉)
                        </div>
                    )}

                    {debts.map((debt) => {
                        const typeInfo = DEBT_TYPES.find(t => t.type === debt.type) || DEBT_TYPES[0]
                        return (
                            <div
                                key={debt.id}
                                className="bg-white p-2 sm:p-3 rounded-xl border border-gray-100 shadow-sm"
                            >
                                <div className="flex items-start gap-3">
                                    <div className={cn("p-2 rounded-lg shrink-0", typeInfo.color)}>
                                        <typeInfo.icon className="w-5 h-5" />
                                    </div>

                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex items-start gap-2">
                                            <div className="flex-1 min-w-0 space-y-0.5">
                                                <Input
                                                    className="h-9 border-none shadow-none focus-visible:ring-0 p-0 font-medium text-base placeholder:text-gray-300"
                                                    placeholder="항목명 (예: 신한 마이너스통장)"
                                                    value={debt.name}
                                                    onChange={(e) => updateDebt(debt.id, 'name', e.target.value)}
                                                />
                                                <div className="text-xs text-gray-400">{typeInfo.label}</div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeDebt(debt.id)}
                                                className="h-8 w-8 text-gray-300 hover:text-blue-600 hover:bg-blue-50 shrink-0 mt-1"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                            <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded text-gray-700">
                                                <span>금리</span>
                                                <input
                                                    className="w-12 bg-transparent text-right font-bold outline-none"
                                                    placeholder="0"
                                                    value={debt.interestRate ?? ''}
                                                    onChange={(e) => updateDebt(debt.id, 'interestRate', e.target.value)}
                                                />
                                                <span>%</span>
                                            </div>
                                            <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded text-blue-700">
                                                <span>월 납입</span>
                                                <input
                                                    className="w-16 bg-transparent text-right font-bold outline-none"
                                                    placeholder="0"
                                                    value={debt.paymentAmount ?? ''}
                                                    onChange={(e) => updateDebt(debt.id, 'paymentAmount', parseNumber(e.target.value))}
                                                />
                                                <span>만</span>
                                            </div>
                                            <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded text-gray-700">
                                                <span>납부일</span>
                                                <input
                                                    className="w-10 bg-transparent text-right font-bold outline-none"
                                                    placeholder="?"
                                                    value={debt.paymentDay ?? ''}
                                                    onChange={(e) => updateDebt(debt.id, 'paymentDay', e.target.value)}
                                                />
                                                <span>일</span>
                                            </div>
                                        </div>

                                        <div className="w-full relative pt-2">
                                            <Input
                                                className="h-10 text-right pr-9 font-bold text-lg border-gray-200 focus-visible:ring-blue-500 bg-gray-50/50 text-slate-900"
                                                type="text"
                                                placeholder="0"
                                                value={debt.amount > 0 ? formatNumber(debt.amount) : ''}
                                                onChange={(e) => {
                                                    const val = parseNumber(e.target.value)
                                                    if (!isNaN(val)) updateDebt(debt.id, 'amount', val)
                                                }}
                                            />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none font-medium">만원</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="pt-4">
                    <Button
                        className="w-full h-14 text-lg font-bold text-white rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-[1px] active:translate-y-0 transition-transform transition-shadow"
                        onClick={() => onNext(debts)}
                    >
                        저장
                    </Button>
                </div>
            </CardContent>
        </div>
    )
}
