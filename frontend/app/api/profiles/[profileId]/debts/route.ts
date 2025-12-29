import { NextResponse } from "next/server"
import { saveDebts, getDebts } from "@/lib/state"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(_: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params
  const debts = await getDebts(profileId)
  return NextResponse.json(debts)
}

export async function POST(req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params
  const body = await req.json()
  const mapped = (body ?? []).map((d: any) => ({
    id: d.id || randomUUID(),
    profileId: profileId,
    type: d.type,
    name: d.name,
    amount: Number(d.amount) || 0,
    interestRate: d.interestRate !== undefined && d.interestRate !== null ? Number(d.interestRate) : null,
    paymentAmount: d.paymentAmount !== undefined && d.paymentAmount !== null ? Number(d.paymentAmount) : null,
    paymentDay: d.paymentDay !== undefined && d.paymentDay !== null ? Number(d.paymentDay) : null,
  }))
  const saved = await saveDebts(profileId, mapped)
  return NextResponse.json(saved)
}


