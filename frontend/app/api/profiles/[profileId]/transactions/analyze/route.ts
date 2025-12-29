import { NextResponse } from "next/server"
import { getTransactions } from "@/lib/state"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// 정기지출 패턴 추출
function extractRecurringPatterns(transactions: any[]) {
  const patterns: Map<string, {
    name: string
    category: string
    amount: number
    dates: string[]
    frequency: 'MONTHLY' | 'WEEKLY' | 'DAILY' | 'IRREGULAR'
    confidence: number
  }> = new Map()

  // 카테고리 + 항목명 + 금액별로 그룹화
  const grouped = new Map<string, any[]>()

  for (const txn of transactions) {
    if (txn.type !== 'EXPENSE') continue

    const key = `${txn.category || '기타'}|${txn.name}|${txn.amount}`
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(txn)
  }

  // 각 그룹에서 패턴 분석
  for (const [key, txns] of grouped.entries()) {
    if (txns.length < 2) continue // 최소 2건 이상이어야 패턴으로 인정

    const [category, name, amountStr] = key.split('|')
    const amount = parseFloat(amountStr)
    const dates = txns.map(t => t.date).sort()

    // 날짜 간격 분석
    const intervals: number[] = []
    for (let i = 1; i < dates.length; i++) {
      const diff = new Date(dates[i]).getTime() - new Date(dates[i - 1]).getTime()
      const days = diff / (1000 * 60 * 60 * 24)
      intervals.push(days)
    }

    // 평균 간격 계산
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length

    // 패턴 분류
    let frequency: 'MONTHLY' | 'WEEKLY' | 'DAILY' | 'IRREGULAR' = 'IRREGULAR'
    let confidence = 0

    if (avgInterval >= 28 && avgInterval <= 31) {
      frequency = 'MONTHLY'
      confidence = 0.8
    } else if (avgInterval >= 6 && avgInterval <= 8) {
      frequency = 'WEEKLY'
      confidence = 0.7
    } else if (avgInterval >= 0.9 && avgInterval <= 1.1) {
      frequency = 'DAILY'
      confidence = 0.6
    } else if (avgInterval >= 25 && avgInterval <= 35) {
      frequency = 'MONTHLY'
      confidence = 0.6 // 약간 불규칙한 월간 패턴
    }

    // 간격의 일관성 체크 (표준편차가 작을수록 신뢰도 높음)
    const variance = intervals.reduce((sum, interval) => {
      return sum + Math.pow(interval - avgInterval, 2)
    }, 0) / intervals.length
    const stdDev = Math.sqrt(variance)

    if (stdDev < 2) {
      confidence = Math.min(confidence + 0.1, 0.9)
    }

    // 최소 신뢰도 0.5 이상만 패턴으로 인정
    if (confidence >= 0.5) {
      patterns.set(key, {
        name,
        category,
        amount,
        dates,
        frequency,
        confidence,
      })
    }
  }

  return Array.from(patterns.values())
}

// 소비성향 분석
function analyzeSpendingPatterns(transactions: any[]) {
  const expenses = transactions.filter(t => t.type === 'EXPENSE')

  // 카테고리별 지출
  const categorySpending: Record<string, number> = {}
  const categoryCount: Record<string, number> = {}

  // 요일별 지출
  const dayOfWeekSpending: Record<number, number> = {}
  const dayOfWeekCount: Record<number, number> = {}

  // 월별 지출
  const monthlySpending: Record<string, number> = {}

  for (const txn of expenses) {
    const category = txn.category || '기타'
    categorySpending[category] = (categorySpending[category] || 0) + txn.amount
    categoryCount[category] = (categoryCount[category] || 0) + 1

    const date = new Date(txn.date)
    const dayOfWeek = date.getDay() // 0=일요일, 6=토요일
    dayOfWeekSpending[dayOfWeek] = (dayOfWeekSpending[dayOfWeek] || 0) + txn.amount
    dayOfWeekCount[dayOfWeek] = (dayOfWeekCount[dayOfWeek] || 0) + 1

    const monthKey = txn.date.substring(0, 7) // YYYY-MM
    monthlySpending[monthKey] = (monthlySpending[monthKey] || 0) + txn.amount
  }

  // 카테고리별 평균
  const categoryAvg: Record<string, number> = {}
  for (const [category, total] of Object.entries(categorySpending)) {
    categoryAvg[category] = total / categoryCount[category]
  }

  // 요일별 평균
  const dayOfWeekAvg: Record<number, number> = {}
  for (const [day, total] of Object.entries(dayOfWeekSpending)) {
    dayOfWeekAvg[parseInt(day)] = total / dayOfWeekCount[parseInt(day)]
  }

  // 가장 많이 지출한 카테고리
  const topCategory = Object.entries(categorySpending)
    .sort(([, a], [, b]) => b - a)[0]

  // 가장 많이 지출한 요일
  const topDay = Object.entries(dayOfWeekSpending)
    .sort(([, a], [, b]) => b - a)[0]

  const dayNames = ['일', '월', '화', '수', '목', '금', '토']

  return {
    categorySpending,
    categoryAvg,
    dayOfWeekSpending,
    dayOfWeekAvg,
    monthlySpending,
    topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null,
    topDay: topDay ? { name: dayNames[parseInt(topDay[0])], amount: topDay[1] } : null,
    totalExpenses: expenses.reduce((sum, t) => sum + t.amount, 0),
    totalCount: expenses.length,
  }
}

// 가계 개선 제안
function formatWon(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`
}

function generateInsights(spendingPatterns: any, recurringPatterns: any[]) {
  const insights: string[] = []

  // 카테고리별 지출 분석
  if (spendingPatterns.topCategory) {
    const topCategoryPercent = (spendingPatterns.topCategory.amount / spendingPatterns.totalExpenses) * 100
    if (topCategoryPercent > 40) {
      insights.push(`💡 ${spendingPatterns.topCategory.name} 카테고리가 전체 지출의 ${Math.round(topCategoryPercent)}%를 차지합니다. 이 부분을 줄이면 큰 효과를 볼 수 있습니다.`)
    }
  }

  // 정기지출 분석
  const totalRecurring = recurringPatterns.reduce((sum, p) => sum + p.amount, 0)
  if (totalRecurring > 0) {
    const recurringPercent = (totalRecurring / spendingPatterns.totalExpenses) * 100
    insights.push(`📅 정기지출이 월 ${formatWon(totalRecurring)}으로 전체의 ${Math.round(recurringPercent)}%를 차지합니다.`)

    // 가장 큰 정기지출
    const topRecurring = recurringPatterns.sort((a, b) => b.amount - a.amount)[0]
    if (topRecurring) {
      insights.push(`🔔 가장 큰 정기지출: ${topRecurring.name} (${formatWon(topRecurring.amount)}, ${topRecurring.frequency === 'MONTHLY' ? '매월' : topRecurring.frequency === 'WEEKLY' ? '매주' : '매일'})`)
    }
  }

  // 요일별 패턴
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  if (spendingPatterns.topDay) {
    const dayIndex = dayNames.indexOf(spendingPatterns.topDay.name)
    insights.push(`📆 ${spendingPatterns.topDay.name}요일에 가장 많이 지출합니다. (평균 ${formatWon(spendingPatterns.dayOfWeekAvg[dayIndex] || 0)})`)
  }

  // 월별 추이
  const monthlyKeys = Object.keys(spendingPatterns.monthlySpending).sort()
  if (monthlyKeys.length >= 2) {
    const recent = spendingPatterns.monthlySpending[monthlyKeys[monthlyKeys.length - 1]]
    const previous = spendingPatterns.monthlySpending[monthlyKeys[monthlyKeys.length - 2]]
    const change = ((recent - previous) / previous) * 100

    if (change > 10) {
      insights.push(`⚠️ 최근 지출이 ${Math.round(change)}% 증가했습니다. 지출 패턴을 확인해보세요.`)
    } else if (change < -10) {
      insights.push(`✅ 최근 지출이 ${Math.round(Math.abs(change))}% 감소했습니다. 좋은 추세입니다!`)
    }
  }

  return insights
}

export async function GET(req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    const { profileId } = await params
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // 최근 6개월 데이터 분석 (기간이 지정되지 않은 경우)
    let transactions = await getTransactions(profileId, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })

    if (!startDate || !endDate) {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const start = sixMonthsAgo.toISOString().split('T')[0]
      const end = new Date().toISOString().split('T')[0]

      transactions = await getTransactions(profileId, {
        startDate: start,
        endDate: end,
      })
    }

    // 정기지출 패턴 추출
    const recurringPatterns = extractRecurringPatterns(transactions)

    // 소비성향 분석
    const spendingPatterns = analyzeSpendingPatterns(transactions)

    // 가계 개선 제안
    const insights = generateInsights(spendingPatterns, recurringPatterns)

    return NextResponse.json({
      recurringPatterns,
      spendingPatterns,
      insights,
      totalTransactions: transactions.length,
    })
  } catch (error: any) {
    console.error("Analysis error:", error)
    return NextResponse.json(
      { error: error.message || "패턴 분석 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

