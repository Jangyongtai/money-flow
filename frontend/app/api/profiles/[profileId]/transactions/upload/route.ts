import { NextResponse } from "next/server"
import { saveTransactions } from "@/lib/state"
import { randomUUID } from "crypto"
import * as XLSX from "xlsx"

// AI 분류 결과 타입
interface AIClassificationResult {
  category: string
  name: string
  confidence: number
  needsReview: boolean
  reason?: string // 분류 근거 (어떤 키워드나 규칙으로 분류되었는지)
}

// 소스 메타데이터 타입
interface SourceMetadata {
  cardName?: string
  cardNumber?: string
  accountNumber?: string
}

// 카테고리 분류 (규칙 기반 - 한국 주요 은행/카드사 거래명 패턴 포함)
// transactionNameMappings: 저장된 거래명-카테고리 매핑 (같은 거래명 자동 분류용)
async function classifyWithAI(text: string, amount: number, transactionNameMappings?: Record<string, string>): Promise<AIClassificationResult> {
  const lowerText = text.toLowerCase()
  const normalizedKey = text.trim().toLowerCase()
  
  // 1순위: 개인 매핑 확인 (사용자가 이전에 수정한 카테고리)
  if (transactionNameMappings && transactionNameMappings[normalizedKey]) {
    const savedCategory = transactionNameMappings[normalizedKey]
    console.log(`[분류] 개인 매핑 사용: "${text}" -> "${savedCategory}"`)
    return {
      category: savedCategory,
      name: text,
      confidence: 0.95, // 저장된 매핑은 높은 신뢰도
      needsReview: false, // 저장된 매핑은 확인 불필요
      reason: `사용자가 이전에 설정한 카테고리 (${savedCategory})`,
    }
  }
  
  // 2순위: 규칙 기반 키워드 매칭 (카테고리별 키워드 리스트)
  const categoryKeywords: Record<string, string[]> = {
    "식비": [
      // 카페/음료
      "스타벅스", "투썸", "이디야", "카페베네", "할리스", "탐앤탐스", "카페", "커피", "음료", "라떼", "아메리카노",
      // 패스트푸드
      "맥도날드", "롯데리아", "버거킹", "맘스터치", "kfc", "서브웨이", "도미노", "피자헛", "피자알볼로",
      // 치킨/피자
      "치킨", "교촌", "bbq", "bhc", "네네", "처갓집", "피자", "피자나라", "피자스쿨",
      // 배달앱
      "배달", "배민", "배달의민족", "요기요", "쿠팡이츠", "우아한형제들", "배달통",
      // 식당/레스토랑
      "식당", "레스토랑", "한식", "중식", "일식", "양식", "돈까스", "냉면", "국수", "국수면", "라면", "우동", "김밥", "분식",
      "삼겹살", "갈비", "족발", "보쌈", "족발보쌈", "생선회", "회식", "회집", "횟집", "초밥", "찜", "탕", "찌개",
      // 편의점 식품
      "편의점", "gs25", "cu", "세븐일레븐", "이마트24", "미니스톱"
    ],
    "교통비": [
      "지하철", "버스", "택시", "카카오택시", "우버", "티머니", "교통카드", "선불카드",
      "주차", "주차장", "주차요금", "고속도로", "톨게이트", "하이패스", "하이웨이",
      "ktx", "srt", "기차", "철도", "항공", "비행기", "렌터카", "카셰어링", "쏘카", "그린카"
    ],
    "주유비": [
      "주유소", "gs칼텍스", "sk에너지", "s-oil", "현대오일뱅크", "주유", "휘발유", "경유", "lpg", "lng",
      "셀프주유소", "주유비", "연료", "가스충전", "cng"
    ],
    "쇼핑": [
      // 온라인쇼핑
      "쿠팡", "11번가", "옥션", "지마켓", "인터파크", "아마존", "네이버쇼핑", "티몬", "위메프",
      "당근마켓", "번개장터", "중고나라", "중고거래",
      // 대형마트
      "이마트", "롯데마트", "홈플러스", "코스트코", "트레이더스", "마트", "할인마트",
      // 백화점/쇼핑몰
      "백화점", "롯데백화점", "신세계", "현대백화점", "갤러리아", "하이마트", "전자랜드",
      // 온라인마켓
      "옥션", "g마켓", "11번가", "인터파크", "티몬", "위메프",
      // 잡화점/100원샵
      "다이소", "아성다이소", "잡화점", "100원", "백원샵", "원샵", "원스토어",
      // 의류/패션
      "의류", "의상", "패션", "신발", "가방", "시계", "액세서리", "옷가게", "의류매장",
      // 생활용품
      "생활용품", "화장품", "세제", "샴푸", "비누"
    ],
    "통신비": [
      "kt", "skt", "lg", "lg유플러스", "통신", "요금", "이동통신", "휴대폰", "스마트폰",
      "통신요금", "통신비", "요금제", "데이터", "인터넷", "와이파이", "wifi",
      "네이버", "카카오", "구글", "애플", "아이폰", "갤럭시"
    ],
    "공과금": [
      "전기", "가스", "수도", "전기요금", "가스요금", "수도요금", "한전", "한국전력",
      "지역난방", "난방", "관리비", "아파트관리비", "월세", "전세", "보증금",
      "tv수신료", "방송수신료", "케이블", "iptv"
    ],
    "보험": [
      "보험", "삼성화재", "현대해상", "db손해보험", "한화손해보험", "롯데손해보험",
      "생명보험", "손해보험", "건강보험", "의료보험", "자동차보험", "화재보험"
    ],
    "의료": [
      "병원", "약국", "의원", "치과", "안과", "처방약", "의약품", "진료", "검진", "건강검진",
      "치료", "수술", "입원", "외래", "응급실", "한의원", "한방", "물리치료"
    ],
    "교육": [
      "학원", "교재", "도서", "서적", "책방", "서점", "교육", "과외", "입시", "어학원", "영어학원",
      "수학학원", "과학학원", "예체능", "미술", "음악", "체육", "유치원", "어린이집",
      "대학교", "등록금", "수강료", "강의", "온라인강의", "인강"
    ],
    "유흥": [
      "술집", "주점", "바", "펜", "클럽", "노래방", "pc방", "오락실", "게임", "게임방",
      "영화", "영화관", "cgv", "롯데시네마", "메가박스", "콘서트", "공연", "뮤지컬"
    ],
    "급여": [
      "급여", "월급", "월급여", "급여이체", "월급이체", "월급여이체", "급여입금",
      "월급입금", "월급여입금", "월급여입금", "월급여입금"
    ],
    "용돈": [
      "용돈", "이체", "송금", "계좌이체", "입금", "출금", "이체수수료"
    ],
    "저축/투자": [
      "적금", "예금", "정기예금", "정기적금", "적립식", "펀드", "주식", "투자",
      "증권", "계좌", "입출금", "자동이체", "자동납입"
    ],
    "대출/이자": [
      "대출", "이자", "대출이자", "대출상환", "대출원금", "카드론", "신용대출",
      "담보대출", "주택대출", "전세자금", "자동차대출"
    ],
    "세금": [
      "세금", "소득세", "부가세", "종합소득세", "지방세", "자동차세", "재산세",
      "납세", "세무서", "국세청"
    ]
  }
  
  // 거래명 정규화 (은행/카드사별 표기 차이 통일)
  const nameNormalization: Record<string, string> = {
    // 카페
    "스타벅스": "카페/음료", "투썸": "카페/음료", "이디야": "카페/음료",
    "카페베네": "카페/음료", "할리스": "카페/음료",
    // 패스트푸드
    "맥도날드": "패스트푸드", "롯데리아": "패스트푸드", "버거킹": "패스트푸드",
    "맘스터치": "패스트푸드", "kfc": "패스트푸드",
    // 온라인쇼핑
    "쿠팡": "온라인쇼핑", "11번가": "온라인쇼핑", "지마켓": "온라인쇼핑",
    "g마켓": "온라인쇼핑", "옥션": "온라인쇼핑", "인터파크": "온라인쇼핑",
    "네이버쇼핑": "온라인쇼핑", "티몬": "온라인쇼핑", "위메프": "온라인쇼핑",
    // 대형마트
    "이마트": "대형마트", "롯데마트": "대형마트", "홈플러스": "대형마트",
    "코스트코": "대형마트", "트레이더스": "대형마트",
    // 편의점
    "gs25": "편의점", "cu": "편의점", "세븐일레븐": "편의점", "이마트24": "편의점",
    // 배달앱
    "배달의민족": "배달앱", "배민": "배달앱", "요기요": "배달앱", "쿠팡이츠": "배달앱",
    // 교통
    "카카오택시": "택시", "우버": "택시",
    "티머니": "교통카드", "선불카드": "교통카드",
    // 통신
    "kt": "통신비", "skt": "통신비", "lg": "통신비", "lg유플러스": "통신비",
    // 공과금
    "한국전력": "전기요금", "한전": "전기요금"
  }
  
  let matchedCategory = "기타"
  let confidence = 0.5
  let needsReview = true
  let matchedKeyword = ""
  let matchedCategoryName = ""
  
  // 카테고리 매칭 (우선순위: 더 구체적인 키워드부터)
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchedCategory = category
        matchedKeyword = keyword
        matchedCategoryName = category
        confidence = 0.8
        needsReview = false
        console.log(`[분류] 키워드 매칭: "${text}" -> "${category}" (키워드: "${keyword}")`)
        break
      }
    }
    if (matchedCategory !== "기타") break
  }
  
  // 3순위: 수동 키워드 매핑 확인 (텍스트에 키워드가 포함되어 있는지 확인, 모든 사용자 공유)
  // 예: "GS칼텍스 평내주유소"에서 "주유소" 키워드 찾기
  if (matchedCategory === "기타" || confidence < 0.7) {
    const { getAllKeywordCategoryMappings } = await import("@/lib/state")
    const keywordMappings = await getAllKeywordCategoryMappings()
    
    for (const [keyword, category] of Object.entries(keywordMappings)) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchedCategory = category
        confidence = 0.9 // 수동 키워드 매핑은 높은 신뢰도
        needsReview = false
        matchedKeyword = keyword
        matchedCategoryName = category
        console.log(`[분류] 키워드 매핑 사용: "${text}" (키워드: "${keyword}") -> "${category}"`)
        break
      }
    }
  }
  
  // 4순위: 전역 매핑 확인 (AI API로 분류된 결과, 모든 사용자 공유)
  // 규칙 기반 매칭이 실패한 경우에만 전역 매핑 확인
  if (matchedCategory === "기타" || confidence < 0.7) {
    const { getMerchantCategoryMapping } = await import("@/lib/state")
    const globalMapping = await getMerchantCategoryMapping(text)
    if (globalMapping) {
      console.log(`[분류] 전역 매핑 사용: "${text}" -> "${globalMapping}"`)
      matchedCategory = globalMapping
      confidence = 0.85
      needsReview = false
      matchedCategoryName = globalMapping
    }
  }
  
  // 5순위: 규칙 기반으로 분류되지 않았거나 신뢰도가 낮은 경우, AI API 사용
  let classificationReason = ""
  if (matchedCategory === "기타" || confidence < 0.7) {
    console.log(`[분류] 규칙 기반 매칭 실패 또는 신뢰도 낮음, AI API 호출: "${text}" (현재 카테고리: ${matchedCategory}, 신뢰도: ${confidence})`)
    const aiResult = await classifyWithAIApi(text)
    if (aiResult) {
      matchedCategory = aiResult.category
      confidence = aiResult.confidence
      needsReview = false // AI API 결과는 확인 불필요
      classificationReason = `AI API 분류 (${aiResult.category})`
      console.log(`[분류] AI API 결과: "${text}" -> "${aiResult.category}" (신뢰도: ${aiResult.confidence})`)
      
      // AI API 결과를 전역 DB에 저장 (모든 사용자 공유)
      try {
        const { saveMerchantCategoryMapping } = await import("@/lib/state")
        await saveMerchantCategoryMapping(text, aiResult.category)
        console.log(`[분류] 전역 DB에 저장: "${text}" -> "${aiResult.category}"`)
      } catch (error) {
        console.error(`[분류] 전역 DB 저장 실패:`, error)
      }
    } else {
      // AI API 호출 실패 시 기타로 분류하고 검토 필요로 표시
      matchedCategory = "기타"
      confidence = 0.3
      needsReview = true
      classificationReason = "규칙 기반 매칭 없음, AI API 호출 실패 또는 응답 없음 - 검토 필요"
      console.log(`[분류] AI API 호출 실패 또는 응답 없음: "${text}" -> "기타" (검토 필요)`)
    }
  } else {
    classificationReason = `키워드 매칭: "${matchedKeyword}" -> "${matchedCategoryName}"`
  }
  
  // 거래명 정규화 및 정리
  let normalizedName = text
  
  // 1. 키워드 기반 정규화
  for (const [keyword, normalized] of Object.entries(nameNormalization)) {
    if (lowerText.includes(keyword.toLowerCase())) {
      normalizedName = normalized
      break
    }
  }
  
  // 2. 불필요한 접두사/접미사 제거 (은행/카드사별 표기 차이 통일)
  if (normalizedName === text) {
    // 카드사/은행 접두사 제거
    normalizedName = normalizedName
      .replace(/^(삼성|신한|kb|국민|현대|롯데|하나|bc|우리|nh|농협|카카오|토스|국민은행|신한은행|우리은행|하나은행|kb국민|kb국민은행)\s*/i, "")
      .replace(/\s*(카드|은행|뱅크|bank|card)\s*/gi, "")
    
    // 거래번호/승인번호 제거
    normalizedName = normalizedName
      .replace(/\s*승인번호\s*:?\s*\d+/gi, "")
      .replace(/\s*거래번호\s*:?\s*\d+/gi, "")
      .replace(/\s*승인\s*:?\s*\d+/gi, "")
    
    // 불필요한 공백 정리
    normalizedName = normalizedName.trim().replace(/\s+/g, " ")
    
    // 빈 문자열이면 원본 유지
    if (!normalizedName) {
      normalizedName = text
    }
  }
  
  // 큰 금액이면서 카테고리가 "기타"면 검토 필요
  if (amount > 1000000 && matchedCategory === "기타") {
    needsReview = true
    confidence = 0.3
    classificationReason = `큰 금액(${amount.toLocaleString()}원)이지만 카테고리 매칭 없음 - 검토 필요`
    console.log(`[분류] 큰 금액 검토 필요: "${text}" (${amount.toLocaleString()}원)`)
  }
  
  // 수입/지출 구분 개선 (금액으로도 판단)
  // (이 부분은 호출하는 쪽에서 이미 처리하므로 여기서는 카테고리만)
  
  if (!classificationReason) {
    classificationReason = "기타 (매칭 규칙 없음)"
  }
  
  console.log(`[분류 최종] "${text}" -> "${matchedCategory}" (신뢰도: ${confidence}, 검토필요: ${needsReview}, 근거: ${classificationReason})`)
  
  return { 
    category: matchedCategory, 
    name: normalizedName, 
    confidence, 
    needsReview,
    reason: classificationReason
  }
}

// API 호출 빈도 제한을 위한 간단한 큐 관리
let apiCallQueue: Array<{ resolve: (value: any) => void; reject: (error: any) => void; timestamp: number }> = []
let lastApiCallTime = 0
const MIN_API_CALL_INTERVAL = 0 // Rate limiting 비활성화 (429 에러 발생 시에만 대기)
const MAX_QUEUE_SIZE = 100 // 최대 대기 큐 크기
let quotaResetTime = 0 // 429 에러 시 재시도 가능 시간

// API 호출을 큐에 추가하고 제한을 준수하며 실행
async function queueApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    // 큐가 너무 크면 거부
    if (apiCallQueue.length >= MAX_QUEUE_SIZE) {
      reject(new Error("API 호출 큐가 가득 찼습니다. 잠시 후 다시 시도해주세요."))
      return
    }
    
    const now = Date.now()
    const timeSinceLastCall = now - lastApiCallTime
    
    if (timeSinceLastCall >= MIN_API_CALL_INTERVAL) {
      // 즉시 실행 가능
      lastApiCallTime = now
      apiCall()
        .then(resolve)
        .catch(reject)
    } else {
      // 대기 후 실행
      const waitTime = MIN_API_CALL_INTERVAL - timeSinceLastCall
      apiCallQueue.push({ resolve, reject, timestamp: now + waitTime })
      
      // 큐 처리 시작 (아직 시작하지 않았다면)
      if (apiCallQueue.length === 1) {
        processApiQueue(apiCall)
      }
    }
  })
}

// API 호출 큐 처리
async function processApiQueue<T>(apiCall: () => Promise<T>) {
  while (apiCallQueue.length > 0) {
    const item = apiCallQueue[0]
    const now = Date.now()
    
    if (now >= item.timestamp) {
      // 실행 시간 도달
      apiCallQueue.shift()
      lastApiCallTime = now
      
      try {
        const result = await apiCall()
        item.resolve(result)
      } catch (error) {
        item.reject(error)
      }
    } else {
      // 아직 대기 시간이 남음
      await new Promise(resolve => setTimeout(resolve, item.timestamp - now))
    }
  }
}

// AI API를 사용하여 가맹점명으로부터 카테고리 추론
async function classifyWithAIApi(merchantName: string): Promise<{ category: string; confidence: number } | null> {
  try {
    // 환경 변수에서 API 키 확인 (Next.js는 .env.local을 자동으로 로드)
    const openaiApiKey = process.env.OPENAI_API_KEY
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
    
    // 가맹점명 정규화 (회사명 접두사 제거 등)
    const { normalizeMerchantName } = await import("@/lib/state")
    const normalizedMerchantName = normalizeMerchantName(merchantName)
    
    console.log(`[AI API] 호출 시작: "${merchantName}" (정규화: "${normalizedMerchantName}")`)
    console.log(`[AI API] OpenAI 키 존재: ${!!openaiApiKey}, Gemini 키 존재: ${!!geminiApiKey}`)
    console.log(`[AI API] Gemini 키 값 (처음 10자리): ${geminiApiKey ? geminiApiKey.substring(0, 10) + '...' : '없음'}`)
    
    // 개인 이체 관련 키워드 체크 (개인정보 보호)
    const personalTransferKeywords = ["이체", "송금", "입금", "출금", "계좌이체", "자동이체"]
    const lowerName = normalizedMerchantName.toLowerCase()
    if (personalTransferKeywords.some(keyword => lowerName.includes(keyword))) {
      // 개인 이체는 AI API 호출하지 않음
      console.log(`[AI API] 개인 이체 관련 키워드 포함으로 호출 건너뜀: "${merchantName}"`)
      return null
    }
    
    // 정규화된 이름을 AI API에 전달 (더 정확한 분류를 위해)
    const nameForAI = normalizedMerchantName
    
    // OpenAI API 사용 (우선순위)
    if (openaiApiKey) {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: "당신은 한국의 가맹점명을 보고 카테고리를 분류하는 전문가입니다. 주어진 가맹점명만 보고 다음 카테고리 중 하나를 선택하세요: 식비, 교통비, 쇼핑, 통신비, 공과금, 보험, 의료, 교육, 유흥, 급여, 용돈, 저축/투자, 대출/이자, 세금, 기타. 카테고리 이름만 답변하세요."
              },
              {
                role: "user",
                content: `가맹점명: "${nameForAI}"\n\n이 가맹점은 어떤 카테고리인가요?`
              }
            ],
            temperature: 0.3,
            max_tokens: 20,
          }),
        })
        
        if (response.ok) {
          const data = await response.json()
          const aiCategory = data.choices[0]?.message?.content?.trim() || ""
          console.log(`[AI API] OpenAI 응답 원본: "${aiCategory}"`)
          
          // 유효한 카테고리인지 확인
          const validCategories = ["식비", "교통비", "쇼핑", "통신비", "공과금", "보험", "의료", "교육", "유흥", "급여", "용돈", "저축/투자", "대출/이자", "세금", "기타"]
          if (validCategories.includes(aiCategory)) {
            console.log(`[AI API] OpenAI 분류 성공: "${merchantName}" -> "${aiCategory}"`)
            return {
              category: aiCategory,
              confidence: 0.85, // AI API 결과는 높은 신뢰도
            }
          } else {
            console.log(`[AI API] OpenAI 응답이 유효한 카테고리가 아님: "${aiCategory}"`)
          }
        } else {
          const errorText = await response.text()
          console.error(`[AI API] OpenAI API 응답 오류 (${response.status}): ${errorText}`)
        }
      } catch (error: any) {
        console.error(`[AI API] OpenAI API 호출 오류:`, error.message || error)
      }
    }
    
    // Gemini API 사용 (대안)
    if (geminiApiKey) {
      // 429 에러로 인한 대기 시간 확인
      const now = Date.now()
      if (quotaResetTime > now) {
        const waitSeconds = Math.ceil((quotaResetTime - now) / 1000)
        console.warn(`[AI API] Gemini API 호출 제한 중. ${waitSeconds}초 후 재시도 가능합니다.`)
        console.warn(`[AI API] 현재는 규칙 기반 분류만 사용됩니다. 잠시 후 다시 시도해주세요.`)
        return null
      }
      
      // Rate limiting: 마지막 호출로부터 최소 간격 확인
      const timeSinceLastCall = now - lastApiCallTime
      if (timeSinceLastCall < MIN_API_CALL_INTERVAL) {
        const waitTime = MIN_API_CALL_INTERVAL - timeSinceLastCall
        console.log(`[AI API] Rate limit 대기: ${Math.ceil(waitTime / 1000)}초...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
      lastApiCallTime = Date.now()
      
      try {
        const promptText = `당신은 한국의 가맹점명을 보고 카테고리를 분류하는 전문가입니다. 주어진 가맹점명만 보고 다음 카테고리 중 하나를 선택하세요: 식비, 교통비, 쇼핑, 통신비, 공과금, 보험, 의료, 교육, 유흥, 급여, 용돈, 저축/투자, 대출/이자, 세금, 기타.\n\n가맹점명: "${nameForAI}"\n\n카테고리만 답변하세요:`
        
        console.log(`[AI API] Gemini API 호출: "${nameForAI}" (원본: "${merchantName}")`)
        
        // Gemini API v1 사용
        // 모델명 우선순위: gemini-2.5-flash (최신) -> gemini-1.5-flash -> gemini-1.5-pro -> gemini-pro
        const requestBody = {
          contents: [{
            parts: [{
              text: promptText
            }]
          }]
        }
        
        // 사용 가능한 모델명 시도 (우선순위 순서)
        const modelsToTry = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"]
        let lastError: any = null
        
        for (const modelName of modelsToTry) {
          try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${geminiApiKey}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(requestBody),
            })
            
            if (response.ok) {
              console.log(`[AI API] Gemini 모델 "${modelName}" 사용 성공`)
              const data = await response.json()
              console.log(`[AI API] Gemini 응답 원본:`, JSON.stringify(data, null, 2))
              
              const aiCategory = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ""
              console.log(`[AI API] Gemini 파싱된 카테고리: "${aiCategory}"`)
              
              // 유효한 카테고리인지 확인
              const validCategories = ["식비", "교통비", "쇼핑", "통신비", "공과금", "보험", "의료", "교육", "유흥", "급여", "용돈", "저축/투자", "대출/이자", "세금", "기타"]
              if (validCategories.includes(aiCategory)) {
                console.log(`[AI API] Gemini 분류 성공: "${merchantName}" -> "${aiCategory}"`)
                return {
                  category: aiCategory,
                  confidence: 0.85,
                }
              } else {
                console.log(`[AI API] Gemini 응답이 유효한 카테고리가 아님: "${aiCategory}"`)
              }
              break // 성공했지만 유효하지 않은 카테고리인 경우 다음 모델 시도하지 않음
            } else {
              const errorText = await response.text()
              lastError = { status: response.status, text: errorText }
              
              // 429 에러 (Quota Exceeded) 처리
              if (response.status === 429) {
                try {
                  const errorData = JSON.parse(errorText)
                  const retryInfo = errorData?.error?.details?.find((d: any) => d["@type"] === "type.googleapis.com/google.rpc.RetryInfo")
                  const retryDelaySeconds = retryInfo?.retryDelay ? parseFloat(String(retryInfo.retryDelay)) : 60 // 기본 60초
                  
                  const waitTime = Math.ceil(retryDelaySeconds * 1000) // 밀리초로 변환
                  quotaResetTime = Date.now() + waitTime
                  
                  console.warn(`[AI API] Gemini API 429 에러 (Quota Exceeded). ${Math.ceil(retryDelaySeconds)}초 후 재시도 가능합니다.`)
                  console.warn(`[AI API] 무료 플랜 제한: 분당 5회. 현재 호출이 너무 빠릅니다.`)
                  
                  // 429 에러면 다른 모델 시도하지 않고 즉시 중단
                  return null
                } catch (parseError) {
                  console.error(`[AI API] 429 에러 파싱 실패:`, parseError)
                  quotaResetTime = Date.now() + 60000 // 기본 60초 대기
                  return null
                }
              }
              
              console.log(`[AI API] Gemini 모델 "${modelName}" 실패 (${response.status}), 다음 모델 시도...`)
              // 404가 아니면 다른 모델 시도하지 않음
              if (response.status !== 404) {
                console.error(`[AI API] Gemini API 응답 오류 (${response.status}): ${errorText}`)
                break
              }
            }
          } catch (fetchError: any) {
            lastError = fetchError
            console.log(`[AI API] Gemini 모델 "${modelName}" 호출 오류:`, fetchError.message || fetchError)
            // 네트워크 오류면 다음 모델 시도하지 않음
            break
          }
        }
        
        // 모든 모델 시도 실패
        if (lastError) {
          console.error(`[AI API] 모든 Gemini 모델 시도 실패. 마지막 오류:`, lastError)
        }
      } catch (error: any) {
        console.error(`[AI API] Gemini API 호출 오류:`, error.message || error)
      }
    } else {
      console.log(`[AI API] Gemini API 키가 없어 호출하지 않음`)
    }
    
    console.log(`[AI API] 모든 API 호출 실패 또는 응답 없음: "${merchantName}"`)
    return null
  } catch (error: any) {
    console.error(`[AI API] AI API 분류 전체 오류:`, error.message || error)
    return null
  }
}

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// 날짜 문자열을 YYYY-MM-DD 형식으로 정규화 (export for use in upload-multiple)
export function normalizeDate(dateStr: string): string {
  // 이미 YYYY-MM-DD 형식이면 그대로 반환
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }
  
  // YYYY/MM/DD 또는 YYYY.MM.DD 형식
  const date1 = dateStr.match(/^(\d{4})[\/\.](\d{1,2})[\/\.](\d{1,2})/)
  if (date1) {
    return `${date1[1]}-${date1[2].padStart(2, "0")}-${date1[3].padStart(2, "0")}`
  }
  
  // MM/DD/YYYY 형식
  const date2 = dateStr.match(/^(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})/)
  if (date2) {
    return `${date2[3]}-${date2[1].padStart(2, "0")}-${date2[2].padStart(2, "0")}`
  }
  
  // 현재 날짜를 기본값으로 사용
  return new Date().toISOString().split("T")[0]
}

// 카드사 감지 (파일명, 메타데이터, 컬럼명으로)
function detectCardCompany(fileName?: string, metadata?: SourceMetadata, jsonData?: any[]): string | null {
  // 1. 메타데이터에서 카드사 확인
  if (metadata?.cardName) {
    return metadata.cardName
  }
  
  // 2. 파일명에서 확인
  if (fileName) {
    const lowerFileName = fileName.toLowerCase()
    if (lowerFileName.includes("kb") || lowerFileName.includes("국민")) {
      return "KB카드"
    }
    if (lowerFileName.includes("삼성") || lowerFileName.includes("samsung")) {
      return "삼성카드"
    }
    if (lowerFileName.includes("신한") || lowerFileName.includes("shinhan")) {
      return "신한카드"
    }
    if (lowerFileName.includes("현대") || lowerFileName.includes("hyundai")) {
      return "현대카드"
    }
    if (lowerFileName.includes("롯데") || lowerFileName.includes("lotte")) {
      return "롯데카드"
    }
  }
  
  // 3. 컬럼명으로 확인 (국민카드는 "이용일", "이용시간", "이용하신곳" 등 사용)
  if (jsonData && jsonData.length > 0) {
    const firstRow = jsonData[0] as any
    const keys = Object.keys(firstRow).map(k => k.toLowerCase())
    
    // 국민카드 특정 컬럼명
    if (keys.some(k => k.includes("이용일")) && keys.some(k => k.includes("이용시간")) && keys.some(k => k.includes("이용하신곳"))) {
      return "KB카드"
    }
    // 삼성카드 특정 컬럼명
    if (keys.some(k => k.includes("거래일시")) && keys.some(k => k.includes("가맹점명"))) {
      return "삼성카드"
    }
    // 신한카드 특정 컬럼명
    if (keys.some(k => k.includes("거래일자")) && keys.some(k => k.includes("가맹점"))) {
      return "신한카드"
    }
  }
  
  return null
}

// KB국민카드 전용 파싱 함수 (1-6행은 메타데이터, 7행은 설명 필드, 8행부터 실제 데이터)
// KB 카드 엑셀을 원본 시트에서 직접 읽어서 파싱 (7행이 헤더, 8행부터 데이터)
async function parseKBCardExcelFromSheet(
  worksheet: XLSX.WorkSheet,
  profileId: string,
  metadata: SourceMetadata,
  transactionNameMappings?: Record<string, string>
): Promise<any[]> {
  console.log(`[KB카드 파싱] 원본 시트에서 직접 읽기 시작`)
  
  // 시트의 범위 확인
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
  console.log(`[KB카드 파싱] 시트 범위: ${worksheet['!ref']}, 행: ${range.e.r + 1}개`)
  
  // 7행(인덱스 6)을 헤더로 읽기
  const headerRow: Record<string, string> = {} // colLetter -> headerName
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 6, c: col }) // 7행 = 인덱스 6
    const cell = worksheet[cellAddress]
    const colLetter = XLSX.utils.encode_col(col)
    if (cell && cell.v) {
      const headerName = String(cell.v).trim()
      if (headerName) {
        headerRow[colLetter] = headerName
      } else {
        headerRow[colLetter] = `__EMPTY_${col}`
      }
    } else {
      headerRow[colLetter] = `__EMPTY_${col}`
    }
  }
  
  const headerNames = Object.values(headerRow).filter(name => !name.startsWith("__EMPTY"))
  console.log(`[KB카드 파싱] 헤더 행 (7행) 컬럼명:`, headerNames)
  
  // 8행(인덱스 7)부터 데이터 읽기
  const transactions: any[] = []
  let parsedCount = 0
  let skippedCount = 0
  
  for (let row = 7; row <= range.e.r; row++) { // 8행부터 (인덱스 7)
    const rowData: Record<string, any> = {}
    
    // 각 컬럼의 값을 읽기
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
      const cell = worksheet[cellAddress]
      const colLetter = XLSX.utils.encode_col(col)
      const headerName = headerRow[colLetter] || `__EMPTY_${col}`
      
      if (cell && cell.v !== undefined && cell.v !== null && cell.v !== "") {
        rowData[headerName] = cell.v
      } else {
        rowData[headerName] = ""
      }
    }
    
    // 데이터 파싱
    let dateStr = ""
    let datetimeStr = ""
    let name = ""
    let amount = 0
    let type: "INCOME" | "EXPENSE" = "EXPENSE"
    let transactionNumber = ""
    let isCancelled = false
    
    for (const [key, value] of Object.entries(rowData)) {
      const lowerKey = key.toLowerCase()
      
      // 이용일
      if ((lowerKey === "이용일" || lowerKey.includes("이용일")) && !lowerKey.includes("시간") && !lowerKey.includes("결제예정일")) {
        if (value !== null && value !== undefined && value !== "") {
          let dateValue = String(value).trim()
          if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
            dateStr = dateValue
          } else if (dateValue.match(/^\d{8}$/)) {
            dateStr = `${dateValue.substring(0, 4)}-${dateValue.substring(4, 6)}-${dateValue.substring(6, 8)}`
          } else if (typeof value === "number" && value >= 1) {
            try {
              const excelEpoch = new Date(1899, 11, 30)
              const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000)
              dateStr = date.toISOString().split("T")[0]
            } catch (error) {
              console.error(`[KB카드 파싱] 날짜 변환 실패:`, error)
            }
          }
        }
      }
      
      // 이용시간
      if (lowerKey === "이용시간" || (lowerKey.includes("이용시간") || (lowerKey.includes("시간") && !lowerKey.includes("이용일") && !lowerKey.includes("결제예정일")))) {
        if (value !== null && value !== undefined && value !== "" && dateStr) {
          const timeValue = String(value).trim()
          const timeMatch = timeValue.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
          if (timeMatch) {
            const hours = parseInt(timeMatch[1])
            const minutes = parseInt(timeMatch[2])
            const seconds = timeMatch[3] ? parseInt(timeMatch[3]) : 0
            if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60 && seconds >= 0 && seconds < 60) {
              datetimeStr = `${dateStr} ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
            }
          } else if (typeof value === "number" && value < 1 && value >= 0) {
            const hours = Math.floor(value * 24)
            const minutes = Math.floor((value * 24 - hours) * 60)
            datetimeStr = `${dateStr} ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`
          }
        }
      }
      
      // 이용하신곳
      if (lowerKey === "이용하신곳" || lowerKey.includes("이용하신곳") || (lowerKey.includes("가맹점") && !lowerKey.includes("정보"))) {
        if (value !== null && value !== undefined && value !== "") {
          name = String(value).trim()
        }
      }
      
      // 국내이용금액
      if (lowerKey.includes("국내이용금액") || lowerKey.includes("국내이용금액 (원)") || 
          (lowerKey.includes("이용금액") && !lowerKey.includes("해외") && !lowerKey.includes("할인"))) {
        if (value !== null && value !== undefined && value !== "") {
          let numValue: number
          if (typeof value === "number") {
            numValue = value
          } else {
            const cleanValue = String(value).replace(/[,\s₩$원()]/g, "")
            numValue = parseFloat(cleanValue)
          }
          if (!isNaN(numValue) && numValue > 0) {
            amount = Math.abs(numValue)
            type = "EXPENSE"
          }
        }
      }
      
      // 승인번호
      if (lowerKey.includes("승인번호")) {
        transactionNumber = String(value || "").trim()
      }
      
      // 상태
      if (lowerKey.includes("상태")) {
        const statusValue = String(value || "").toLowerCase()
        if (statusValue.includes("취소") || statusValue.includes("환불") || statusValue.includes("반품")) {
          isCancelled = true
        }
      }
    }
    
    // datetime이 없으면 date만 사용
    if (!datetimeStr && dateStr) {
      datetimeStr = `${dateStr} 00:00:00`
    }
    
    // 날짜와 가맹점명, 금액이 있어야 유효한 거래
    if (dateStr && name && amount > 0) {
      parsedCount++
      
      const normalizedDate = normalizeDate(dateStr)
      const normalizedDatetime = datetimeStr || `${normalizedDate} 00:00:00`
      const originalText = name
      const aiResult = await classifyWithAI(originalText, amount, transactionNameMappings)
      
      transactions.push({
        id: randomUUID(),
        profileId,
        date: normalizedDate,
        datetime: normalizedDatetime,
        type,
        category: aiResult.category,
        name: aiResult.name !== originalText ? aiResult.name : name,
        amount: Math.round(amount),
        description: "",
        transactionNumber: transactionNumber || undefined,
        originalText,
        confidence: aiResult.confidence,
        needsReview: aiResult.needsReview || (aiResult.category === "기타"),
        userConfirmed: false,
        aiCategory: aiResult.category,
        classificationReason: aiResult.reason,
        sourceFile: metadata.cardName ? `${metadata.cardName} ${metadata.cardNumber || ""}`.trim() : undefined,
        sourceCardName: metadata.cardName,
        sourceCardNumber: metadata.cardNumber,
        sourceAccountNumber: metadata.accountNumber,
        isCancelled,
        originalAmount: amount,
      })
    } else {
      skippedCount++
      if (skippedCount <= 3) {
        console.log(`[KB카드 파싱] 건너뛴 행 (날짜=${dateStr ? "✓" : "✗"}, 가맹점명=${name ? "✓" : "✗"}, 금액=${amount > 0 ? "✓" : "✗"}):`, JSON.stringify(rowData, null, 2))
      }
    }
  }
  
  console.log(`[KB카드 파싱] ✅ 완료: ${parsedCount}개 파싱, ${skippedCount}개 건너뜀`)
  return transactions
}

async function parseKBCardExcel(
  jsonData: any[],
  worksheet: XLSX.WorkSheet,
  profileId: string,
  metadata: SourceMetadata,
  transactionNameMappings?: Record<string, string>
): Promise<any[]> {
  console.log(`[KB카드 파싱] 시작, 총 ${jsonData.length}개 행`)
  
  // 처음 3개 행 샘플 출력 (디버깅)
  console.log(`[KB카드 파싱] 처음 3개 행 샘플:`)
  for (let i = 0; i < Math.min(3, jsonData.length); i++) {
    const row = jsonData[i] as any
    const keys = Object.keys(row)
    console.log(`  행 ${i + 1}: 컬럼명=${keys.join(", ")}, 샘플=`, JSON.stringify(row, null, 2))
  }
  
  // header: 6 옵션으로 읽었으면 jsonData[0]이 이미 8행(데이터)이고, 컬럼명이 헤더로 사용됨
  // 원본 데이터로 읽었으면 헤더 행을 찾아야 함
  const transactions: any[] = []
  let dataRows: any[] = []
  
  // 첫 번째 행의 컬럼명 확인
  const firstRow = jsonData[0] as any
  const firstRowKeys = Object.keys(firstRow).map(k => k.toLowerCase())
  const hasHeaderColumns = firstRowKeys.some(k => 
    k.includes("이용일") || k.includes("이용시간") || k.includes("이용하신곳") || k.includes("국내이용금액")
  )
  
  if (hasHeaderColumns) {
    // header 옵션으로 읽었거나, 첫 번째 행이 이미 헤더인 경우
    console.log(`[KB카드 파싱] ✅ 첫 번째 행이 헤더로 사용됨 (header 옵션 사용 또는 이미 헤더)`)
    dataRows = jsonData // 모든 행이 데이터
  } else {
    // 헤더 행 찾기: "이용일", "이용시간", "이용하신곳", "국내이용금액" 컬럼이 모두 있는 행
    console.log(`[KB카드 파싱] 헤더 행 검색 시작 (최대 20행까지)`)
    let headerRowIndex = -1
    const maxSearchRows = Math.min(20, jsonData.length)
    
    for (let i = 0; i < maxSearchRows; i++) {
      const row = jsonData[i] as any
      const keys = Object.keys(row).map(k => k.toLowerCase())
      
      // 각 컬럼 존재 여부 확인
      const hasUsageDate = keys.some(k => k.includes("이용일") && !k.includes("시간") && !k.includes("결제예정일"))
      const hasUsageTime = keys.some(k => k.includes("이용시간") || (k.includes("시간") && !k.includes("이용일") && !k.includes("결제예정일")))
      const hasPlace = keys.some(k => k.includes("이용하신곳") || (k.includes("가맹점") && !k.includes("정보")))
      const hasAmount = keys.some(k => k.includes("국내이용금액") || (k.includes("이용금액") && !k.includes("해외") && !k.includes("할인")))
      
      if (hasUsageDate && hasUsageTime && hasPlace && hasAmount) {
        headerRowIndex = i
        console.log(`[KB카드 파싱] ✅ 헤더 행 발견: ${i + 1}행 (인덱스 ${i}), 컬럼명: ${keys.join(", ")}`)
        break
      }
    }
    
    if (headerRowIndex === -1) {
      console.log("[KB카드 파싱] ⚠️ 헤더 행을 찾을 수 없습니다. 첫 번째 행을 헤더로 사용합니다.")
      headerRowIndex = 0
    }
    
    // 헤더 행 다음부터 데이터 행
    dataRows = jsonData.slice(headerRowIndex + 1)
  }
  
  console.log(`[KB카드 파싱] 데이터 행: ${dataRows.length}개`)
  
  if (dataRows.length === 0) {
    console.log("[KB카드 파싱] ❌ 데이터 행이 없습니다.")
    return []
  }
  
  // 첫 번째 데이터 행의 컬럼명 확인
  const firstDataRow = dataRows[0] as any
  const columnKeys = Object.keys(firstDataRow)
  console.log(`[KB카드 파싱] ✅ 첫 번째 데이터 행 컬럼명:`, columnKeys)
  console.log(`[KB카드 파싱] 첫 번째 데이터 행 샘플:`, JSON.stringify(firstDataRow, null, 2))
  
  return await parseKBCardExcelWithDataRows(dataRows, profileId, metadata, transactionNameMappings)
}

// KB 카드 데이터 행 파싱 (헬퍼 함수)
async function parseKBCardExcelWithDataRows(
  dataRows: any[],
  profileId: string,
  metadata: SourceMetadata,
  transactionNameMappings?: Record<string, string>
): Promise<any[]> {
  const transactions: any[] = []
  let parsedCount = 0
  let skippedCount = 0
  
  for (const row of dataRows as any[]) {
    let dateStr = ""
    let datetimeStr = ""
    let name = ""
    let amount = 0
    let type: "INCOME" | "EXPENSE" = "EXPENSE"
    let transactionNumber = ""
    let isCancelled = false
    
    // KB카드 컬럼명 매핑
    for (const key of Object.keys(row)) {
      const lowerKey = key.toLowerCase()
      const value = row[key]
      
      // 이용일 (Usage Date) - "2025-12-14" 형식
      // 정확한 컬럼명: "이용일"
      if ((lowerKey === "이용일" || lowerKey.includes("이용일")) && !lowerKey.includes("시간") && !lowerKey.includes("결제예정일")) {
        if (value !== null && value !== undefined && value !== "") {
          let dateValue = String(value).trim()
          
          // YYYY-MM-DD 형식 (이미지에서 확인된 형식)
          if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
            dateStr = dateValue
            console.log(`[KB카드 파싱] 날짜 파싱 (YYYY-MM-DD): "${value}" -> ${dateStr}`)
          } 
          // YYYYMMDD 형식
          else if (dateValue.match(/^\d{8}$/)) {
            dateStr = `${dateValue.substring(0, 4)}-${dateValue.substring(4, 6)}-${dateValue.substring(6, 8)}`
            console.log(`[KB카드 파싱] 날짜 파싱 (YYYYMMDD): "${value}" -> ${dateStr}`)
          } 
          // 엑셀 날짜 숫자 (1900-01-01부터의 일수)
          else if (typeof value === "number" && value >= 1) {
            try {
              const excelEpoch = new Date(1899, 11, 30)
              const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000)
              dateStr = date.toISOString().split("T")[0]
              console.log(`[KB카드 파싱] 날짜 파싱 (엑셀 숫자): ${value} -> ${dateStr}`)
            } catch (error) {
              console.error(`[KB카드 파싱] 날짜 변환 실패:`, error)
            }
          } else {
            console.log(`[KB카드 파싱] 날짜 파싱 실패: "${value}" (타입: ${typeof value})`)
          }
        }
      }
      
      // 이용시간 (Usage Time) - "06:39" 형식
      // 정확한 컬럼명: "이용시간"
      if (lowerKey === "이용시간" || (lowerKey.includes("이용시간") || (lowerKey.includes("시간") && !lowerKey.includes("이용일") && !lowerKey.includes("결제예정일")))) {
        if (value !== null && value !== undefined && value !== "" && dateStr) {
          const timeValue = String(value).trim()
          // HH:mm 또는 HH:mm:ss 형식 (이미지에서 확인된 형식)
          const timeMatch = timeValue.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
          if (timeMatch) {
            const hours = parseInt(timeMatch[1])
            const minutes = parseInt(timeMatch[2])
            const seconds = timeMatch[3] ? parseInt(timeMatch[3]) : 0
            // 시간 유효성 검사
            if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60 && seconds >= 0 && seconds < 60) {
              datetimeStr = `${dateStr} ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
              console.log(`[KB카드 파싱] 시간 파싱: "${value}" -> ${datetimeStr}`)
            } else {
              console.log(`[KB카드 파싱] 시간 파싱 실패 (유효하지 않은 시간): "${value}"`)
            }
          } else if (typeof value === "number" && value < 1 && value >= 0) {
            // 엑셀 시간 비율 (0~1 사이)
            const hours = Math.floor(value * 24)
            const minutes = Math.floor((value * 24 - hours) * 60)
            datetimeStr = `${dateStr} ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`
            console.log(`[KB카드 파싱] 시간 파싱 (엑셀 비율): ${value} -> ${datetimeStr}`)
          } else {
            console.log(`[KB카드 파싱] 시간 파싱 실패: "${value}" (타입: ${typeof value})`)
          }
        }
      }
      
      // 이용하신곳 (Place of Use) - 가맹점명
      // 정확한 컬럼명: "이용하신곳"
      if (lowerKey === "이용하신곳" || lowerKey.includes("이용하신곳") || (lowerKey.includes("가맹점") && !lowerKey.includes("정보"))) {
        if (value !== null && value !== undefined && value !== "") {
          name = String(value).trim()
          if (name) {
            console.log(`[KB카드 파싱] 가맹점명: "${name}"`)
          }
        }
      }
      
      // 국내이용금액 (Domestic Usage Amount) - "국내이용금액 (원)" 또는 "국내이용금액" 형식
      // 정확한 컬럼명: "국내이용금액 (원)" - 괄호와 공백이 포함될 수 있음
      if (lowerKey.includes("국내이용금액") || lowerKey.includes("국내이용금액 (원)") || 
          (lowerKey.includes("이용금액") && !lowerKey.includes("해외") && !lowerKey.includes("할인"))) {
        if (value !== null && value !== undefined && value !== "") {
          let numValue: number
          if (typeof value === "number") {
            numValue = value
          } else {
            // 문자열인 경우 콤마, 공백, 통화 기호 제거
            const cleanValue = String(value).replace(/[,\s₩$원()]/g, "")
            numValue = parseFloat(cleanValue)
          }
          if (!isNaN(numValue) && numValue > 0) {
            amount = Math.abs(numValue)
            type = "EXPENSE"
            console.log(`[KB카드 파싱] 금액 파싱: "${value}" -> ${amount}`)
          }
        }
      }
      
      // 승인번호 (Approval Number)
      if (lowerKey.includes("승인번호") || lowerKey.includes("승인번호")) {
        transactionNumber = String(value || "").trim()
      }
      
      // 상태 (Status) - 취소건 확인
      if (lowerKey.includes("상태")) {
        const statusValue = String(value || "").toLowerCase()
        if (statusValue.includes("취소") || statusValue.includes("환불") || statusValue.includes("반품")) {
          isCancelled = true
        }
      }
    }
    
    // datetime이 없으면 date만 사용
    if (!datetimeStr && dateStr) {
      datetimeStr = `${dateStr} 00:00:00`
    }
    
    // 날짜와 가맹점명, 금액이 있어야 유효한 거래
    if (dateStr && name && amount > 0) {
      parsedCount++
      
      // 날짜 형식 정규화
      const normalizedDate = normalizeDate(dateStr)
      const normalizedDatetime = datetimeStr || `${normalizedDate} 00:00:00`
      
      // 원본 텍스트
      const originalText = name
      
      // 카테고리 분류
      const aiResult = await classifyWithAI(originalText, amount, transactionNameMappings)
      
      transactions.push({
        id: randomUUID(),
        profileId,
        date: normalizedDate,
        datetime: normalizedDatetime,
        type,
        category: aiResult.category,
        name: aiResult.name !== originalText ? aiResult.name : name,
        amount: Math.round(amount),
        description: "",
        transactionNumber: transactionNumber || undefined,
        originalText,
        confidence: aiResult.confidence,
        needsReview: aiResult.needsReview || (aiResult.category === "기타"),
        userConfirmed: false,
        aiCategory: aiResult.category,
        classificationReason: aiResult.reason,
        sourceFile: metadata.cardName ? `${metadata.cardName} ${metadata.cardNumber || ""}`.trim() : undefined,
        sourceCardName: metadata.cardName,
        sourceCardNumber: metadata.cardNumber,
        sourceAccountNumber: metadata.accountNumber,
        isCancelled,
        originalAmount: amount,
      })
    } else {
      skippedCount++
      if (skippedCount <= 5) {
        console.log(`[KB카드 파싱] ⚠️ 건너뛴 행 (날짜=${dateStr ? "✓" : "✗"}, 가맹점명=${name ? "✓" : "✗"}, 금액=${amount > 0 ? "✓" : "✗"}):`, JSON.stringify(row, null, 2))
      }
    }
  }
  
  console.log(`[KB카드 파싱] ✅ 완료: ${parsedCount}개 파싱, ${skippedCount}개 건너뜀`)
  
  if (parsedCount === 0 && dataRows.length > 0) {
    console.log(`[KB카드 파싱] ❌ 파싱된 거래가 없습니다. 첫 번째 데이터 행 상세 분석:`)
    const firstRow = dataRows[0] as any
    for (const [key, value] of Object.entries(firstRow)) {
      console.log(`  - ${key}: ${value} (타입: ${typeof value})`)
    }
  }
  
  return transactions
}

// 엑셀 파일에서 카드사, 카드번호, 계좌번호 등 메타데이터 추출
function extractSourceMetadata(worksheet: XLSX.WorkSheet, jsonData: any[]): SourceMetadata {
  const metadata: SourceMetadata = {}
  
  // 1. 헤더 행에서 추출 (일부 엑셀은 헤더에 카드 정보 포함)
  if (jsonData.length > 0) {
    const firstRow = jsonData[0] as any
    for (const [key, value] of Object.entries(firstRow)) {
      const lowerKey = String(key).toLowerCase()
      const lowerValue = String(value || "").toLowerCase()
      
      // 카드사 이름 찾기
      if (!metadata.cardName) {
        const cardKeywords: Record<string, string> = {
          "삼성": "삼성카드", "samsung": "삼성카드",
          "신한": "신한카드", "shinhan": "신한카드",
          "kb": "KB카드", "kb국민": "KB카드",
          "현대": "현대카드", "hyundai": "현대카드",
          "롯데": "롯데카드", "lotte": "롯데카드",
          "하나": "하나카드", "hana": "하나카드",
          "bc": "BC카드",
          "우리": "우리카드", "woori": "우리카드",
          "nh": "NH카드", "농협": "NH카드",
          "카카오": "카카오뱅크", "kakao": "카카오뱅크",
          "토스": "토스뱅크", "toss": "토스뱅크",
          "국민은행": "KB국민은행", "kb은행": "KB국민은행",
          "신한은행": "신한은행", "우리은행": "우리은행",
          "하나은행": "하나은행", "nh은행": "NH농협은행", "농협은행": "NH농협은행",
        }
        
        for (const [keyword, cardName] of Object.entries(cardKeywords)) {
          if (lowerKey.includes(keyword) || lowerValue.includes(keyword)) {
            metadata.cardName = cardName
            break
          }
        }
      }
      
      // 카드번호/계좌번호 찾기 (4자리 이상 숫자)
      if (lowerKey.includes("카드") || lowerKey.includes("card") || 
          lowerKey.includes("계좌") || lowerKey.includes("account")) {
        const numMatch = String(value).match(/(\d{4,})/)
        if (numMatch) {
          const num = numMatch[1]
          if (lowerKey.includes("카드") || lowerKey.includes("card")) {
            metadata.cardNumber = num.slice(-4) // 뒷4자리
          } else {
            metadata.accountNumber = num
          }
        }
      }
    }
  }
  
  // 2. 워크시트 전체에서 메타데이터 영역 스캔 (상단 몇 행)
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
  for (let row = 0; row < Math.min(10, range.e.r); row++) {
    for (let col = 0; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
      const cell = worksheet[cellAddress]
      if (cell && cell.v) {
        const cellValue = String(cell.v).toLowerCase()
        
        // 카드사 이름 찾기
        if (!metadata.cardName) {
          const cardKeywords: Record<string, string> = {
            "삼성카드": "삼성카드", "신한카드": "신한카드", "kb카드": "KB카드",
            "현대카드": "현대카드", "롯데카드": "롯데카드", "하나카드": "하나카드",
            "bc카드": "BC카드", "우리카드": "우리카드", "nh카드": "NH카드",
            "카카오뱅크": "카카오뱅크", "토스뱅크": "토스뱅크",
            "kb국민은행": "KB국민은행", "신한은행": "신한은행", "우리은행": "우리은행",
            "하나은행": "하나은행", "nh농협은행": "NH농협은행",
          }
          
          for (const [keyword, cardName] of Object.entries(cardKeywords)) {
            if (cellValue.includes(keyword)) {
              metadata.cardName = cardName
              break
            }
          }
        }
        
        // 카드번호/계좌번호 찾기 (****1234 형식 또는 숫자만)
        if (!metadata.cardNumber && !metadata.accountNumber) {
          const numPattern = /(\d{4,})/g
          const matches = String(cell.v).match(numPattern)
          if (matches) {
            for (const match of matches) {
              if (match.length >= 4) {
                if (cellValue.includes("카드") || cellValue.includes("card")) {
                  metadata.cardNumber = match.slice(-4)
                } else if (cellValue.includes("계좌") || cellValue.includes("account")) {
                  metadata.accountNumber = match
                } else if (match.length === 4) {
                  // 4자리 숫자면 카드번호로 추정
                  metadata.cardNumber = match
                }
              }
            }
          }
        }
      }
    }
  }
  
  // 3. 거래 내역에서 카드번호 추출 (거래번호나 설명에 포함된 경우)
  if (!metadata.cardNumber) {
    for (const row of jsonData.slice(0, 10)) { // 처음 10개 행만 확인
      const rowStr = JSON.stringify(row).toLowerCase()
      const cardNumMatch = rowStr.match(/[*\d]{4,}/)
      if (cardNumMatch) {
        const num = cardNumMatch[0].replace(/\*/g, '')
        if (num.length >= 4) {
          metadata.cardNumber = num.slice(-4)
          break
        }
      }
    }
  }
  
  return metadata
}

// 엑셀 파일을 파싱하여 Transaction 배열로 변환 (대용량 파일 지원)
// export for use in upload-multiple
// transactionNameMappings: 저장된 거래명-카테고리 매핑 (같은 거래명 자동 분류용)
export async function parseExcelToTransactions(
  buffer: Buffer, 
  profileId: string, 
  fileName?: string,
  transactionNameMappings?: Record<string, string>
): Promise<any[]> {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" })
    
    // 모든 시트 확인하여 데이터가 있는 시트 찾기
    let worksheet: XLSX.WorkSheet | null = null
    let jsonData: any[] = []
    let selectedSheetName = ""
    
    // 시트가 여러 개인 경우, 데이터가 가장 많은 시트 선택
    if (workbook.SheetNames.length > 1) {
      console.log(`엑셀 파일에 ${workbook.SheetNames.length}개 시트가 있습니다:`, workbook.SheetNames)
      
      let maxRows = 0
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false })
        
        // 데이터가 있고, 날짜/금액 컬럼이 있는지 확인
        if (data.length > maxRows && data.length > 0) {
          const firstRow = data[0] as any
          const keys = Object.keys(firstRow).map(k => k.toLowerCase())
          
          // 날짜나 금액 관련 컬럼이 있는지 확인
          const hasDate = keys.some(k => k.includes("날짜") || k.includes("date") || k.includes("일자") || k.includes("거래일"))
          const hasAmount = keys.some(k => k.includes("금액") || k.includes("amount") || k.includes("지출") || k.includes("수입"))
          
          if (hasDate || hasAmount) {
            maxRows = data.length
            worksheet = sheet
            jsonData = data
            selectedSheetName = sheetName
          }
        }
      }
      
      // 데이터가 있는 시트를 찾지 못한 경우, 두 번째 시트 사용 (삼성카드 등)
      if (!worksheet && workbook.SheetNames.length >= 2) {
        console.log("데이터가 많은 시트를 찾지 못했습니다. 두 번째 시트를 사용합니다.")
        selectedSheetName = workbook.SheetNames[1]
        worksheet = workbook.Sheets[selectedSheetName]
        jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false })
      }
    }
    
    // 시트를 찾지 못한 경우 첫 번째 시트 사용
    if (!worksheet) {
      selectedSheetName = workbook.SheetNames[0]
      worksheet = workbook.Sheets[selectedSheetName]
      jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false })
    }
    
    if (jsonData.length === 0) {
      console.log("엑셀 파일이 비어있습니다.")
      return []
    }
    
    console.log(`엑셀 파일 파싱 시작: 시트 "${selectedSheetName}", ${jsonData.length}개 행, 헤더:`, Object.keys(jsonData[0] || {}))
    
    // 첫 번째 행 샘플 출력 (디버깅용)
    if (jsonData.length > 0) {
      console.log("첫 번째 행 샘플:", JSON.stringify(jsonData[0], null, 2))
    }
    
    // 엑셀 파일에서 메타데이터 추출 (카드사, 카드번호 등)
    const metadata = extractSourceMetadata(worksheet, jsonData)
    
    // 카드사 감지 (파일명, 메타데이터, 컬럼명으로)
    const detectedCardCompany = detectCardCompany(fileName, metadata, jsonData)
    console.log(`[카드사 감지] "${detectedCardCompany}"`)
    
    // 카드사별 전용 파싱 함수 호출
    if (detectedCardCompany === "KB카드" || detectedCardCompany === "KB국민카드") {
      // KB 카드는 7행이 헤더이므로, 원본 시트를 직접 읽어서 7행부터 처리
      // 이미지 기준: Row 1-6 = 메타데이터, Row 7 = 헤더, Row 8부터 = 데이터
      console.log(`[KB카드] 원본 시트에서 7행부터 직접 읽기 시작`)
      return await parseKBCardExcelFromSheet(worksheet, profileId, metadata, transactionNameMappings)
    }
    
    // 첫 번째 행을 헤더로 사용
    const transactions: any[] = []
    
    // 일반적인 엑셀 형식 지원:
    // 형식 1: 날짜 | 항목 | 금액 | 카테고리 | 메모
    // 형식 2: 날짜 | 수입/지출 | 항목 | 금액 | 카테고리
    // 형식 3: 날짜 | 항목 | 수입 | 지출 | 카테고리
    
    let parsedCount = 0
    let skippedCount = 0
    
    for (const row of jsonData as any[]) {
      // 날짜 찾기
      let dateStr = ""
      let datetimeStr = ""
      let name = ""
      let amount = 0
      let originalAmount = 0 // 원본 금액 (부호 보존)
      let type: "INCOME" | "EXPENSE" = "EXPENSE"
      let category = ""
      let description = ""
      let transactionNumber = ""
      let isCancelled = false // 취소건 여부
      
      // 날짜/시간 컬럼 찾기 (더 많은 변형 지원)
      for (const key of Object.keys(row)) {
        const lowerKey = key.toLowerCase()
        const value = row[key]
        
        // 날짜 관련 컬럼 찾기
        if (lowerKey.includes("날짜") || lowerKey.includes("date") || lowerKey.includes("일자") || 
            lowerKey.includes("거래일") || lowerKey.includes("거래시각") || lowerKey.includes("거래일시") ||
            lowerKey.includes("승인일") || lowerKey.includes("승인일시") || lowerKey.includes("이용일") ||
            lowerKey.includes("이용일시") || lowerKey.includes("사용일") || lowerKey.includes("사용일시") ||
            lowerKey.includes("time") || lowerKey.includes("datetime") || lowerKey.includes("timestamp") ||
            lowerKey.includes("적용일") || lowerKey.includes("결제일")) {
          if (value) {
            console.log(`[날짜 파싱] 컬럼: "${key}", 값: "${value}", 타입: ${typeof value}`)
            
            // 엑셀 날짜 숫자를 문자열로 변환
            if (typeof value === "number") {
              // 작은 숫자면 시간만일 수 있음 (0~1 사이는 시간 비율)
              if (value < 1 && value >= 0) {
                console.log(`[날짜 파싱] 시간 비율로 보임: ${value}, 건너뜀`)
                continue // 시간만 있는 경우 건너뜀
              }
              
              // 엑셀 날짜는 1900-01-01부터의 일수 (1 = 1900-01-01)
              // 하지만 1보다 작으면 시간 비율일 수 있음
              if (value >= 1) {
                try {
                  const excelEpoch = new Date(1899, 11, 30)
                  const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000)
                  dateStr = date.toISOString().split("T")[0]
                  datetimeStr = date.toISOString().replace("T", " ").split(".")[0]
                  console.log(`[날짜 파싱] 엑셀 숫자 변환 성공: ${value} -> ${dateStr} ${datetimeStr}`)
                } catch (error) {
                  console.error(`[날짜 파싱] 엑셀 숫자 변환 실패:`, error)
                }
              }
            } else {
              const dateTimeValue = String(value).trim()
              console.log(`[날짜 파싱] 문자열 파싱 시작: "${dateTimeValue}"`)
              
              // YYYYMMDD 형식 (국민카드 등에서 사용)
              const yyyymmddMatch = dateTimeValue.match(/^(\d{4})(\d{2})(\d{2})$/)
              if (yyyymmddMatch) {
                dateStr = `${yyyymmddMatch[1]}-${yyyymmddMatch[2]}-${yyyymmddMatch[3]}`
                datetimeStr = `${dateStr} 00:00:00`
                console.log(`[날짜 파싱] YYYYMMDD 형식: ${dateStr}`)
                continue
              }
              
              // YYMMDD 형식
              const yymmddMatch = dateTimeValue.match(/^(\d{2})(\d{2})(\d{2})$/)
              if (yymmddMatch && dateTimeValue.length === 6) {
                const year = parseInt(yymmddMatch[1])
                const fullYear = year < 50 ? 2000 + year : 1900 + year
                dateStr = `${fullYear}-${yymmddMatch[2]}-${yymmddMatch[3]}`
                datetimeStr = `${dateStr} 00:00:00`
                console.log(`[날짜 파싱] YYMMDD 형식: ${dateStr}`)
                continue
              }
              
              // 날짜+시간 형식인지 확인
              if (dateTimeValue.includes(" ") || dateTimeValue.includes("T")) {
                const parts = dateTimeValue.split(/[\sT]/)
                dateStr = parts[0].replace(/\//g, "-").replace(/\./g, "-")
                if (parts[1]) {
                  datetimeStr = `${dateStr} ${parts[1].split(".")[0]}`
                } else {
                  datetimeStr = `${dateStr} 00:00:00`
                }
                console.log(`[날짜 파싱] 날짜+시간 형식: ${dateStr} ${datetimeStr}`)
              } else {
                // 날짜만 있는 경우
                const dateOnlyMatch = dateTimeValue.match(/\d{4}[-\/\.]\d{1,2}[-\/\.]\d{1,2}/)
                if (dateOnlyMatch) {
                  dateStr = dateOnlyMatch[0].replace(/\//g, "-").replace(/\./g, "-")
                  datetimeStr = `${dateStr} 00:00:00`
                  console.log(`[날짜 파싱] 날짜만 형식: ${dateStr}`)
                } else {
                  // 시간만 있는 경우 (HH:mm, HH:mm:ss 등) - 건너뜀
                  const timeOnlyMatch = dateTimeValue.match(/^\d{1,2}:\d{2}(:\d{2})?$/)
                  if (timeOnlyMatch) {
                    console.log(`[날짜 파싱] 시간만 형식으로 보임, 건너뜀: "${dateTimeValue}"`)
                    continue
                  }
                }
              }
            }
          }
        }
        
        // 거래번호 찾기
        if (lowerKey.includes("거래번호") || lowerKey.includes("거래번호") || lowerKey.includes("transaction") || lowerKey.includes("no") || lowerKey.includes("번호")) {
          transactionNumber = String(row[key] || "").trim()
        }
        
        // 항목/내용 찾기 (더 많은 변형 지원)
        if (lowerKey.includes("항목") || lowerKey.includes("내용") || lowerKey.includes("name") || 
            lowerKey.includes("item") || lowerKey.includes("설명") || lowerKey.includes("거래내역") ||
            lowerKey.includes("거래내용") || lowerKey.includes("상호") || lowerKey.includes("가맹점") ||
            lowerKey.includes("사용처") || lowerKey.includes("이용처") || lowerKey.includes("업체") ||
            lowerKey.includes("가맹점명") || lowerKey.includes("상호명")) {
          name = String(row[key] || "").trim()
        }
        
        // 금액 찾기 (더 많은 변형 지원)
        if (lowerKey.includes("금액") || lowerKey.includes("amount") || lowerKey.includes("지출") || 
            lowerKey.includes("수입") || lowerKey.includes("이용금액") || lowerKey.includes("거래금액") ||
            lowerKey.includes("승인금액") || lowerKey.includes("결제금액") || lowerKey.includes("사용금액") ||
            lowerKey.includes("출금") || lowerKey.includes("입금") || lowerKey.includes("잔액") ||
            lowerKey.includes("balance") || lowerKey.includes("price") || lowerKey.includes("가격")) {
          const value = row[key]
          if (value) {
            // 숫자 문자열에서 쉼표, 공백, 통화기호 제거 (부호는 보존)
            const cleanValue = String(value).replace(/[,\s₩$원]/g, "")
            const numValue = typeof value === "number" ? value : parseFloat(cleanValue)
            if (!isNaN(numValue) && numValue !== 0) {
              // 부호 보존 (음수면 수입일 가능성)
              amount = numValue
              // 컬럼명에 "수입" 또는 "입금"이 포함되어 있으면 INCOME
              if (lowerKey.includes("수입") || lowerKey.includes("income") || lowerKey.includes("입금")) {
                type = "INCOME"
                amount = Math.abs(amount) // 수입은 양수로
              } else if (lowerKey.includes("지출") || lowerKey.includes("expense") || lowerKey.includes("출금")) {
                type = "EXPENSE"
                amount = Math.abs(amount) // 지출은 양수로
              }
              // 음수 금액 처리 (취소건일 수 있음 - 나중에 취소 확인 로직에서 처리)
              // 일단 절댓값으로 변환하되, 원본 부호는 유지 (나중에 취소 확인 시 사용)
              amount = Math.abs(amount)
              // 음수였으면 일단 지출로 설정 (나중에 취소 확인 로직에서 수입으로 변경 가능)
              if (numValue < 0 && type === "EXPENSE") {
                // 음수이고 아직 타입이 정해지지 않았으면 출금(지출)로 간주
                // (취소 확인 로직에서 수입으로 변경될 수 있음)
              }
            }
          }
        }
        
        // 수입/지출 구분 찾기
        if (lowerKey.includes("구분") || lowerKey.includes("type") || lowerKey.includes("분류")) {
          const value = String(row[key] || "").toLowerCase()
          if (value.includes("수입") || value.includes("income") || value.includes("+")) {
            type = "INCOME"
          } else if (value.includes("지출") || value.includes("expense") || value.includes("-")) {
            type = "EXPENSE"
          }
        }
        
        // 취소건 확인 (구분 컬럼에서)
        if (lowerKey.includes("구분") || lowerKey.includes("type") || lowerKey.includes("분류") || 
            lowerKey.includes("상태") || lowerKey.includes("status") || lowerKey.includes("거래구분")) {
          const value = String(row[key] || "").toLowerCase()
          if (value.includes("취소") || value.includes("환불") || value.includes("반품") || 
              value.includes("승인취소") || value.includes("cancel") || value.includes("refund")) {
            isCancelled = true
          }
        }
        
        // 카테고리 찾기
        if (lowerKey.includes("카테고리") || lowerKey.includes("category") || lowerKey.includes("분류")) {
          category = String(row[key] || "").trim()
        }
        
        // 메모/설명 찾기
        if (lowerKey.includes("메모") || lowerKey.includes("memo") || lowerKey.includes("비고") || lowerKey.includes("설명") || lowerKey.includes("description")) {
          description = String(row[key] || "").trim()
        }
      }
      
      // 수입/지출 컬럼이 따로 있는 경우
      const incomeCol = Object.keys(row).find(k => k.toLowerCase().includes("수입") && !k.toLowerCase().includes("지출"))
      const expenseCol = Object.keys(row).find(k => k.toLowerCase().includes("지출") && !k.toLowerCase().includes("수입"))
      
      if (incomeCol && row[incomeCol]) {
        const incomeValue = typeof row[incomeCol] === "number" ? row[incomeCol] : parseFloat(String(row[incomeCol]).replace(/,/g, ""))
        if (!isNaN(incomeValue) && incomeValue > 0) {
          amount = Math.abs(incomeValue)
          type = "INCOME"
        }
      }
      
      if (expenseCol && row[expenseCol]) {
        const expenseValue = typeof row[expenseCol] === "number" ? row[expenseCol] : parseFloat(String(row[expenseCol]).replace(/,/g, ""))
        if (!isNaN(expenseValue) && expenseValue > 0) {
          amount = Math.abs(expenseValue)
          type = "EXPENSE"
        }
      }
      
      // 날짜 찾기 개선: 첫 번째 컬럼이 날짜일 수도 있음
      if (!dateStr && Object.keys(row).length > 0) {
        const firstKey = Object.keys(row)[0]
        const firstValue = row[firstKey]
        // 첫 번째 값이 날짜 형식인지 확인
        if (firstValue) {
          const dateMatch = String(firstValue).match(/\d{4}[-\/\.]\d{1,2}[-\/\.]\d{1,2}/)
          if (dateMatch) {
            dateStr = dateMatch[0].replace(/\//g, "-").replace(/\./g, "-")
            datetimeStr = `${dateStr} 00:00:00`
          }
        }
      }
      
      // 항목 찾기 개선: 두 번째 컬럼이 항목일 수도 있음
      if (!name && Object.keys(row).length > 1) {
        const secondKey = Object.keys(row)[1]
        const secondValue = String(row[secondKey] || "").trim()
        if (secondValue && !secondValue.match(/^\d+([,\.]\d+)*$/)) { // 숫자가 아니면 항목으로 간주
          name = secondValue
        }
      }
      
      // 금액 찾기 개선: 숫자 컬럼을 찾기
      if (amount === 0) {
        for (const key of Object.keys(row)) {
          const value = row[key]
          if (value && typeof value !== "string") {
            const numValue = typeof value === "number" ? value : parseFloat(String(value).replace(/,/g, ""))
            if (!isNaN(numValue) && numValue !== 0) {
              amount = Math.abs(numValue)
              break
            }
          } else if (value && typeof value === "string") {
            const numValue = parseFloat(value.replace(/,/g, "").replace(/[^\d.-]/g, ""))
            if (!isNaN(numValue) && numValue !== 0 && numValue > 100) { // 100원 이상만
              amount = Math.abs(numValue)
              break
            }
          }
        }
      }
      
      // 취소건 확인 (항목명에서도)
      if (name) {
        const lowerName = name.toLowerCase()
        if (lowerName.includes("취소") || lowerName.includes("환불") || lowerName.includes("반품") ||
            lowerName.includes("승인취소") || lowerName.includes("cancel") || lowerName.includes("refund")) {
          isCancelled = true
        }
      }
      
      // 취소건은 나중에 원래 거래와 매칭하여 무효화 처리할 예정
      // 일단 취소건 여부만 표시
      
      // 날짜와 항목, 금액이 있어야 유효한 거래
      if (dateStr && name && amount > 0) {
        parsedCount++
        // 날짜 형식 정규화 (YYYY-MM-DD)
        const normalizedDate = normalizeDate(dateStr)
        
        // datetime 정규화 (YYYY-MM-DD HH:mm:ss)
        let normalizedDatetime = datetimeStr
        if (!normalizedDatetime) {
          normalizedDatetime = `${normalizedDate} 00:00:00`
        } else {
          // datetime 형식 정규화
          const datePart = normalizedDatetime.split(" ")[0]
          const timePart = normalizedDatetime.split(" ")[1] || "00:00:00"
          normalizedDatetime = `${normalizeDate(datePart)} ${timePart.padEnd(8, ":00").slice(0, 8)}`
        }
        
        // 원본 텍스트 (카테고리 분류를 위해)
        const originalText = `${name} ${description || ""}`.trim()
        
        // 카테고리 분류 적용 (규칙 기반 + 저장된 매핑 + AI API)
        const aiResult = await classifyWithAI(originalText, amount, transactionNameMappings)
        
        // 기존 카테고리가 있으면 우선 사용, 없으면 분류 결과 사용
        const finalCategory = category || aiResult.category
        const finalName = aiResult.name !== originalText ? aiResult.name : name
        
        transactions.push({
          id: randomUUID(),
          profileId,
          date: normalizedDate,
          datetime: normalizedDatetime,
          type,
          category: finalCategory,
          name: finalName,
          amount: Math.round(amount), // 원 단위로 저장
          description: description || "",
          transactionNumber: transactionNumber || undefined,
          originalText,
          confidence: aiResult.confidence,
          needsReview: aiResult.needsReview || (category === "" && aiResult.category === "기타"),
          userConfirmed: false,
          aiCategory: aiResult.category,
          classificationReason: aiResult.reason || "", // 분류 근거 저장
          sourceFile: fileName,
          sourceCardName: metadata.cardName,
          sourceCardNumber: metadata.cardNumber,
          sourceAccountNumber: metadata.accountNumber,
          // 취소건 정보 (원래 거래와 매칭용)
          isCancelled: isCancelled || originalAmount < 0,
          originalAmount: originalAmount || amount, // 원본 금액 (부호 포함)
          // 중복 체크는 저장 시점에 수행
        })
      } else {
        skippedCount++
        // 디버깅: 왜 스킵되었는지 로그
        if (skippedCount <= 3) {
          console.log("스킵된 행:", { dateStr, name, amount, row: Object.keys(row) })
        }
      }
    }
    
    console.log(`파싱 완료: ${parsedCount}건 성공, ${skippedCount}건 스킵`)
    
    if (transactions.length === 0) {
      console.log("파싱된 거래가 없습니다. 엑셀 파일 구조:", {
        totalRows: jsonData.length,
        firstRowKeys: Object.keys(jsonData[0] || {}),
        firstRowSample: jsonData[0]
      })
    }
    
    return transactions
  } catch (error) {
    console.error("Excel parsing error:", error)
    throw new Error("엑셀 파일 파싱 중 오류가 발생했습니다.")
  }
}


export async function POST(req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    const { profileId } = await params
    const formData = await req.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 })
    }
    
    // 파일 확장자 확인
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls") && !fileName.endsWith(".csv")) {
      return NextResponse.json({ error: "엑셀 파일(.xlsx, .xls) 또는 CSV 파일만 업로드 가능합니다." }, { status: 400 })
    }
    
    // 파일 크기 확인 (100MB 제한)
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > 100) {
      return NextResponse.json({ error: "파일 크기가 너무 큽니다. 최대 100MB까지 지원합니다." }, { status: 400 })
    }
    
    // 저장된 거래명-카테고리 매핑 읽기
    const { promises: fs } = await import("fs")
    const path = await import("path")
    const DATA_DIR = path.join(process.cwd(), "data")
    const STATE_FILE = path.join(DATA_DIR, "state.json")
    let transactionNameMappings: Record<string, string> | undefined = undefined
    
    try {
      const raw = await fs.readFile(STATE_FILE, "utf-8")
      const state = JSON.parse(raw)
      transactionNameMappings = state.transactionNameMappings || {}
    } catch (error) {
      // state.json이 없거나 매핑이 없으면 빈 객체 사용
      transactionNameMappings = {}
    }
    
    // 파일을 버퍼로 읽기
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // 엑셀 파싱 (대용량 파일 지원)
    const transactions = await parseExcelToTransactions(buffer, profileId, file.name, transactionNameMappings)
    
    if (transactions.length === 0) {
      // 더 자세한 에러 메시지 제공
      let errorMessage = "파싱된 거래 내역이 없습니다.\n\n"
      errorMessage += "엑셀 파일에 다음 컬럼이 포함되어 있는지 확인해주세요:\n"
      errorMessage += "- 날짜 (또는 date, 일자, 거래일)\n"
      errorMessage += "- 항목/내용 (또는 name, item)\n"
      errorMessage += "- 금액 (또는 amount)\n\n"
      errorMessage += "서버 로그를 확인하여 자세한 정보를 확인할 수 있습니다."
      
      return NextResponse.json({ 
        error: errorMessage
      }, { status: 400 })
    }
    
    console.log(`파싱 완료: ${transactions.length}건의 거래 내역`)
    
    // 저장 (중복 체크 포함)
    const result = await saveTransactions(profileId, transactions)
    
    let message = `${result.total}건의 거래 내역이 추가되었습니다.`
    if (result.duplicate > 0) {
      message += ` (${result.duplicate}건 중복 제외)`
    }
    if (result.ambiguousCount > 0) {
      message += ` (${result.ambiguousCount}건 확인 필요 - 중복 가능성 있음)`
    }
    
    return NextResponse.json({
      success: true,
      count: result.total,
      duplicate: result.duplicate,
      ambiguous: result.ambiguousCount || 0,
      transactions: result.new,
      ambiguousTransactions: result.ambiguous || [],
      message,
    })
  } catch (error: any) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: error.message || "파일 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

