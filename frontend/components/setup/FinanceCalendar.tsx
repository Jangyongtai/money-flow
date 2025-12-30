"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getHolidays } from "@/lib/api"

type EventItem = {
  day: number | null
  title: string
  amount: number
  direction: "IN" | "OUT"
  meta?: string
}

type FinanceCalendarProps = {
  events: EventItem[]
  currentMonth?: number
  currentYear?: number
}

export default function FinanceCalendar({
  events,
  currentMonth: initialMonth,
  currentYear: initialYear
}: FinanceCalendarProps) {
  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(initialMonth ?? now.getMonth() + 1)
  const [currentYear, setCurrentYear] = useState(initialYear ?? now.getFullYear())
  const [holidays, setHolidays] = useState<Map<string, string>>(new Map()) // date -> holiday name
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  const [isMobile, setIsMobile] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [showToast, setShowToast] = useState(false)
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 공휴일 정보 로드
  useEffect(() => {
    const loadHolidays = async () => {
      try {
        const data = await getHolidays(currentYear, currentMonth)
        const holidayMap = new Map<string, string>()
        data.holidays.forEach((h: { date: string; name: string }) => {
          holidayMap.set(h.date, h.name)
        })
        setHolidays(holidayMap)
      } catch (error) {
        console.error("공휴일 정보 로드 실패:", error)
      }
    }
    loadHolidays()
  }, [currentYear, currentMonth])

  // 모바일 판별 (이벤트 표시/토스트 분기)
  useEffect(() => {
    const check = () => {
      if (typeof window === "undefined") return
      setIsMobile(window.matchMedia("(max-width: 767px)").matches)
    }
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // 토스트 헬퍼
  const pushToast = (text: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
    }
    setToastMessage(text)
    setShowToast(true)
    const timer = setTimeout(() => setShowToast(false), 2000)
    toastTimerRef.current = timer
  }

  // 해당 월의 첫 번째 날과 마지막 날 계산
  const firstDay = new Date(currentYear, currentMonth - 1, 1)
  const lastDay = new Date(currentYear, currentMonth, 0)
  const prevLastDay = new Date(currentYear, currentMonth - 1, 0)
  const daysInMonth = lastDay.getDate()
  const startDayOfWeek = firstDay.getDay() // 0 (일요일) ~ 6 (토요일)
  const prevMonthDays = prevLastDay.getDate()

  // 이전 달로 이동
  const goToPreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  // 다음 달로 이동
  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  // 해당 날짜의 이벤트 가져오기
  const getEventsForDay = (day: number): EventItem[] => {
    return events.filter(ev => ev.day === day)
  }

  // 달력 그리드 생성
  const calendarDays = useMemo(() => {
    const days: Array<{ day: number; inCurrent: boolean }> = []

    // 앞쪽: 이전 달 날짜 채우기
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, inCurrent: false })
    }

    // 현재 달
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ day, inCurrent: true })
    }

    // 뒤쪽: 다음 달 날짜로 채워 마지막 주만 완성
    let nextDay = 1
    while (days.length % 7 !== 0) {
      days.push({ day: nextDay++, inCurrent: false })
    }

    return days
  }, [startDayOfWeek, daysInMonth, prevMonthDays])

  const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"]
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"]

  return (
    <>
      <div className="space-y-4 w-full">
        <div className="overflow-x-auto">
          <div className="w-full min-w-0 space-y-3 -mx-1 sm:-mx-1 px-1 sm:px-1">
            {/* 달력 헤더 */}
            <div className="flex items-center justify-between px-2">
              <Button
                variant="outline"
                size="icon"
                onClick={goToPreviousMonth}
                className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="font-semibold text-lg md:text-xl">
                {currentYear}년 {monthNames[currentMonth - 1]}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={goToNextMonth}
                className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* 달력 그리드 */}
            <div className="border rounded-lg overflow-hidden bg-white">
              {/* 요일 헤더 */}
              <div className="grid grid-cols-7 border-b bg-gray-50">
                {dayNames.map((day, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "p-1.5 md:p-3 text-center text-[11px] md:text-sm font-semibold",
                      idx === 0 && "text-red-500", // 일요일
                      idx === 6 && "text-blue-500" // 토요일
                    )}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* 날짜 셀 */}
              <div className="grid grid-cols-7">
                {calendarDays.map((dayObj, idx) => {
                  const { day, inCurrent } = dayObj

                  const dayEvents = inCurrent ? getEventsForDay(day) : []
                  const hasEvents = dayEvents.length > 0

                  // 공휴일 확인
                  const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                  const holidayName = inCurrent ? holidays.get(dateStr) : undefined
                  const isHoliday = !!holidayName
                  const isSunday = idx % 7 === 0
                  const isSaturday = idx % 7 === 6
                  const isToday = inCurrent && dateStr === todayStr

                  const handleDayTap = () => {
                    if (!hasEvents || !inCurrent) return
                    const lines = dayEvents.map((ev) => {
                      const sign = ev.direction === "IN" ? "+" : "-"
                      const title = ev.title || (ev.direction === "IN" ? "수입" : "지출")
                      // OTHER는 표시하지 않고, 그 외 카테고리는 한글로 변환하여 표시 (혹은 아예 제거)
                      return `${sign}${ev.amount} · ${title}`
                    })
                    pushToast(`[${currentMonth}월 ${day}일]` + "\n" + lines.join("\n"))
                  }

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "h-18 md:h-28 border border-gray-200 p-1 md:p-2 text-[9px] md:text-sm relative",
                        isSunday && "bg-red-50 border-red-200", // 일요일 배경
                        isSaturday && "bg-blue-50 border-blue-200", // 토요일 배경
                        isHoliday && "bg-red-100 border-red-300",
                        isToday && "ring-2 ring-blue-400 ring-offset-0",
                        isMobile && hasEvents && inCurrent && "cursor-pointer"
                      )}
                      onClick={handleDayTap}
                      role={isMobile && hasEvents && inCurrent ? "button" : undefined}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <div
                          className={cn(
                            "font-semibold",
                            !inCurrent
                              ? "text-gray-400"
                              : isHoliday
                                ? "text-red-700 font-bold"
                                : isSunday
                                  ? "text-red-600"
                                  : isSaturday
                                    ? "text-blue-600"
                                    : "text-gray-700"
                          )}
                        >
                          {day}
                        </div>
                        {isHoliday && (
                          <div
                            className="text-[11px] leading-tight text-red-600 font-semibold truncate text-right max-w-[70px]"
                            title={holidayName}
                          >
                            {holidayName}
                          </div>
                        )}
                      </div>
                      {hasEvents && (
                        <div className="space-y-0.5 mt-2">
                          {dayEvents.slice(0, 3).map((ev, idx2) => {
                            const isIn = ev.direction === "IN"
                            const colorClass = isIn ? "text-blue-600" : "text-green-600"
                            const displayAmount = isIn ? `+${ev.amount}` : `-${ev.amount}`
                            return (
                              <div
                                key={idx2}
                                className={cn(
                                  "flex items-center gap-1 text-[10px] md:text-[12px] font-semibold leading-tight whitespace-normal break-words",
                                  colorClass
                                )}
                                title={ev.title || (isIn ? "수입" : "지출")}
                              >
                                <span className="whitespace-normal break-words font-bold">
                                  {displayAmount}
                                </span>
                              </div>
                            )
                          })}
                          {dayEvents.length > 3 && (
                            <div className="text-[10px] text-gray-500">+{dayEvents.length - 3}</div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 범례 */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-50 border border-red-300" />
            <span>공휴일</span>
          </div>
          <div className="flex items-center gap-1">
            <ArrowUpCircle className="h-3 w-3 text-blue-600" />
            <span>수입</span>
          </div>
          <div className="flex items-center gap-1">
            <ArrowDownCircle className="h-3 w-3 text-green-600" />
            <span>지출</span>
          </div>
        </div>
      </div>

      {showToast && (
        <div
          className="fixed left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 z-50 bg-black text-white text-sm px-4 py-2 rounded-lg shadow-lg whitespace-pre-line"
          style={{ width: "150%", maxWidth: "90vw" }}
        >
          {toastMessage}
        </div>
      )}
    </>
  )
}
