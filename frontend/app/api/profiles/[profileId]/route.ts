import { NextResponse } from "next/server"
import { getProfile, upsertProfile, createProfile } from "@/lib/state"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(_: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params
  const existing = await getProfile(profileId)
  if (existing) return NextResponse.json(existing)
  const created = await createProfile("내 지갑", "PERSONAL")
  return NextResponse.json(created)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params
  const existing = await getProfile(profileId)
  if (!existing) return NextResponse.json({ message: "Profile not found" }, { status: 404 })
  const body = await req.json()
  const updated = { ...existing, ...body }
  await upsertProfile(updated)
  return NextResponse.json(updated)
}


