import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

type Memo = {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  comments?: { id: string; content: string; createdAt: string }[]
}

const DATA_PATH = path.join(process.cwd(), "frontend", "data", "memos.json")

async function loadMemos(): Promise<Memo[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8")
    return JSON.parse(raw)
  } catch (err: any) {
    if (err.code === "ENOENT") return []
    throw err
  }
}

async function saveMemos(memos: Memo[]) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true })
  await fs.writeFile(DATA_PATH, JSON.stringify(memos, null, 2), "utf-8")
}

export async function GET() {
  const memos = await loadMemos()
  return NextResponse.json(memos)
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { content } = body as { content?: string }
  if (!content || !content.trim()) {
    return NextResponse.json({ error: "내용이 비어 있습니다." }, { status: 400 })
  }
  const now = new Date().toISOString()
  const newMemo: Memo = {
    id: crypto.randomUUID(),
    content: content.trim(),
    createdAt: now,
    updatedAt: now,
    comments: [],
  }
  const memos = await loadMemos()
  memos.unshift(newMemo)
  await saveMemos(memos)
  return NextResponse.json(newMemo)
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { id, content } = body as { id?: string; content?: string }
  if (!id) return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 })
  const memos = await loadMemos()
  const idx = memos.findIndex((m) => m.id === id)
  if (idx === -1) return NextResponse.json({ error: "메모를 찾을 수 없습니다." }, { status: 404 })
  if (content !== undefined) memos[idx].content = content
  memos[idx].updatedAt = new Date().toISOString()
  await saveMemos(memos)
  return NextResponse.json(memos[idx])
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 })
  const memos = await loadMemos()
  const next = memos.filter((m) => m.id !== id)
  await saveMemos(next)
  return NextResponse.json({ success: true })
}

