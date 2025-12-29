import { NextResponse } from "next/server"
import { saveAssets, getAssets } from "@/lib/state"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(_: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params
  const assets = await getAssets(profileId)
  return NextResponse.json(assets)
}

export async function POST(req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params
  const body = await req.json()
  const mapped = (body ?? []).map((a: any) => ({
    id: a.id || randomUUID(),
    profileId: profileId,
    type: a.type,
    name: a.name,
    balance: Number(a.balance) || 0,
    monthlyIncome: a.monthlyIncome !== undefined && a.monthlyIncome !== null ? Number(a.monthlyIncome) : null,
  }))
  const saved = await saveAssets(profileId, mapped)
  return NextResponse.json(saved)
}


