import { NextResponse } from "next/server"
import { saveIncomes, getIncomes } from "@/lib/state"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(_: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params
  const incomes = await getIncomes(profileId)
  return NextResponse.json(incomes)
}

export async function POST(req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params
  const body = await req.json()
  const mapped = (body ?? []).map((i: any) => ({
    id: i.id || randomUUID(),
    profileId: profileId,
    name: i.name,
    amount: Number(i.amount) || 0,
    payDay: i.payDay !== undefined && i.payDay !== null ? Number(i.payDay) : null,
  }))
  const saved = await saveIncomes(profileId, mapped)
  return NextResponse.json(saved)
}


