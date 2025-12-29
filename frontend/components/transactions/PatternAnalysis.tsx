"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, TrendingUp, Calendar, Lightbulb, RefreshCw } from "lucide-react"
import { analyzeTransactions } from "@/lib/api"
import { cn } from "@/lib/utils"

interface PatternAnalysisProps {
  profileId: string
  period?: '1month' | '3months' | '6months' | '1year'
  month?: string // YYYY-MM 형식
}

export default function PatternAnalysis({ profileId, period, month }: PatternAnalysisProps) {
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const getDateRange = () => {
    // 월별 선택인 경우
    if (month) {
      const [year, monthNum] = month.split("-").map(Number)
      const startDate = `${year}-${String(monthNum).padStart(2, "0")}-01`
      const lastDay = new Date(year, monthNum, 0).getDate()
      const endDate = `${year}-${String(monthNum).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
      return { startDate, endDate }
    }
    
    // 기간 선택인 경우
    if (period) {
      const endDate = new Date()
      const startDate = new Date()
      
      switch (period) {
        case '1month':
          startDate.setMonth(endDate.getMonth() - 1)
          break
        case '3months':
          startDate.setMonth(endDate.getMonth() - 3)
          break
        case '6months':
          startDate.setMonth(endDate.getMonth() - 6)
          break
        case '1year':
          startDate.setFullYear(endDate.getFullYear() - 1)
          break
      }
      
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      }
    }
    
    // 기본값: 최근 1개월
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(endDate.getMonth() - 1)
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    }
  }

  const getDisplayText = () => {
    if (month) {
      const [year, monthNum] = month.split("-")
      return `${year}년 ${parseInt(monthNum)}월`
    }
    if (period) {
      const periodMap = {
        '1month': '최근 1개월',
        '3months': '최근 3개월',
        '6months': '최근 6개월',
        '1year': '최근 1년'
      }
      return periodMap[period]
    }
    return '최근 1개월'
  }

  const loadAnalysis = async () => {
    setLoading(true)
    setError(null)
    try {
      const dateRange = getDateRange()
      const data = await analyzeTransactions(profileId, dateRange)
      setAnalysis(data)
    } catch (err: any) {
      setError(err.message || "분석 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 기간이나 월이 변경되면 분석 결과 초기화 (새로 분석해야 함)
    setAnalysis(null)
  }, [period, month])

  // 분석 결과가 없거나 로딩 중일 때도 카드 표시
  if (!analysis && !loading && !error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">패턴 분석</h3>
            </div>
            <Button onClick={loadAnalysis} disabled={loading} className="gap-2">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              분석하기
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center text-gray-400 py-8">
            거래 내역을 분석하여 소비 패턴과 정기지출을 확인할 수 있습니다.
            <br />
            <span className="text-sm">위의 "분석하기" 버튼을 클릭하세요.</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">패턴 분석</h3>
            </div>
            <Button onClick={loadAnalysis} disabled={loading} className="gap-2">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              분석 중...
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center text-gray-400">분석 중...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">패턴 분석</h3>
            </div>
            <Button onClick={loadAnalysis} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              다시 시도
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center text-red-500">{error}</div>
        </CardContent>
      </Card>
    )
  }

const dayNames = ['일', '월', '화', '수', '목', '금', '토']
const formatWon = (value: number) => `${Math.round(value).toLocaleString("ko-KR")}원`

  return (
    <div className="space-y-4">
      {/* 분석 헤더 */}
      <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">패턴 분석</h3>
              <span className="text-sm text-gray-500">
                ({getDisplayText()})
              </span>
            </div>
            <Button onClick={loadAnalysis} disabled={loading} variant="outline" className="gap-2">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              {loading ? "분석 중..." : "다시 분석"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* 인사이트 */}
      {analysis.insights && analysis.insights.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-900">가계 개선 제안</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {analysis.insights.map((insight: string, index: number) => (
              <div key={index} className="text-sm text-blue-800 bg-white p-3 rounded-lg border border-blue-200">
                {insight}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 정기지출 패턴 */}
      {analysis.recurringPatterns && analysis.recurringPatterns.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">정기지출 패턴</h3>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              자동으로 추출된 정기지출 패턴입니다. 정기지출 탭에 추가할 수 있습니다.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.recurringPatterns
              .sort((a: any, b: any) => b.confidence - a.confidence)
              .map((pattern: any, index: number) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 mb-1">{pattern.name}</div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="bg-gray-100 px-2 py-0.5 rounded">{pattern.category}</span>
                        <span>
                          {pattern.frequency === 'MONTHLY' ? '매월' :
                           pattern.frequency === 'WEEKLY' ? '매주' :
                           pattern.frequency === 'DAILY' ? '매일' : '불규칙'}
                        </span>
                        <span className="text-blue-600 font-medium">
                          신뢰도: {Math.round(pattern.confidence * 100)}%
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {pattern.dates.length}건 발견
                      </div>
                    </div>
                    <div className="font-bold text-lg text-red-600 ml-4">
                      {formatWon(pattern.amount)}
                    </div>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* 소비성향 분석 */}
      {analysis.spendingPatterns && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 카테고리별 지출 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">카테고리별 지출</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(analysis.spendingPatterns.categorySpending || {})
                .sort(([, a]: any, [, b]: any) => b - a)
                .slice(0, 5)
                .map(([category, total]: [string, any]) => {
                  const percent = (total / analysis.spendingPatterns.totalExpenses) * 100
                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{category}</span>
                        <span className="text-gray-600">
                          {formatWon(total)} ({Math.round(percent)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </CardContent>
          </Card>

          {/* 요일별 지출 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">요일별 지출</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {dayNames.map((day, index) => {
                const spending = analysis.spendingPatterns.dayOfWeekSpending?.[index] || 0
                const avg = analysis.spendingPatterns.dayOfWeekAvg?.[index] || 0
                const isTopDay = analysis.spendingPatterns.topDay?.name === day
                
                return (
                  <div
                    key={day}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg",
                      isTopDay && "bg-blue-50 border border-blue-200"
                    )}
                  >
                    <span className={cn("text-sm font-medium", isTopDay && "text-blue-700")}>
                      {day}요일
                    </span>
                    <div className="text-right">
                      <div className={cn("text-sm font-bold", isTopDay && "text-blue-700")}>
                        {formatWon(spending)}
                      </div>
                      {avg > 0 && (
                        <div className="text-xs text-gray-500">
                          평균 {formatWon(Math.round(avg))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 통계 요약 */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">통계 요약</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">총 거래 건수</div>
              <div className="text-2xl font-bold text-gray-900">
                {analysis.totalTransactions || 0}건
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">총 지출</div>
              <div className="text-2xl font-bold text-red-600">
                {formatWon(analysis.spendingPatterns?.totalExpenses || 0)}
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">정기지출 패턴</div>
              <div className="text-2xl font-bold text-blue-600">
                {analysis.recurringPatterns?.length || 0}개
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">평균 지출</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatWon(
                  analysis.spendingPatterns?.totalExpenses && analysis.spendingPatterns?.totalCount
                    ? Math.round(analysis.spendingPatterns.totalExpenses / analysis.spendingPatterns.totalCount)
                    : 0
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

