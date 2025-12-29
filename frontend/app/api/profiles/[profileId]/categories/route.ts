import { NextResponse } from "next/server"
import { getCategories, createCategory, updateCategory, deleteCategory } from "@/lib/state"
import { promises as fs } from "fs"
import path from "path"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const DATA_DIR = path.join(process.cwd(), "data")
const STATE_FILE = path.join(DATA_DIR, "state.json")

// GET: 카테고리 목록 조회
export async function GET(req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    const { profileId } = await params
    const categories = await getCategories(profileId)
    
    return NextResponse.json({ 
      success: true,
      categories,
      count: categories.length
    })
  } catch (error: any) {
    console.error("Get categories error:", error)
    return NextResponse.json(
      { error: error.message || "카테고리 조회 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

// POST: 새 카테고리 생성
export async function POST(req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    const { profileId } = await params
    const body = await req.json()
    const { name, color, icon, parentId, keywords } = body
    
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "카테고리 이름이 필요합니다." },
        { status: 400 }
      )
    }
    
    const category = await createCategory(profileId, {
      name,
      color,
      icon,
      parentId,
      keywords,
    })
    
    return NextResponse.json({ 
      success: true,
      category
    })
  } catch (error: any) {
    console.error("Create category error:", error)
    return NextResponse.json(
      { error: error.message || "카테고리 생성 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

// PUT: 카테고리 수정
export async function PUT(req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    const { profileId } = await params
    const body = await req.json()
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json(
        { error: "카테고리 ID가 필요합니다." },
        { status: 400 }
      )
    }
    
    const category = await updateCategory(profileId, id, updates)
    
    return NextResponse.json({ 
      success: true,
      category
    })
  } catch (error: any) {
    console.error("Update category error:", error)
    return NextResponse.json(
      { error: error.message || "카테고리 수정 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

// DELETE: 카테고리 삭제
export async function DELETE(req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    const { profileId } = await params
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    
    if (!id) {
      return NextResponse.json(
        { error: "카테고리 ID가 필요합니다." },
        { status: 400 }
      )
    }
    
    await deleteCategory(profileId, id)
    
    return NextResponse.json({ 
      success: true,
      message: "카테고리가 삭제되었습니다."
    })
  } catch (error: any) {
    console.error("Delete category error:", error)
    return NextResponse.json(
      { error: error.message || "카테고리 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

