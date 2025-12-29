import { NextResponse } from "next/server"
import { getHolidays, getHolidaysDynamic, getHolidaysForMonth } from "@/lib/holidays"

export const runtime = "nodejs"

/**
 * GET /api/holidays?year=2024&month=3
 * 특정 연도/월의 공휴일 목록 반환
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const yearParam = searchParams.get("year")
    const monthParam = searchParams.get("month")

    const now = new Date()
    const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear()
    const month = monthParam ? parseInt(monthParam, 10) : null

    if (month !== null) {
      // 특정 월의 공휴일만 반환 (API 캐시 우선)
      const holidays = await getHolidaysDynamic(year)
      const filtered = holidays.filter((h) => h.date.startsWith(`${year}-${String(month).padStart(2, "0")}`))
      return NextResponse.json({ holidays: filtered, year, month })
    } else {
      // 전체 연도의 공휴일 반환 (API 캐시 우선)
      const holidays = await getHolidaysDynamic(year)
      return NextResponse.json({ holidays, year })
    }
  } catch (error: any) {
    console.error("Get holidays error:", error)
    return NextResponse.json(
      { error: error.message || "공휴일 조회 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

