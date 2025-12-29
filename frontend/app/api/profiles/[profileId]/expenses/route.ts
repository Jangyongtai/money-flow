import { NextResponse } from "next/server"
import { saveExpenses, getExpenses } from "@/lib/state"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(_: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params
  const expenses = await getExpenses(profileId)
  return NextResponse.json(expenses)
}

export async function POST(req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params
  const body = await req.json()
  const mapped = (body ?? []).map((e: any) => ({
    id: e.id || randomUUID(),
    profileId: profileId,
    category: e.category,
    name: e.name,
    amount: Number(e.amount) || 0,
    billingDay: e.billingDay !== undefined && e.billingDay !== null ? Number(e.billingDay) : null,
  }))
  const saved = await saveExpenses(profileId, mapped)
  return NextResponse.json(saved)
}


