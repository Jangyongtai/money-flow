import { NextResponse } from "next/server"
import { listProfiles, createProfile } from "@/lib/state"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const profiles = await listProfiles()
  if (!profiles || profiles.length === 0) {
    const created = await createProfile("내 지갑", "PERSONAL")
    return NextResponse.json([created])
  }
  return NextResponse.json(profiles)
}

export async function POST(req: Request) {
  const body = await req.json()
  const name = body?.name || "내 지갑"
  const type = body?.type || "PERSONAL"
  const profile = await createProfile(name, type, body?.businessNumber)
  return NextResponse.json(profile)
}


