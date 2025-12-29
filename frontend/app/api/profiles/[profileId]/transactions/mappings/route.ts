import { NextResponse } from "next/server"
import { deleteTransactionNameMappings, getTransactionNameMappings } from "@/lib/state"
import { promises as fs } from "fs"
import path from "path"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const DATA_DIR = path.join(process.cwd(), "data")
const STATE_FILE = path.join(DATA_DIR, "state.json")

// GET: 사용자 매핑 조회
export async function GET(req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    const { profileId } = await params
    const mappings = await getTransactionNameMappings(profileId)
    
    return NextResponse.json({ 
      success: true,
      mappings,
      count: Object.keys(mappings).length
    })
  } catch (error: any) {
    console.error("Get mappings error:", error)
    return NextResponse.json(
      { error: error.message || "매핑 조회 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

// DELETE: 사용자 매핑 삭제
export async function DELETE(req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    const { profileId } = await params
    await deleteTransactionNameMappings(profileId)
    
    return NextResponse.json({ 
      success: true, 
      message: "모든 사용자 매핑이 삭제되었습니다." 
    })
  } catch (error: any) {
    console.error("Delete mappings error:", error)
    return NextResponse.json(
      { error: error.message || "매핑 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

