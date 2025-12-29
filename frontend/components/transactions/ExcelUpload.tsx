"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, CheckCircle2, AlertCircle } from "lucide-react"
import { uploadMultipleTransactions } from "@/lib/api"

interface ExcelUploadProps {
  profileId: string
  onUploadSuccess?: () => void
}

export default function ExcelUpload({ profileId, onUploadSuccess }: ExcelUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; count?: number; duplicate?: number; ambiguous?: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    
    // 모든 파일 확장자 확인
    const invalidFiles: string[] = []
    for (let i = 0; i < fileArray.length; i++) {
      const fileName = fileArray[i].name.toLowerCase()
      if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls") && !fileName.endsWith(".csv")) {
        invalidFiles.push(fileArray[i].name)
      }
    }

    if (invalidFiles.length > 0) {
      setResult({
        success: false,
        message: `다음 파일은 지원하지 않습니다: ${invalidFiles.join(", ")}`,
      })
      return
    }

    setUploading(true)
    setResult(null)

    try {
      // 여러 파일을 한 번에 업로드
      const response = await uploadMultipleTransactions(profileId, fileArray)
      // 업로드 결과를 간단하게 표시
      setResult({
        success: true,
        message: `${response.count || 0}건의 거래 내역이 추가되었습니다.`,
        count: response.count,
        duplicate: response.duplicate || 0,
        ambiguous: response.ambiguous || 0,
      })
      
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      
      // 성공 콜백 호출 (거래 내역 목록 새로고침)
      if (onUploadSuccess) {
        // 거래 내역 목록을 새로고침하기 전에 사용자가 결과를 확인할 수 있도록 약간의 지연
        setTimeout(() => {
          onUploadSuccess()
        }, 1500)
      }
    } catch (error: any) {
      console.error("Excel upload error:", error)
      setResult({
        success: false,
        message: error.message || error.toString() || "파일 업로드 중 오류가 발생했습니다.",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    await processFiles(files)
  }

  // 드래그 앤 드롭 이벤트 핸들러
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (uploading) return

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      await processFiles(files)
    }
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div
            ref={dropZoneRef}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              flex-1 border-2 border-dashed rounded-lg p-6 min-h-24 text-center transition-all cursor-pointer
              flex items-center justify-center
              ${isDragging 
                ? "border-blue-500 bg-blue-50" 
                : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
              }
              ${uploading ? "opacity-50 cursor-not-allowed" : ""}
            `}
            onClick={!uploading ? handleClick : undefined}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            <div className="flex items-center justify-center gap-2">
              <Upload className={`w-5 h-5 transition-colors ${isDragging ? "text-blue-500" : "text-gray-400"}`} />
              <p className={`text-sm font-medium ${isDragging ? "text-blue-600" : "text-gray-600"}`}>
                {isDragging 
                  ? "여기에 파일을 놓으세요" 
                  : uploading
                  ? "처리 중..."
                  : "엑셀 파일을 드래그하거나 클릭하여 선택"
                }
              </p>
            </div>
          </div>
          <Button
            onClick={handleClick}
            disabled={uploading}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 shrink-0"
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                처리 중
              </span>
            ) : (
              "파일 선택"
            )}
          </Button>
        </div>

        {result && (
          <div
            className={`p-4 rounded-lg flex items-start gap-3 ${
              result.success
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            {result.success ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div
                className={`text-sm font-medium ${
                  result.success ? "text-green-800" : "text-red-800"
                }`}
              >
                {result.message}
              </div>
              {result.success && result.count !== undefined && (
                <div className="text-xs text-gray-600 mt-1">
                  {result.duplicate !== undefined && result.duplicate > 0 && (
                    <span className="text-amber-600 mr-2">
                      중복 {result.duplicate}건 제외
                    </span>
                  )}
                  {result.ambiguous !== undefined && result.ambiguous > 0 && (
                    <span className="text-orange-600">
                      확인 필요 {result.ambiguous}건
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  )
}

