import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// AI 카테고리 분류 함수
// 실제로는 OpenAI 또는 Gemini API를 호출하지만, 
// 지금은 규칙 기반으로 시작하고 나중에 AI API로 교체
async function classifyTransaction(text: string, amount: number): Promise<{
  category: string
  name: string
  confidence: number
  needsReview: boolean
}> {
  const lowerText = text.toLowerCase()
  
  // 카테고리 키워드 매핑
  const categoryKeywords: Record<string, string[]> = {
    "식비": ["스타벅스", "카페", "커피", "맥도날드", "롯데리아", "버거킹", "치킨", "피자", "배달", "배민", "요기요", "쿠팡이츠", "식당", "레스토랑", "한식", "중식", "일식", "양식"],
    "교통비": ["지하철", "버스", "택시", "카카오택시", "우버", "티머니", "교통카드", "주차", "주차장", "고속도로", "톨게이트"],
    "쇼핑": ["쿠팡", "11번가", "옥션", "지마켓", "인터파크", "아마존", "쇼핑", "마트", "이마트", "롯데마트", "홈플러스", "편의점", "gs25", "cu", "세븐일레븐"],
    "통신비": ["kt", "skt", "lg", "통신", "요금", "이동통신", "휴대폰"],
    "공과금": ["전기", "가스", "수도", "전기요금", "가스요금", "수도요금", "한전", "지역난방"],
    "보험": ["보험", "삼성화재", "현대해상", "db손해보험", "한화손해보험"],
    "의료": ["병원", "약국", "의원", "치과", "안과", "약", "진료"],
    "교육": ["학원", "교재", "책", "도서", "교육"],
    "유흥": ["술", "술집", "바", "클럽", "노래방", "pc방"],
    "급여": ["급여", "월급", "월급여", "급여이체"],
    "용돈": ["용돈", "이체"],
  }
  
  // 항목명 정규화 키워드
  const nameNormalization: Record<string, string> = {
    "스타벅스": "카페/음료",
    "맥도날드": "패스트푸드",
    "롯데리아": "패스트푸드",
    "버거킹": "패스트푸드",
    "쿠팡": "온라인쇼핑",
    "11번가": "온라인쇼핑",
    "지마켓": "온라인쇼핑",
    "이마트": "대형마트",
    "롯데마트": "대형마트",
    "홈플러스": "대형마트",
    "gs25": "편의점",
    "cu": "편의점",
    "세븐일레븐": "편의점",
  }
  
  let matchedCategory = "기타"
  let confidence = 0.5
  let needsReview = true
  
  // 카테고리 매칭
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        matchedCategory = category
        confidence = 0.8
        needsReview = false
        break
      }
    }
    if (matchedCategory !== "기타") break
  }
  
  // 항목명 정규화
  let normalizedName = text
  for (const [keyword, normalized] of Object.entries(nameNormalization)) {
    if (lowerText.includes(keyword.toLowerCase())) {
      normalizedName = normalized
      break
    }
  }
  
  // 금액 기반 힌트
  if (amount > 1000000 && matchedCategory === "기타") {
    // 100만원 이상이면 확인 필요
    needsReview = true
    confidence = 0.3
  }
  
  return {
    category: matchedCategory,
    name: normalizedName,
    confidence,
    needsReview,
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { text, amount } = body
    
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "거래 내역 텍스트가 필요합니다." },
        { status: 400 }
      )
    }
    
    const result = await classifyTransaction(text, amount || 0)
    
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("AI classification error:", error)
    return NextResponse.json(
      { error: error.message || "카테고리 분류 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

