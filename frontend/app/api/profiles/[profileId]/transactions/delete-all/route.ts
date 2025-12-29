import { NextResponse } from "next/server"
import { deleteAllTransactions } from "@/lib/state"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function DELETE(req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    const { profileId } = await params
    await deleteAllTransactions(profileId)
    
    return NextResponse.json({ 
      success: true, 
      message: "모든 거래 내역이 삭제되었습니다." 
    })
  } catch (error: any) {
    console.error("Delete all transactions error:", error)
    return NextResponse.json(
      { error: error.message || "거래 내역 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

