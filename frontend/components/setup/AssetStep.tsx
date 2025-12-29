"use client"

import { useState, useEffect, useMemo } from "react"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2, Wallet, Building2, Coins, CreditCard, PiggyBank, CircleDollarSign } from "lucide-react"
import { formatNumber, parseNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

interface Asset {
    id: string
    type: "BANK" | "CASH" | "STOCK" | "REAL_ESTATE" | "COIN" | "OTHER"
    name: string
    balance: number
    monthlyIncome?: number // New: e.g. Rent, Dividend
    monthlyIncomeDay?: number // 월 수입 입금일
}

interface AssetStepProps {
    onNext: (assets: Asset[]) => void
    initialData?: Asset[] // Load saved data
}

const ASSET_TYPES = [
    { type: "BANK", label: "예적금", icon: PiggyBank, color: "text-blue-600 bg-blue-100 border-blue-200" },
    { type: "STOCK", label: "주식/펀드", icon: CircleDollarSign, color: "text-sky-700 bg-sky-100 border-sky-200" },
    { type: "REAL_ESTATE", label: "부동산", icon: Building2, color: "text-indigo-600 bg-indigo-100 border-indigo-200" },
    { type: "COIN", label: "코인", icon: Coins, color: "text-yellow-600 bg-yellow-100 border-yellow-200" },
    { type: "CASH", label: "현금", icon: Wallet, color: "text-green-600 bg-green-100 border-green-200" },
    { type: "OTHER", label: "기타", icon: CreditCard, color: "text-gray-600 bg-gray-100 border-gray-200" },
] as const

export default function AssetStep({ onNext, initialData }: AssetStepProps) {
    const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`
    const createDefaultAssets = (): Asset[] => ([
        { id: makeId(), type: 'REAL_ESTATE', name: '전월세 보증금 (또는 자가)', balance: 0 },
        { id: makeId(), type: 'BANK', name: '주거래 통장', balance: 0 },
        { id: makeId(), type: 'STOCK', name: '주식/투자', balance: 0 },
        { id: makeId(), type: 'CASH', name: '비상금 (현금)', balance: 0 },
    ])

    const [assets, setAssets] = useState<Asset[]>(createDefaultAssets())

    // 2. Hydrate from parent initialData (DB 또는 부모 state)
    useEffect(() => {
        if (initialData && Array.isArray(initialData) && initialData.length > 0) {
            // ID 기준 중복 제거
            const unique = initialData.reduce<Asset[]>((acc, cur) => {
                if (!acc.find((a) => a.id === cur.id)) acc.push(cur)
                return acc
            }, [])
            setAssets(unique)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(initialData ?? [])])

    const addAsset = (type: Asset["type"]) => {
        const newAsset: Asset = {
            id: Date.now().toString(),
            type,
            name: type === 'BANK' ? '새 통장' : type === 'STOCK' ? '새 주식' : '',
            balance: 0
        }
        setAssets([...assets, newAsset])
    }

    const removeAsset = (id: string) => {
        setAssets(assets.filter(a => a.id !== id))
    }

    const updateAsset = (id: string, field: keyof Asset, value: any) => {
        setAssets(assets.map(a => a.id === id ? { ...a, [field]: value } : a))
    }

    const totalAssets = assets.reduce((sum, asset) => sum + asset.balance, 0)

    return (
        <div className="space-y-6">
            <CardHeader className="pb-4">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">내 자산 입력</h2>
                    <p className="text-gray-500 text-sm hidden md:block">
                        아래 아이콘을 눌러 자산을 추가하세요 (단위: <span className="text-blue-600 font-bold">만원</span>)
                    </p>
                </div>

                {/* Quick Add Icons (Radio-like selection) */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 pt-4">
                    {ASSET_TYPES.map((t) => (
                        <button
                            key={t.type}
                            onClick={() => addAsset(t.type as Asset["type"])}
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
                <div className="bg-blue-600 rounded-2xl p-4 sm:p-6 text-white text-center shadow-lg shadow-blue-200">
                    <div className="text-blue-100 text-sm mb-1">총 자산</div>
                    <div className="text-4xl font-bold tracking-tight">
                        {formatNumber(totalAssets)} <span className="text-xl font-normal opacity-80">만원</span>
                    </div>
                </div>

                {/* Asset List */}
                <div className="space-y-3">
                    {assets.length === 0 && (
                        <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-xl">
                            등록된 자산이 없습니다.<br />위 아이콘을 눌러 추가해주세요.
                        </div>
                    )}

                    {assets.map((asset, index) => {
                        const typeInfo = ASSET_TYPES.find(t => t.type === asset.type) || ASSET_TYPES[5]
                        return (
                            <div
                                key={asset.id}
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
                                                    placeholder="항목명 (예: 카카오뱅크)"
                                                    value={asset.name}
                                                    onChange={(e) => updateAsset(asset.id, 'name', e.target.value)}
                                                />
                                                <div className="text-xs text-gray-400">{typeInfo.label}</div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeAsset(asset.id)}
                                                className="h-8 w-8 text-gray-300 hover:text-red-500 hover:bg-red-50 shrink-0 mt-1"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs w-full">
                                            <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded text-blue-700">
                                                <span>수입</span>
                                                <input
                                                    className="w-14 bg-transparent text-right font-bold outline-none"
                                                    placeholder="0"
                                                    value={asset.monthlyIncome || ''}
                                                    onChange={(e) => updateAsset(asset.id, 'monthlyIncome', e.target.value)}
                                                />
                                                <span>만</span>
                                            </div>
                                            <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded text-blue-700">
                                                <span>입금일</span>
                                                <input
                                                    className="w-12 bg-transparent text-right font-bold outline-none"
                                                    placeholder="?"
                                                    value={asset.monthlyIncomeDay ?? ''}
                                                    onChange={(e) => updateAsset(asset.id, 'monthlyIncomeDay', e.target.value)}
                                                />
                                                <span>일</span>
                                            </div>
                                        </div>

                                        <div className="w-full relative pt-2">
                                            <Input
                                                className="h-10 text-right pr-9 font-bold text-lg border-gray-200 focus-visible:ring-blue-500 bg-gray-50/50"
                                                type="text"
                                                placeholder="0"
                                                value={asset.balance > 0 ? formatNumber(asset.balance) : ''}
                                                onChange={(e) => {
                                                    const val = parseNumber(e.target.value)
                                                    if (!isNaN(val)) updateAsset(asset.id, 'balance', val)
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
                        onClick={async () => {
                            await onNext(assets)
                        }}
                    >
                        저장
                    </Button>
                </div>
            </CardContent>
        </div>
    )
}
