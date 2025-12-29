import { NextResponse } from "next/server"
import { getTransactions } from "@/lib/state"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// 거래 데이터에서 카드사/은행사 이름 추출 (엑셀에서 파싱된 정보 우선)
function extractCardName(fileName: string, transactions: any[]): string {
  // 먼저 거래 데이터에서 파싱된 카드사 이름 확인
  for (const txn of transactions) {
    if (txn.sourceCardName) {
      return txn.sourceCardName
    }
  }
  
  // 없으면 파일명에서 추출 (fallback)
  const lowerName = fileName.toLowerCase()
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
    "국민": "KB국민은행", "kb은행": "KB국민은행",
    "신한은행": "신한은행", "우리은행": "우리은행",
    "하나은행": "하나은행", "nh은행": "NH농협은행", "농협은행": "NH농협은행",
  }
  
  for (const [keyword, cardName] of Object.entries(cardKeywords)) {
    if (lowerName.includes(keyword)) {
      return cardName
    }
  }
  
  return fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ")
}

// 거래 데이터에서 카드번호 뒷4자리 추출 (엑셀에서 파싱된 정보 우선)
function extractCardNumber(fileName: string, transactions: any[]): string | null {
  // 먼저 거래 데이터에서 파싱된 카드번호 확인
  for (const txn of transactions) {
    if (txn.sourceCardNumber) {
      return txn.sourceCardNumber
    }
  }
  
  // 없으면 파일명이나 거래번호에서 추출 (fallback)
  const fileNameMatch = fileName.match(/(\d{4})/)
  if (fileNameMatch) {
    return fileNameMatch[1]
  }
  
  for (const txn of transactions) {
    if (txn.transactionNumber) {
      const match = txn.transactionNumber.match(/(\d{4})$/)
      if (match) {
        return match[1]
      }
    }
  }
  
  return null
}

export async function GET(req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    const { profileId } = await params
    const transactions = await getTransactions(profileId)
    
    // sourceFile별로 그룹화
    const fileGroups = new Map<string, any[]>()
    
    for (const txn of transactions) {
      const sourceFile = txn.sourceFile || "알 수 없음"
      if (!fileGroups.has(sourceFile)) {
        fileGroups.set(sourceFile, [])
      }
      fileGroups.get(sourceFile)!.push(txn)
    }
    
    // 각 파일별 정보 추출
    const sources = Array.from(fileGroups.entries()).map(([fileName, txns]) => {
      const dates = txns.map((t: any) => t.date).filter(Boolean).sort()
      const minDate = dates.length > 0 ? dates[0] : ""
      const maxDate = dates.length > 0 ? dates[dates.length - 1] : ""
      
      const cardName = extractCardName(fileName, txns)
      const cardNumber = extractCardNumber(fileName, txns)
      
      return {
        fileName,
        cardName,
        cardNumber,
        dateRange: {
          start: minDate || "",
          end: maxDate || "",
        },
        transactionCount: txns.length,
      }
    })
    
    return NextResponse.json(sources)
  } catch (error: any) {
    console.error("Get sources error:", error)
    return NextResponse.json(
      { error: error.message || "데이터 출처 조회 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

