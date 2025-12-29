import { NextResponse } from "next/server"
import { load, save } from "@/lib/state"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * 중복된 expenses 정리 (같은 ID를 가진 항목 중 하나만 유지)
 */
export async function POST(req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    const { profileId } = await params
    const state = await load()
    
    // expenses 배열에서 중복 제거 (같은 ID를 가진 항목 중 가장 최근 것만 유지)
    const seenIds = new Set<string>()
    const uniqueExpenses: any[] = []
    
    // 역순으로 순회하여 같은 ID가 있으면 나중 것(더 최근 것)을 우선 유지
    for (let i = state.expenses.length - 1; i >= 0; i--) {
      const expense = state.expenses[i]
      if (!seenIds.has(expense.id)) {
        seenIds.add(expense.id)
        uniqueExpenses.unshift(expense) // 앞에 추가하여 원래 순서 유지
      }
    }
    
    const beforeCount = state.expenses.length
    const afterCount = uniqueExpenses.length
    const removedCount = beforeCount - afterCount
    
    state.expenses = uniqueExpenses
    await save(state)
    
    return NextResponse.json({
      success: true,
      message: `중복 항목 ${removedCount}개가 제거되었습니다.`,
      beforeCount,
      afterCount,
      removedCount,
    })
  } catch (error: any) {
    console.error("Cleanup expenses error:", error)
    return NextResponse.json(
      { error: error.message || "중복 정리 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

