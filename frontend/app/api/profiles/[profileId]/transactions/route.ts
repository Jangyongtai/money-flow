import { NextResponse } from "next/server"
import { getTransactions, deleteTransaction } from "@/lib/state"
import { promises as fs } from "fs"
import path from "path"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const DATA_DIR = path.join(process.cwd(), "data")
const STATE_FILE = path.join(DATA_DIR, "state.json")

export async function GET(req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    const { profileId } = await params
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get("startDate") || undefined
    const endDate = searchParams.get("endDate") || undefined
    const type = (searchParams.get("type") as "INCOME" | "EXPENSE") || undefined
    
    const transactions = await getTransactions(profileId, {
      startDate,
      endDate,
      type,
    })
    
    return NextResponse.json(transactions)
  } catch (error: any) {
    console.error("Get transactions error:", error)
    return NextResponse.json(
      { error: error.message || "거래 내역 조회 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    const { profileId } = await params
    const body = await req.json()
    const { id, updateAllWithSameName, ...updates } = body
    
    if (!id) {
      return NextResponse.json({ error: "거래 ID가 필요합니다." }, { status: 400 })
    }
    
    // state.json 파일 읽기
    const raw = await fs.readFile(STATE_FILE, "utf-8")
    const state = JSON.parse(raw)
    
    // 거래 내역 찾기
    const transactionIndex = state.transactions.findIndex(
      (t: any) => t.id === id && t.profileId === profileId
    )
    
    if (transactionIndex === -1) {
      return NextResponse.json({ error: "거래 내역을 찾을 수 없습니다." }, { status: 404 })
    }
    
    const targetTransaction = state.transactions[transactionIndex]
    const updatedTransactions: any[] = []
    
    // 같은 이름의 거래를 모두 업데이트할지 결정
    if (updateAllWithSameName && updates.category) {
      const normalizedTargetName = targetTransaction.name.trim().toLowerCase()
      
      // 같은 이름의 모든 거래 찾기
      state.transactions.forEach((t: any, index: number) => {
        if (t.profileId === profileId && t.name.trim().toLowerCase() === normalizedTargetName) {
          state.transactions[index] = {
            ...t,
            ...updates,
            userConfirmed: true,
            needsReview: false,
          }
          updatedTransactions.push(state.transactions[index])
        }
      })
      
      console.log(`같은 이름의 거래 ${updatedTransactions.length}건 업데이트: "${targetTransaction.name}" -> "${updates.category}"`)
    } else {
      // 단일 거래만 업데이트
      state.transactions[transactionIndex] = {
        ...targetTransaction,
        ...updates,
      }
      updatedTransactions.push(state.transactions[transactionIndex])
    }
    
    // 카테고리가 변경되었고, 사용자가 확인한 경우 거래명-카테고리 매핑 저장
    if (updates.category && (updates.userConfirmed || updateAllWithSameName)) {
      if (!state.transactionNameMappings) {
        state.transactionNameMappings = {}
      }
      // 거래명을 정규화하여 저장 (공백 제거, 소문자 변환)
      const normalizedName = targetTransaction.name.trim().toLowerCase()
      state.transactionNameMappings[normalizedName] = updates.category
      console.log(`거래명-카테고리 매핑 저장: "${targetTransaction.name}" -> "${updates.category}"`)
    }
    
    // 저장
    await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf-8")
    
    return NextResponse.json({ 
      success: true, 
      transaction: updatedTransactions[0],
      updatedCount: updatedTransactions.length 
    })
  } catch (error: any) {
    console.error("Update transaction error:", error)
    return NextResponse.json(
      { error: error.message || "거래 내역 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    const { profileId } = await params
    const body = await req.json()
    const transactionId = body.id
    
    if (!transactionId) {
      return NextResponse.json({ error: "거래 ID가 필요합니다." }, { status: 400 })
    }
    
    await deleteTransaction(profileId, transactionId)
    
    return NextResponse.json({ success: true, message: "거래 내역이 삭제되었습니다." })
  } catch (error: any) {
    console.error("Delete transaction error:", error)
    return NextResponse.json(
      { error: error.message || "거래 내역 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

