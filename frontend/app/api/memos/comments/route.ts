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

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { memoId, content } = body as { memoId?: string; content?: string }
  if (!memoId || !content || !content.trim()) {
    return NextResponse.json({ error: "memoId와 content가 필요합니다." }, { status: 400 })
  }
  const memos = await loadMemos()
  const idx = memos.findIndex((m) => m.id === memoId)
  if (idx === -1) return NextResponse.json({ error: "메모를 찾을 수 없습니다." }, { status: 404 })
  const newComment = {
    id: crypto.randomUUID(),
    content: content.trim(),
    createdAt: new Date().toISOString(),
  }
  if (!memos[idx].comments) memos[idx].comments = []
  memos[idx].comments!.push(newComment)
  memos[idx].updatedAt = new Date().toISOString()
  await saveMemos(memos)
  return NextResponse.json(newComment)
}

