"use client"

import { useEffect, useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatNumber } from "@/lib/format"
import { getTransactions, deleteTransaction, updateTransaction, deleteAllTransactions, getTransactionSources, deleteTransactionNameMappings, getTransactionNameMappings, reclassifyTransactions } from "@/lib/api"
import ExcelUpload from "@/components/transactions/ExcelUpload"
import ReviewNeededList from "@/components/transactions/ReviewNeededList"
import AmbiguousTransactionsList from "@/components/transactions/AmbiguousTransactionsList"
import PatternAnalysis from "@/components/transactions/PatternAnalysis"
import MappingManager from "@/components/transactions/MappingManager"
import { Trash2, ArrowLeft, TrendingUp, TrendingDown, Calendar, Filter, AlertTriangle, Edit2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText, Info } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

import { CATEGORIES } from "@/lib/categories"

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
  confidence?: number
  needsReview?: boolean
  userConfirmed?: boolean
  aiCategory?: string
  classificationReason?: string // 분류 근거
  duplicateCheckConfidence?: number
  possibleDuplicate?: boolean
  sourceFile?: string
}

export default function TransactionsPage() {
  const router = useRouter()
  const profileId = "default-profile"
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL")
  const [filterMode, setFilterMode] = useState<"period" | "month">("period") // 기간 선택 또는 월별 선택
  const [selectedPeriod, setSelectedPeriod] = useState<"1month" | "3months" | "6months" | "1year">("1month")
  const [filterMonth, setFilterMonth] = useState<string>("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ category: string }>({ category: "" })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [sources, setSources] = useState<any[]>([])
  const [reclassScope, setReclassScope] = useState<"needsReview" | "lowConfidence" | "all">("needsReview")
  const [reclassLoading, setReclassLoading] = useState(false)

  // 현재 월을 기본값으로 설정 (YYYY-MM 형식)
  useEffect(() => {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    setFilterMonth(currentMonth)
  }, [])

  // 기간 선택에 따른 날짜 범위 계산
  const getDateRange = (period: "1month" | "3months" | "6months" | "1year") => {
    const endDate = new Date()
    const startDate = new Date()
    
    switch (period) {
      case "1month":
        startDate.setMonth(endDate.getMonth() - 1)
        break
      case "3months":
        startDate.setMonth(endDate.getMonth() - 3)
        break
      case "6months":
        startDate.setMonth(endDate.getMonth() - 6)
        break
      case "1year":
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    }
  }

  // 월별 필터에 따른 날짜 범위 계산
  const getMonthDateRange = (monthStr: string) => {
    if (!monthStr) return { startDate: "", endDate: "" }
    const [year, month] = monthStr.split("-").map(Number)
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
    return { startDate, endDate }
  }


  const loadTransactions = async (showMessage = false) => {
    setLoading(true)
    try {
      const filters: any = {}
      
      // 필터 모드에 따라 날짜 범위 설정
      if (filterMode === "period") {
        const dateRange = getDateRange(selectedPeriod)
        filters.startDate = dateRange.startDate
        filters.endDate = dateRange.endDate
      } else if (filterMode === "month" && filterMonth) {
        const dateRange = getMonthDateRange(filterMonth)
        filters.startDate = dateRange.startDate
        filters.endDate = dateRange.endDate
      }
      
      if (filterType !== "ALL") {
        filters.type = filterType
      }
      
      const data = await getTransactions(profileId, filters)
      setTransactions(data)
      
      if (showMessage && data.length > 0) {
        console.log(`거래 내역 목록이 업데이트되었습니다. (${data.length}건)`)
      }
    } catch (error) {
      console.error("Failed to load transactions", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions()
    loadSources()
  }, [filterType, selectedPeriod, filterMode, filterMonth])

  const loadSources = async () => {
    try {
      const data = await getTransactionSources(profileId)
      setSources(data || [])
    } catch (error) {
      console.error("Failed to load sources", error)
      setSources([])
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 거래 내역을 삭제하시겠습니까?")) return
    
    try {
      await deleteTransaction(profileId, id)
      setTransactions(transactions.filter(t => t.id !== id))
    } catch (error) {
      alert("삭제 중 오류가 발생했습니다.")
    }
  }

  const handleUpdateTransaction = async (id: string, updates: Partial<Transaction>, updateAllWithSameName = false) => {
    try {
      const result = await updateTransaction(profileId, id, updates, updateAllWithSameName)
      
      // 수정 모드 종료
      setEditingId(null)
      
      // 거래 내역 다시 로드하여 최신 상태 반영
      await loadTransactions()
      
      if (updateAllWithSameName && result.updatedCount > 1) {
        alert(`✅ 같은 이름의 거래 ${result.updatedCount}건이 모두 수정되었습니다.`)
      }
    } catch (error) {
      console.error("Failed to update transaction", error)
      alert("업데이트 중 오류가 발생했습니다.")
    }
  }

  const startEdit = (transaction: Transaction) => {
    setEditingId(transaction.id)
    setEditForm({
      category: transaction.category || "기타",
    })
  }

  const handleConfirmTransaction = async (id: string) => {
    await handleUpdateTransaction(id, { userConfirmed: true, needsReview: false, possibleDuplicate: false })
  }

  const handleConfirmAmbiguous = async (id: string) => {
    // 중복 아님 - 저장
    await handleUpdateTransaction(id, { 
      userConfirmed: true, 
      needsReview: false, 
      possibleDuplicate: false 
    })
    // 리스트에서 제거
    setTransactions(transactions.filter(t => t.id !== id))
  }

  const handleRejectAmbiguous = async (id: string) => {
    // 중복임 - 삭제
    await handleDelete(id)
  }

  const handleDeleteAll = async () => {
    if (!confirm("⚠️ 정말 모든 거래 내역을 삭제하시겠습니까?\n\n⚠️ 주의: 자산, 부채, 정기지출, 정기수입은 삭제되지 않습니다.\n거래 내역(가계부)만 삭제됩니다.\n\n개인 매핑(카테고리 설정)은 유지됩니다.\n\n이 작업은 되돌릴 수 없습니다.")) return
    
    try {
      await deleteAllTransactions(profileId)
      setTransactions([])
      alert("✅ 모든 거래 내역이 삭제되었습니다.\n\n자산, 부채, 정기지출, 정기수입은 그대로 유지됩니다.\n개인 매핑(카테고리 설정)도 유지됩니다.")
    } catch (error) {
      console.error("Failed to delete all transactions", error)
      alert("삭제 중 오류가 발생했습니다.")
    }
  }

  const handleDeleteMappings = async () => {
    if (!confirm("⚠️ 정말 모든 개인 매핑(카테고리 설정)을 삭제하시겠습니까?\n\n이전에 설정한 거래명-카테고리 매핑이 모두 삭제됩니다.\n다음 파일 업로드 시 다시 분류가 진행됩니다.\n\n이 작업은 되돌릴 수 없습니다.")) return
    
    try {
      await deleteTransactionNameMappings(profileId)
      alert("✅ 모든 개인 매핑이 삭제되었습니다.\n\n다음 파일 업로드 시 다시 분류가 진행됩니다.")
    } catch (error) {
      console.error("Failed to delete mappings", error)
      alert("삭제 중 오류가 발생했습니다.")
    }
  }

  const handleReclassify = async () => {
    const scopeLabel =
      reclassScope === "needsReview"
        ? "검토 필요 항목만"
        : reclassScope === "lowConfidence"
        ? "신뢰도 낮은 항목(0.7 미만)"
        : "전체(사용자 확정 제외)"

    if (!confirm(`재검증을 실행할까요?\n\n대상: ${scopeLabel}\n사용자 확정한 항목은 그대로 둡니다.`)) return

    try {
      setReclassLoading(true)
      const result = await reclassifyTransactions(profileId, {
        scope: reclassScope,
        confidenceThreshold: 0.7,
      })
      await loadTransactions(true)
      alert(`✅ 재검증 완료\n대상: ${result.total}건\n변경/업데이트: ${result.updated}건`)
    } catch (error: any) {
      console.error("Failed to reclassify", error)
      alert(error?.message || "재검증 중 오류가 발생했습니다.")
    } finally {
      setReclassLoading(false)
    }
  }


  const filteredTransactions = useMemo(() => {
    return transactions
  }, [transactions])

  // 페이지네이션 계산
  const totalPages = useMemo(() => {
    return Math.ceil(filteredTransactions.length / itemsPerPage)
  }, [filteredTransactions.length, itemsPerPage])

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredTransactions.slice(startIndex, endIndex)
  }, [filteredTransactions, currentPage, itemsPerPage])

  // 페이지 변경 시 스크롤을 맨 위로
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentPage, itemsPerPage])

  // 필터 변경 시 첫 페이지로 이동
  useEffect(() => {
    setCurrentPage(1)
  }, [filterType, selectedPeriod, filterMode, filterMonth])

  const handleMonthChange = (direction: 'prev' | 'next') => {
    if (!filterMonth) return
    
    const [year, month] = filterMonth.split("-").map(Number)
    let newYear = year
    let newMonth = month
    
    if (direction === 'prev') {
      newMonth--
      if (newMonth < 1) {
        newMonth = 12
        newYear--
      }
    } else {
      newMonth++
      if (newMonth > 12) {
        newMonth = 1
        newYear++
      }
    }
    
    setFilterMonth(`${newYear}-${String(newMonth).padStart(2, "0")}`)
  }

  const summary = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === "INCOME")
      .reduce((sum, t) => sum + (t.amount || 0), 0)
    const expense = filteredTransactions
      .filter(t => t.type === "EXPENSE")
      .reduce((sum, t) => sum + (t.amount || 0), 0)
    return { income, expense, net: income - expense }
  }, [filteredTransactions])

  // 날짜를 동일한 형식으로 표시 (YY.MM.DD로 축약)
  const formatDate = (dateStr: string) => {
    try {
      // YYYY-MM-DD 형식이면 축약해 표시
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split("-")
        return `${year.slice(-2)}.${month}.${day}` // YY.MM.DD
      }
      // 다른 형식이면 파싱 시도
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        const yy = String(date.getFullYear()).slice(-2)
        const mm = String(date.getMonth() + 1).padStart(2, "0")
        const dd = String(date.getDate()).padStart(2, "0")
        return `${yy}.${mm}.${dd}`
      }
      return dateStr
    } catch {
      return dateStr
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/")}
              className="text-gray-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              뒤로
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">가계부</h1>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              수입
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatNumber(summary.income)}원
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
              <TrendingDown className="w-4 h-4 text-red-600" />
              지출
            </div>
            <div className="text-2xl font-bold text-red-600">
              {formatNumber(summary.expense)}원
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              순수익
            </div>
            <div className={cn(
              "text-2xl font-bold",
              summary.net >= 0 ? "text-blue-600" : "text-red-600"
            )}>
              {formatNumber(summary.net)}원
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">필터:</span>
            </div>
            
            <div className="flex gap-2">
              {(["ALL", "INCOME", "EXPENSE"] as const).map((type) => (
                <Button
                  key={type}
                  variant={filterType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType(type)}
                  className={cn(
                    filterType === type && "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  {type === "ALL" ? "전체" : type === "INCOME" ? "수입" : "지출"}
                </Button>
              ))}
            </div>

            {/* 필터 모드 선택 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">기간:</span>
              <div className="flex gap-2">
                <Button
                  variant={filterMode === "period" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterMode("period")}
                  className={cn(
                    filterMode === "period" && "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  기간 선택
                </Button>
                <Button
                  variant={filterMode === "month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterMode("month")}
                  className={cn(
                    filterMode === "month" && "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  월별 선택
                </Button>
              </div>
            </div>

            {/* 기간 선택 모드 */}
            {filterMode === "period" && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value as "1month" | "3months" | "6months" | "1year")}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="1month">최근 1개월</option>
                  <option value="3months">최근 3개월</option>
                  <option value="6months">최근 6개월</option>
                  <option value="1year">최근 1년</option>
                </select>
              </div>
            )}

            {/* 월별 선택 모드 */}
            {filterMode === "month" && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">월:</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleMonthChange('prev')}
                    title="이전 달"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <input
                    type="month"
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleMonthChange('next')}
                    title="다음 달"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
            
            <div className="ml-auto flex gap-2">
              <div className="flex items-center gap-2">
                <select
                  value={reclassScope}
                  onChange={(e) => setReclassScope(e.target.value as any)}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="재검증 대상 선택"
                >
                  <option value="needsReview">검토 필요만</option>
                  <option value="lowConfidence">신뢰도 낮음(&lt;0.7)</option>
                  <option value="all">전체(수동 확정 제외)</option>
                </select>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleReclassify}
                  disabled={reclassLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                  title="엑셀 재업로드 없이 새 매핑/규칙으로 재분류합니다."
                >
                  {reclassLoading ? "재검증 중..." : "재검증"}
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteMappings}
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                title="사용자가 설정한 거래명-카테고리 개인 매핑만 삭제합니다. 거래 내역은 유지됩니다."
              >
                <Trash2 className="w-4 h-4 mr-2" />
                개인 매핑 삭제
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteAll}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                title="거래 내역만 삭제됩니다. 자산/부채/정기지출/정기수입과 사용자 매핑은 삭제되지 않습니다."
              >
                <Trash2 className="w-4 h-4 mr-2" />
                거래 내역 전체 삭제
              </Button>
            </div>
          </div>
        </Card>

        {/* Excel Upload */}
        <ExcelUpload profileId={profileId} onUploadSuccess={loadTransactions} />

        {/* Review Needed List */}
        <ReviewNeededList
          transactions={transactions}
          onUpdate={handleUpdateTransaction}
          onConfirm={handleConfirmTransaction}
        />

        {/* Ambiguous Transactions List */}
        <AmbiguousTransactionsList
          transactions={transactions.filter(t => t.possibleDuplicate && t.needsReview && !t.userConfirmed)}
          onConfirm={handleConfirmAmbiguous}
          onReject={handleRejectAmbiguous}
        />

        {/* Pattern Analysis */}
        <PatternAnalysis 
          profileId={profileId} 
          period={filterMode === "period" ? selectedPeriod : undefined}
          month={filterMode === "month" ? filterMonth : undefined}
        />

        {/* 키워드 매핑 관리 */}
        <MappingManager profileId={profileId} />

        {/* 데이터 출처 */}
        {sources.length > 0 && (
          <Card className="p-4 border-blue-200 bg-blue-50">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-blue-900">데이터 출처</h3>
            </div>
            <div className="space-y-2">
              {sources.map((source, index) => {
                const formatDate = (dateStr: string) => {
                  try {
                    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                      const [year, month, day] = dateStr.split("-")
                      return `${year}.${month}.${day}`
                    }
                    const date = new Date(dateStr)
                    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
                  } catch {
                    return dateStr
                  }
                }
                
                return (
                  <div key={index} className="text-xs text-blue-800 bg-white p-3 rounded-lg border border-blue-200">
                    <div className="font-medium text-blue-900 mb-1">
                      {source.cardName || "알 수 없음"}
                      {source.cardNumber && ` ${source.cardNumber}`}
                    </div>
                    <div className="text-blue-700">
                      {source.dateRange.start && source.dateRange.end
                        ? `${formatDate(source.dateRange.start)} ~ ${formatDate(source.dateRange.end)} 참조`
                        : "날짜 정보 없음"}
                      <span className="ml-2 text-blue-500">
                        ({source.transactionCount}건)
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Transactions List */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">가계부 내역</h2>
          
          {loading ? (
            <div className="text-center py-8 text-gray-400">로딩 중...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              거래 내역이 없습니다. 엑셀 파일을 업로드하거나 직접 추가해주세요.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    전체 {filteredTransactions.length}건
                  </span>
                  <span className="text-sm text-gray-400">|</span>
                  <span className="text-sm text-gray-600">
                    {((currentPage - 1) * itemsPerPage + 1)}-{Math.min(currentPage * itemsPerPage, filteredTransactions.length)}건 표시
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">보기:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={10}>10개</option>
                    <option value={20}>20개</option>
                    <option value={50}>50개</option>
                    <option value={100}>100개</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                {paginatedTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex flex-col p-4 border rounded-lg hover:bg-gray-50 transition-colors group gap-2"
                >
                  {/* 상단: 날짜 - 카테고리 정렬 */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-gray-700 min-w-[76px]">
                      {formatDate(transaction.date)}
                    </div>
                    <div className="flex items-center gap-2">
                      {transaction.category && (
                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                          {transaction.category}
                        </span>
                      )}
                      {transaction.classificationReason && (
                        <div className="relative group/info">
                          <Info className="w-3 h-3 text-gray-400 cursor-help" />
                          <div className="absolute right-0 bottom-full mb-2 hidden group-hover/info:block z-10 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg">
                            <div className="font-semibold mb-1">분류 근거:</div>
                            <div className="text-gray-200">{transaction.classificationReason}</div>
                            {transaction.confidence !== undefined && (
                              <div className="mt-1 text-gray-400">
                                신뢰도: {Math.round(transaction.confidence * 100)}%
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 하단: 이름/설명 - 금액 */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 truncate max-w-[70vw] sm:max-w-full">
                        {transaction.name}
                      </div>
                      {transaction.description && (
                        <div className="text-xs text-gray-500 mt-1 truncate">{transaction.description}</div>
                      )}
                    </div>

                    <div className="relative flex flex-col sm:flex-row items-end sm:items-start gap-2 shrink-0 min-w-[120px]">
                      <div
                        className={cn(
                          "font-bold text-lg text-right min-w-[100px]",
                          transaction.type === "INCOME" ? "text-green-600" : "text-red-600"
                        )}
                      >
                        {transaction.type === "INCOME" ? "+" : "-"}
                      {formatNumber(transaction.amount)}원
                      </div>
                      <div className="absolute top-0 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {editingId === transaction.id ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={editForm.category}
                              onChange={(e) => setEditForm({ category: e.target.value })}
                              className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateTransaction(transaction.id, { category: editForm.category })}
                              className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 shadow-sm hover:shadow-md transition-all"
                            >
                              저장
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingId(null)
                                setEditForm({ category: "" })
                              }}
                              className="h-8 px-3 border-gray-300 hover:bg-gray-50 transition-all"
                            >
                              취소
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateTransaction(transaction.id, { category: editForm.category }, true)}
                              className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 shadow-sm hover:shadow-md transition-all"
                              title="같은 이름의 모든 거래를 한번에 수정"
                            >
                              모두 수정
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button
                              size="icon"
                              onClick={() => startEdit(transaction)}
                              className="h-8 w-8 bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-sm hover:shadow-md transition-all"
                              title="카테고리 수정"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              onClick={() => handleDelete(transaction.id)}
                              className="h-8 w-8 bg-red-500 hover:bg-red-600 text-white border-0 shadow-sm hover:shadow-md transition-all"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* 페이지네이션 */}
            {filteredTransactions.length > 0 && totalPages > 1 && (
              <div className="mt-6 pt-4 border-t">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-600 whitespace-nowrap">
                    페이지 {currentPage} / {totalPages}
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto justify-center sm:justify-end pb-2 sm:pb-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="h-8 px-2 shrink-0"
                      title="첫 페이지"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="h-8 px-2 shrink-0"
                      title="이전 페이지"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    
                    {/* 페이지 번호 버튼 - 스크롤 가능 */}
                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide max-w-[300px] sm:max-w-[400px] px-2">
                      {Array.from({ length: totalPages }, (_, i) => {
                        const pageNum = i + 1
                        // 현재 페이지 주변 2페이지씩만 강조 표시
                        const isNearCurrent = Math.abs(pageNum - currentPage) <= 2
                        const isFirstOrLast = pageNum === 1 || pageNum === totalPages
                        const shouldShow = isNearCurrent || isFirstOrLast || (pageNum === currentPage - 3 && currentPage > 4) || (pageNum === currentPage + 3 && currentPage < totalPages - 3)
                        
                        if (!shouldShow) {
                          // 생략 표시
                          if ((pageNum === currentPage - 4 && currentPage > 5) || (pageNum === currentPage + 4 && currentPage < totalPages - 4)) {
                            return (
                              <span key={`ellipsis-${pageNum}`} className="px-2 text-gray-400 shrink-0">
                                ...
                              </span>
                            )
                          }
                          return null
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className={cn(
                              "h-8 w-8 px-0 shrink-0",
                              currentPage === pageNum && "bg-blue-600 hover:bg-blue-700 text-white"
                            )}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="h-8 px-2 shrink-0"
                      title="다음 페이지"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="h-8 px-2 shrink-0"
                      title="마지막 페이지"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
            </>
          )}
        </Card>
      </div>
    </main>
  )
}

