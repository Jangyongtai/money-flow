import { NextResponse } from "next/server"
import {
  getTransactions,
  getTransactionNameMappings,
  getAllKeywordCategoryMappings,
  getMerchantCategoryMapping,
  replaceTransactions,
  Transaction,
} from "@/lib/state"

type Scope = "needsReview" | "lowConfidence" | "all"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// 간단한 재분류 로직 (개인 매핑 → 키워드 매핑 → 전역 매핑 → 기타)
function classifyLocal(
  text: string,
  amount: number,
  opts: {
    transactionNameMappings: Record<string, string>
    keywordMappings: Record<string, string>
    merchantLookup: (name: string) => Promise<string | null>
  }
) {
  const lowerText = text.toLowerCase().trim()

  // 1) 개인 거래명 매핑
  if (opts.transactionNameMappings[lowerText]) {
    return {
      category: opts.transactionNameMappings[lowerText],
      confidence: 0.95,
      needsReview: false,
      reason: "개인 매핑 적용",
    }
  }

  // 2) 키워드 매핑
  for (const [keyword, category] of Object.entries(opts.keywordMappings)) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return {
        category,
        confidence: 0.9,
        needsReview: false,
        reason: `키워드 매핑 (${keyword})`,
      }
    }
  }

  // 3) 전역 가맹점 매핑
  return opts.merchantLookup(text).then((mapped) => {
    if (mapped) {
      return {
        category: mapped,
        confidence: 0.85,
        needsReview: false,
        reason: "전역 매핑 적용",
      }
    }

    // 4) 기타
    const isLarge = amount > 1_000_000
    return {
      category: "기타",
      confidence: isLarge ? 0.3 : 0.5,
      needsReview: true,
      reason: isLarge ? "큰 금액 기타 - 검토 필요" : "매핑 없음",
    }
  })
}

export async function POST(req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    const { profileId } = await params
    const body = await req.json().catch(() => ({}))
    const scope: Scope = ["needsReview", "lowConfidence", "all"].includes(body.scope)
      ? body.scope
      : "needsReview"
    const threshold: number = typeof body.confidenceThreshold === "number" ? body.confidenceThreshold : 0.7

    const [transactions, transactionNameMappings, keywordMappings] = await Promise.all([
      getTransactions(profileId),
      getTransactionNameMappings(profileId),
      getAllKeywordCategoryMappings(),
    ])

    const merchantLookup = (name: string) => getMerchantCategoryMapping(name, profileId)

    const targets = transactions.filter((t: Transaction) => {
      // 사용자가 확정한 건은 건드리지 않음
      if (t.userConfirmed) return false
      // 기타로 분류된 항목만 재검증 대상
      if ((t.category || "") !== "기타") return false

      if (scope === "needsReview") {
        return t.needsReview === true
      }
      if (scope === "lowConfidence") {
        return (t.confidence ?? 1) < threshold
      }
      // all
      return true
    })

    let updatedCount = 0

    const updated = await Promise.all(
      transactions.map(async (t: Transaction) => {
        if (!targets.includes(t)) return t

        const result = await classifyLocal(t.name, t.amount, {
          transactionNameMappings,
          keywordMappings,
          merchantLookup,
        })

        const next = {
          ...t,
          category: result.category,
          aiCategory: result.category,
          confidence: result.confidence,
          needsReview: result.needsReview,
          classificationReason: result.reason,
        }

        // 변경이 있을 때만 카운트
        if (next.category !== t.category) {
          updatedCount += 1
        }

        return next
      })
    )

    await replaceTransactions(profileId, updated)

    return NextResponse.json({
      success: true,
      scope,
      total: targets.length,
      updated: updatedCount,
    })
  } catch (error: any) {
    console.error("Reclassify error:", error)
    return NextResponse.json(
      { error: error.message || "재검증 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

