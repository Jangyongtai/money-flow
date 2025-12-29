import { NextResponse } from "next/server"
import { saveTransactions } from "@/lib/state"
import * as XLSX from "xlsx"

// parseExcelToTransactions를 동적 import
async function parseExcelFile(
  buffer: Buffer, 
  profileId: string, 
  fileName: string,
  transactionNameMappings?: Record<string, string>
): Promise<any[]> {
  const uploadModule = await import("../upload/route")
  return uploadModule.parseExcelToTransactions(buffer, profileId, fileName, transactionNameMappings)
}

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// 여러 엑셀 파일을 파싱하여 날짜순으로 정렬된 Transaction 배열로 변환
async function parseMultipleExcelFiles(
  files: File[], 
  profileId: string,
  transactionNameMappings?: Record<string, string>
): Promise<any[]> {
  const allTransactions: any[] = []
  
  for (const file of files) {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      // 파일명을 전달하여 엑셀 내부에서 메타데이터 추출
      const transactions = await parseExcelFile(buffer, profileId, file.name, transactionNameMappings)
      // sourceFile은 이미 parseExcelToTransactions에서 설정됨
      allTransactions.push(...transactions)
    } catch (error) {
      console.error(`파일 ${file.name} 파싱 오류:`, error)
      // 개별 파일 오류는 무시하고 계속 진행
    }
  }
  
  // 날짜순으로 정렬 (datetime 우선, 없으면 date 사용)
  allTransactions.sort((a, b) => {
    const dateA = a.datetime ? a.datetime : `${a.date} 00:00:00`
    const dateB = b.datetime ? b.datetime : `${b.date} 00:00:00`
    return dateA.localeCompare(dateB)
  })
  
  return allTransactions
}

export async function POST(req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    const { profileId } = await params
    const formData = await req.formData()
    const files = formData.getAll("files") as File[]
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 })
    }
    
    // 저장된 거래명-카테고리 매핑 읽기
    const { promises: fs } = await import("fs")
    const pathModule = await import("path")
    const DATA_DIR = pathModule.join(process.cwd(), "data")
    const STATE_FILE = pathModule.join(DATA_DIR, "state.json")
    let transactionNameMappings: Record<string, string> | undefined = undefined
    
    try {
      const raw = await fs.readFile(STATE_FILE, "utf-8")
      const state = JSON.parse(raw)
      transactionNameMappings = state.transactionNameMappings || {}
    } catch (error) {
      // state.json이 없거나 매핑이 없으면 빈 객체 사용
      transactionNameMappings = {}
    }
    
    // 파일 확장자 확인
    const invalidFiles: string[] = []
    let totalSize = 0
    
    for (const file of files) {
      const fileName = file.name.toLowerCase()
      if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls") && !fileName.endsWith(".csv")) {
        invalidFiles.push(file.name)
      }
      totalSize += file.size
    }
    
    if (invalidFiles.length > 0) {
      return NextResponse.json(
        { error: `다음 파일은 지원하지 않습니다: ${invalidFiles.join(", ")}` },
        { status: 400 }
      )
    }
    
    // 전체 파일 크기 확인 (100MB 제한)
    const totalSizeMB = totalSize / (1024 * 1024)
    if (totalSizeMB > 100) {
      return NextResponse.json(
        { error: `전체 파일 크기가 너무 큽니다. 최대 100MB까지 지원합니다. (현재: ${totalSizeMB.toFixed(2)}MB)` },
        { status: 400 }
      )
    }
    
    console.log(`${files.length}개 파일 파싱 시작...`)
    
    // 모든 파일 파싱 및 날짜순 정렬
    const allTransactions = await parseMultipleExcelFiles(files, profileId, transactionNameMappings)
    
    if (allTransactions.length === 0) {
      let errorMessage = "모든 파일에서 파싱된 거래 내역이 없습니다.\n\n"
      errorMessage += "엑셀 파일에 다음 컬럼이 포함되어 있는지 확인해주세요:\n"
      errorMessage += "- 날짜 (또는 date, 일자, 거래일)\n"
      errorMessage += "- 항목/내용 (또는 name, item)\n"
      errorMessage += "- 금액 (또는 amount)\n\n"
      errorMessage += "서버 로그를 확인하여 자세한 정보를 확인할 수 있습니다."
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }
    
    console.log(`총 ${allTransactions.length}건의 거래 내역 파싱 완료 (날짜순 정렬됨)`)
    
    // 저장 (중복 체크 포함, 날짜순으로 이미 정렬되어 있음)
    const result = await saveTransactions(profileId, allTransactions)
    
    let message = `${files.length}개 파일에서 ${result.total}건의 거래 내역이 날짜순으로 추가되었습니다.`
    if (result.duplicate > 0) {
      message += ` (${result.duplicate}건 중복 제외)`
    }
    if (result.ambiguousCount > 0) {
      message += ` (${result.ambiguousCount}건 확인 필요 - 중복 가능성 있음)`
    }
    
    return NextResponse.json({
      success: true,
      count: result.total,
      duplicate: result.duplicate,
      ambiguous: result.ambiguousCount || 0,
      transactions: result.new,
      ambiguousTransactions: result.ambiguous || [],
      message,
    })
  } catch (error: any) {
    console.error("Multiple upload error:", error)
    return NextResponse.json(
      { error: error.message || "파일 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

