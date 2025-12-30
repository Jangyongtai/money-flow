/**
 * 한국 공휴일 정보
 * 고정 공휴일과 음력 기반 공휴일(설날, 추석, 부처님오신날) 데이터
 */

import fs from "fs/promises"
import path from "path"

export type Holiday = {
  date: string // YYYY-MM-DD 형식
  name: string // 공휴일 이름
  isLunar: boolean // 음력 기반 여부
}

const DATA_DIR = path.join(process.cwd(), "data")
const CACHE_PREFIX = "holidays"

function getCacheFile(year: number) {
  return path.join(DATA_DIR, `${CACHE_PREFIX}-${year}.json`)
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

async function readCache(year: number): Promise<Holiday[] | null> {
  try {
    const file = getCacheFile(year)
    const raw = await fs.readFile(file, "utf-8")
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function writeCache(year: number, holidays: Holiday[]) {
  await ensureDir()
  const file = getCacheFile(year)
  await fs.writeFile(file, JSON.stringify(holidays, null, 2), "utf-8")
}

// 고정 공휴일 (매년 동일)
const FIXED_HOLIDAYS: Array<{ month: number; day: number; name: string }> = [
  { month: 1, day: 1, name: "신정" },
  { month: 3, day: 1, name: "삼일절" },
  { month: 5, day: 5, name: "어린이날" },
  { month: 6, day: 6, name: "현충일" },
  { month: 8, day: 15, name: "광복절" },
  { month: 10, day: 3, name: "개천절" },
  { month: 10, day: 9, name: "한글날" },
  { month: 12, day: 25, name: "크리스마스" },
]

// 음력 기반 공휴일 (매년 달라짐) - 2024-2026년 데이터
// 형식: { year: number, month: number, day: number, name: string, duration?: number }
const LUNAR_HOLIDAYS: Array<{
  year: number
  month: number
  day: number
  name: string
  duration?: number // 연휴 기간 (일수)
}> = [
    // 2024년
    { year: 2024, month: 2, day: 9, name: "설날", duration: 3 }, // 2/9-11
    { year: 2024, month: 5, day: 15, name: "부처님오신날" },
    { year: 2024, month: 9, day: 16, name: "추석", duration: 3 }, // 9/16-18

    // 2025년
    { year: 2025, month: 1, day: 28, name: "설날", duration: 3 }, // 1/28-30
    { year: 2025, month: 5, day: 5, name: "부처님오신날" },
    { year: 2025, month: 10, day: 5, name: "추석", duration: 3 }, // 10/5-7

    // 2026년
    { year: 2026, month: 2, day: 16, name: "설날", duration: 3 }, // 2/16-18
    { year: 2026, month: 5, day: 24, name: "부처님오신날" },
    { year: 2026, month: 9, day: 25, name: "추석", duration: 3 }, // 9/25-27
  ]

/**
 * 특정 연도의 고정 공휴일 목록 반환
 */
function getFixedHolidays(year: number): Holiday[] {
  return FIXED_HOLIDAYS.map((holiday) => ({
    date: `${year}-${String(holiday.month).padStart(2, "0")}-${String(holiday.day).padStart(2, "0")}`,
    name: holiday.name,
    isLunar: false,
  }))
}

/**
 * 특정 연도의 음력 기반 공휴일 목록 반환
 */
function getLunarHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = []

  for (const holiday of LUNAR_HOLIDAYS) {
    if (holiday.year === year) {
      const duration = holiday.duration || 1
      for (let i = 0; i < duration; i++) {
        // Date 객체를 사용하여 월이 넘어가는 경우 자동 처리
        const date = new Date(year, holiday.month - 1, holiday.day + i)
        const dateMonth = date.getMonth() + 1
        const dateDay = date.getDate()
        const dateStr = `${year}-${String(dateMonth).padStart(2, "0")}-${String(dateDay).padStart(2, "0")}`

        holidays.push({
          date: dateStr,
          name: i === 0 ? holiday.name : `${holiday.name} 연휴`,
          isLunar: true,
        })
      }
    }
  }

  return holidays
}

/**
 * 특정 연도의 모든 공휴일 목록 반환
 */
export function getHolidays(year: number): Holiday[] {
  const fixed = getFixedHolidays(year)
  const lunar = getLunarHolidays(year)
  return [...fixed, ...lunar].sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * 특정 날짜가 공휴일인지 확인
 */
export function isHoliday(date: Date): boolean {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`

  const holidays = getHolidays(year)
  return holidays.some((h) => h.date === dateStr)
}

/**
 * 특정 날짜의 공휴일 정보 반환
 */
export function getHolidayInfo(date: Date): Holiday | null {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`

  const holidays = getHolidays(year)
  return holidays.find((h) => h.date === dateStr) || null
}

/**
 * 특정 월의 모든 공휴일 목록 반환
 */
export function getHolidaysForMonth(year: number, month: number): Holiday[] {
  const holidays = getHolidays(year)
  return holidays.filter((h) => {
    const [y, m] = h.date.split("-").map(Number)
    return y === year && m === month
  })
}

// ============ data.go.kr API 기반 동적 로딩 + 캐시 ============

const GOOGLE_KR_HOLIDAY_ICS =
  "https://calendar.google.com/calendar/ical/ko.south_korea%23holiday%40group.v.calendar.google.com/public/basic.ics"

function parseIcsDate(value: string): string | null {
  // 기대 형식: YYYYMMDD 혹은 YYYYMMDD'T'HHMMSS'Z'
  const m = value.match(/^(\d{4})(\d{2})(\d{2})/)
  if (!m) return null
  return `${m[1]}-${m[2]}-${m[3]}`
}

async function fetchHolidaysFromIcs(year: number): Promise<Holiday[]> {
  const res = await fetch(GOOGLE_KR_HOLIDAY_ICS)
  if (!res.ok) throw new Error(`ICS fetch 실패 (${res.status})`)
  const text = await res.text()

  const events = text.split("BEGIN:VEVENT").slice(1)
  const list: Holiday[] = []

  for (const block of events) {
    const dtStartMatch = block.match(/DTSTART;[^:]*:([0-9T]+)/)
    const summaryMatch = block.match(/SUMMARY:(.+)/)
    if (!dtStartMatch || !summaryMatch) continue

    const dateStr = parseIcsDate(dtStartMatch[1])
    if (!dateStr) continue

    const name = summaryMatch[1].trim()
    const y = Number(dateStr.slice(0, 4))
    if (y !== year) continue

    list.push({ date: dateStr, name, isLunar: false })
  }

  const unique = Array.from(new Map(list.map((h) => [h.date + h.name, h])).values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  )
  return unique
}

async function fetchHolidaysFromApi(year: number): Promise<Holiday[]> {
  const rawKey =
    process.env.HOLIDAY_API_KEY ||
    process.env.NEXT_PUBLIC_HOLIDAY_API_KEY

  if (!rawKey) {
    throw new Error("HOLIDAY_API_KEY가 설정되어 있지 않습니다.")
  }

  const encodedKey = rawKey.includes("%") ? rawKey : encodeURIComponent(rawKey)
  // 다양한 조합 시도: 원문/인코딩 + 대소문자 파라미터
  const tryKeys: Array<{ key: string; param: "ServiceKey" | "serviceKey" }> = [
    { key: rawKey, param: "ServiceKey" },
    { key: rawKey, param: "serviceKey" },
    { key: encodedKey, param: "ServiceKey" },
    { key: encodedKey, param: "serviceKey" },
  ]

  // 주요 엔드포인트 후보 (공휴일: getRestDeInfo / getHoliDeInfo)
  const endpoints = ["getRestDeInfo", "getHoliDeInfo"]
  const schemes = ["https", "http"]

  let lastError: any = null

  for (const tk of tryKeys) {
    try {
      const all: Holiday[] = []

      for (let month = 1; month <= 12; month++) {
        let success = false
        for (const ep of endpoints) {
          for (const scheme of schemes) {
            const url = `${scheme}://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/${ep}?${tk.param}=${tk.key}&_type=json&numOfRows=100&pageNo=1&solYear=${year}&solMonth=${String(month).padStart(2, "0")}`
            const res = await fetch(url)
            if (!res.ok) {
              lastError = new Error(`공휴일 API 호출 실패 (${res.status}) ${await res.text().catch(() => "")}`)
              continue
            }
            const data = await res.json() as any
            const items = data?.response?.body?.items?.item
            if (!items) continue
            const list = Array.isArray(items) ? items : [items]
            for (const item of list) {
              const locdate = String(item.locdate || "")
              if (locdate.length !== 8) continue
              const date = `${locdate.slice(0, 4)}-${locdate.slice(4, 6)}-${locdate.slice(6, 8)}`
              all.push({
                date,
                name: item.dateName || "공휴일",
                isLunar: false,
              })
            }
            success = true
            break
          }
          if (success) break
        }
      }

      const unique = Array.from(new Map(all.map((h) => [h.date, h])).values()).sort((a, b) => a.date.localeCompare(b.date))
      return unique
    } catch (err) {
      lastError = err
      continue
    }
  }

  throw lastError || new Error("공휴일 API 호출 실패")
}

export async function getHolidaysDynamic(year: number): Promise<Holiday[]> {
  // 외부 API 호출을 생략하고 미리 정의된 하드코딩 데이터만 사용합니다.
  // 이로써 HOLIDAY_API_KEY를 설정할 필요가 없어집니다.
  return getHolidays(year)
}

