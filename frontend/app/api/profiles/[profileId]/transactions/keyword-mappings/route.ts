import { NextResponse } from "next/server"
import { getAllKeywordCategoryMappings, saveKeywordCategoryMapping, deleteKeywordCategoryMapping } from "@/lib/state"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// GET: 모든 키워드 매핑 조회
export async function GET(req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    const { profileId } = await params
    const mappings = await getAllKeywordCategoryMappings()
    
    return NextResponse.json({ 
      success: true,
      mappings,
      count: Object.keys(mappings).length
    })
  } catch (error: any) {
    console.error("Get keyword mappings error:", error)
    return NextResponse.json(
      { error: error.message || "키워드 매핑 조회 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

// POST: 키워드 매핑 추가
export async function POST(req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    const { profileId } = await params
    const body = await req.json()
    const { keyword, category } = body
    
    if (!keyword || !category) {
      return NextResponse.json(
        { error: "키워드와 카테고리가 필요합니다." },
        { status: 400 }
      )
    }
    
    await saveKeywordCategoryMapping(keyword, category)
    
    return NextResponse.json({ 
      success: true, 
      message: `키워드 매핑이 추가되었습니다: "${keyword}" -> "${category}"` 
    })
  } catch (error: any) {
    console.error("Save keyword mapping error:", error)
    return NextResponse.json(
      { error: error.message || "키워드 매핑 저장 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

// DELETE: 키워드 매핑 삭제
export async function DELETE(req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    const { profileId } = await params
    const body = await req.json()
    const { keyword } = body
    
    if (!keyword) {
      return NextResponse.json(
        { error: "키워드가 필요합니다." },
        { status: 400 }
      )
    }
    
    await deleteKeywordCategoryMapping(keyword)
    
    return NextResponse.json({ 
      success: true, 
      message: `키워드 매핑이 삭제되었습니다: "${keyword}"` 
    })
  } catch (error: any) {
    console.error("Delete keyword mapping error:", error)
    return NextResponse.json(
      { error: error.message || "키워드 매핑 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

