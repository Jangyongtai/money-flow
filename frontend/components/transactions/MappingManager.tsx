"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getKeywordCategoryMappings, saveKeywordCategoryMapping, deleteKeywordCategoryMapping, getTransactionNameMappings, getMerchantCategoryMappings, updateMerchantCategoryMapping, deleteMerchantCategoryMapping, updateTransactionNameMapping, deleteTransactionNameMapping, getCategories, createCategory, updateCategory, deleteCategory } from "@/lib/api"
import { CATEGORIES } from "@/lib/categories"
import { Trash2, Plus, Settings, Edit2, X, Eye, Tag } from "lucide-react"

interface MappingManagerProps {
  profileId: string
}

export default function MappingManager({ profileId }: MappingManagerProps) {
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [newKeyword, setNewKeyword] = useState("")
  const [newCategory, setNewCategory] = useState("식비")
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingKeyword, setEditingKeyword] = useState<string | null>(null)
  const [editKeyword, setEditKeyword] = useState("")
  const [editCategory, setEditCategory] = useState("식비")
  const [showAllMappings, setShowAllMappings] = useState(false)
  const [allMappings, setAllMappings] = useState<{
    keywordMappings: Record<string, string>
    transactionMappings: Record<string, string>
  }>({ keywordMappings: {}, transactionMappings: {} })
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [categoryNames, setCategoryNames] = useState<string[]>(CATEGORIES) // 기본 + 사용자 정의 카테고리 이름 목록
  const [editingCategory, setEditingCategory] = useState<any | null>(null)
  const [newCategoryName, setNewCategoryName] = useState("")

  useEffect(() => {
    loadMappings()
    loadCategories()
  }, [profileId])

  const loadCategories = async () => {
    try {
      const data = await getCategories(profileId)
      // getCategories는 { categories, categoryNames, count } 형태를 반환
      if (data && typeof data === 'object' && 'categoryNames' in data) {
        setCategories(data.categories || [])
        const mergedNames = Array.from(new Set([...(data.categoryNames || []), ...CATEGORIES]))
        setCategoryNames(mergedNames)
      } else {
        // 이전 버전 호환성 (배열로 반환되는 경우)
        const arr = Array.isArray(data) ? data : []
        setCategories(arr)
        const customNames = arr.map((c: any) => c.name).filter(Boolean)
        const mergedNames = Array.from(new Set([...CATEGORIES, ...customNames]))
        setCategoryNames(mergedNames)
      }
    } catch (error) {
      console.error("카테고리 로드 실패:", error)
      setCategoryNames(CATEGORIES) // 기본 카테고리 사용
    }
  }

  const loadMappings = async () => {
    try {
      const data = await getKeywordCategoryMappings(profileId)
      setMappings(data || {})
    } catch (error) {
      console.error("매핑 로드 실패:", error)
    }
  }

  const handleAdd = async () => {
    const trimmedKeyword = newKeyword.trim()
    
    if (!trimmedKeyword) {
      alert("키워드를 입력해주세요.")
      return
    }

    // 중복 체크 (대소문자 무시)
    const normalizedKeyword = trimmedKeyword.toLowerCase()
    const existingKeyword = Object.keys(mappings).find(
      k => k.toLowerCase() === normalizedKeyword
    )
    
    if (existingKeyword) {
      const existingCategory = mappings[existingKeyword]
      alert(`이미 등록된 키워드입니다.\n\n"${existingKeyword}" → "${existingCategory}"\n\n수정하려면 목록에서 수정 버튼을 클릭하세요.`)
      return
    }

    setLoading(true)
    try {
      await saveKeywordCategoryMapping(profileId, trimmedKeyword, newCategory)
      setNewKeyword("")
      setNewCategory("식비")
      setShowAddModal(false)
      await loadMappings()
      alert(`✅ 키워드 매핑이 등록되었습니다.\n\n"${trimmedKeyword}" → "${newCategory}"`)
    } catch (error) {
      console.error("매핑 추가 실패:", error)
      alert("매핑 추가에 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const openAddWindow = () => {
    const apiBase = typeof window !== "undefined" ? window.location.origin : ""
    const newWin = window.open("", "_blank", "width=520,height=620")

    // 팝업 차단 시 모달로 대체
    if (!newWin) {
      setShowAddModal(true)
      return
    }

    const categoryOptions = categoryNames
      .map((cat) => `<option value="${cat}">${cat}</option>`)
      .join("")

    const styles = `
      body { font-family: Arial, sans-serif; padding: 16px; background: #f9fafb; }
      h1 { margin-bottom: 16px; font-size: 18px; }
      label { display: block; margin-bottom: 8px; font-weight: 600; color: #1f2937; }
      input, select { width: 100%; padding: 10px; margin-bottom: 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; }
      button { padding: 10px 12px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
      .primary { background: #2563eb; color: #fff; }
      .ghost { background: #f3f4f6; color: #374151; margin-left: 8px; }
      .actions { display: flex; justify-content: flex-end; }
      .message { margin-top: 8px; font-size: 13px; color: #6b7280; }
    `

    newWin.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>키워드 매핑 추가</title>
          <style>${styles}</style>
        </head>
        <body>
          <h1>키워드 매핑 추가</h1>
          <form id="addForm">
            <label for="keyword">키워드</label>
            <input id="keyword" type="text" placeholder="예: 주유소, 편의점, 카페" autofocus />
            
            <label for="category">카테고리</label>
            <select id="category">${categoryOptions}</select>
            
            <div class="actions">
              <button type="button" class="ghost" id="cancelBtn">닫기</button>
              <button type="submit" class="primary" id="saveBtn">저장</button>
            </div>
            <div class="message" id="message"></div>
          </form>
          <script>
            const form = document.getElementById('addForm');
            const message = document.getElementById('message');
            const keywordInput = document.getElementById('keyword');
            const categorySelect = document.getElementById('category');
            const cancelBtn = document.getElementById('cancelBtn');

            cancelBtn.addEventListener('click', () => window.close());

            form.addEventListener('submit', async (e) => {
              e.preventDefault();
              const keyword = keywordInput.value.trim();
              const category = categorySelect.value;
              if (!keyword) {
                message.textContent = '키워드를 입력해주세요.';
                message.style.color = '#ef4444';
                return;
              }
              message.textContent = '저장 중...';
              message.style.color = '#6b7280';
              try {
                const res = await fetch('${apiBase}/api/profiles/${profileId}/transactions/keyword-mappings', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ keyword, category }),
                });
                if (!res.ok) {
                  const err = await res.json().catch(() => ({ error: '저장에 실패했습니다.' }));
                  throw new Error(err.error || '저장에 실패했습니다.');
                }
                message.textContent = '✅ 저장되었습니다. 계속 추가할 수 있습니다.';
                message.style.color = '#16a34a';
                keywordInput.value = '';
                keywordInput.focus();
              } catch (error) {
                message.textContent = error.message || '저장 중 오류가 발생했습니다.';
                message.style.color = '#ef4444';
              }
            });
          </script>
        </body>
      </html>
    `)

    newWin.document.close()
  }

  const handleDelete = async (keyword: string) => {
    if (!confirm(`"${keyword}" 매핑을 삭제하시겠습니까?`)) {
      return
    }

    try {
      await deleteKeywordCategoryMapping(profileId, keyword)
      await loadMappings()
    } catch (error) {
      console.error("매핑 삭제 실패:", error)
      alert("매핑 삭제에 실패했습니다.")
    }
  }

  const handleEdit = (keyword: string) => {
    setEditingKeyword(keyword)
    setEditKeyword(keyword)
    setEditCategory(mappings[keyword] || "식비")
  }

  const handleSaveEdit = async () => {
    if (!editingKeyword || !editKeyword.trim()) {
      alert("키워드를 입력해주세요.")
      return
    }

    const trimmedEditKeyword = editKeyword.trim()
    const normalizedEditKeyword = trimmedEditKeyword.toLowerCase()
    
    // 키워드가 변경된 경우 중복 체크
    if (editingKeyword.toLowerCase() !== normalizedEditKeyword) {
      const existingKeyword = Object.keys(mappings).find(
        k => k.toLowerCase() === normalizedEditKeyword && k !== editingKeyword
      )
      
      if (existingKeyword) {
        const existingCategory = mappings[existingKeyword]
        alert(`이미 등록된 키워드입니다.\n\n"${existingKeyword}" → "${existingCategory}"\n\n다른 키워드를 입력하거나 기존 항목을 수정하세요.`)
        return
      }
    }

    setLoading(true)
    try {
      // 기존 키워드와 다르면 기존 것 삭제 후 새로 추가
      if (editingKeyword.toLowerCase() !== normalizedEditKeyword) {
        await deleteKeywordCategoryMapping(profileId, editingKeyword)
      }
      await saveKeywordCategoryMapping(profileId, trimmedEditKeyword, editCategory)
      setEditingKeyword(null)
      setEditKeyword("")
      setEditCategory("식비")
      await loadMappings()
      alert(`✅ 키워드 매핑이 수정되었습니다.\n\n"${trimmedEditKeyword}" → "${editCategory}"`)
    } catch (error) {
      console.error("매핑 수정 실패:", error)
      alert("매핑 수정에 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingKeyword(null)
    setEditKeyword("")
    setEditCategory("식비")
  }

  const openAllMappingsInNewTab = async () => {
    try {
      const keywordMappings = await getKeywordCategoryMappings(profileId)
      const transactionMappings = await getTransactionNameMappings(profileId)

      // 새 창 열기 시도
      const newWin = window.open("", "_blank")
      if (!newWin) {
        // 팝업 차단 시 기존 모달로 fallback
        setAllMappings({
          keywordMappings: keywordMappings || {},
          transactionMappings: transactionMappings || {},
        })
        setShowAllMappings(true)
        return
      }

      // 간단한 HTML로 전체 매핑 렌더링
      const style = `
        body { font-family: Arial, sans-serif; padding: 16px; background: #f9fafb; }
        h1 { margin-bottom: 12px; }
        h2 { margin: 16px 0 8px; color: #1d4ed8; }
        h3 { margin: 12px 0 8px; }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
        .row { display: flex; justify-content: space-between; padding: 6px 8px; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 6px; background: #f9fafb; }
        .row span { display: inline-block; }
        .empty { color: #6b7280; font-size: 14px; }
      `

      const renderRows = (data: Record<string, string>, color: string) => {
        const entries = Object.entries(data || {})
        if (entries.length === 0) return `<div class="empty">등록된 매핑이 없습니다.</div>`
        return entries
          .map(
            ([k, v]) =>
              `<div class="row"><span>${k}</span><span style="color:${color}">→ ${v}</span></div>`
          )
          .join("")
      }

      const html = `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>전체 매핑 보기</title>
            <style>${style}</style>
          </head>
          <body>
            <h1>전체 매핑 보기</h1>
            <div class="card">
              <h2>키워드 매핑 (수동 등록)</h2>
              ${renderRows(keywordMappings || {}, "#2563eb")}
            </div>
            <div class="card">
              <h2>거래명 매핑 (사용자 수정)</h2>
              ${renderRows(transactionMappings || {}, "#16a34a")}
            </div>
          </body>
        </html>
      `

      newWin.document.open()
      newWin.document.write(html)
      newWin.document.close()
      newWin.focus()
    } catch (error) {
      console.error("전체 매핑 새창 열기 실패:", error)
      alert("전체 매핑을 불러오는데 실패했습니다.")
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            키워드 매핑 관리
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCategoryManager(true)}
              className="flex items-center gap-1"
            >
              <Tag className="w-4 h-4" />
              카테고리 관리
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={openAllMappingsInNewTab}
              className="flex items-center gap-1"
            >
              <Eye className="w-4 h-4" />
              전체 매핑 보기
            </Button>
            <Button
              size="sm"
              onClick={openAddWindow}
              className="flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              키워드 매핑 추가 (새 창)
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          키워드(예: "주유소")를 입력하면 해당 키워드가 포함된 모든 거래가 자동으로 선택한 카테고리로 분류됩니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-gray-500 text-center py-4">
            키워드 매핑은 새 창에서 추가/수정합니다. 팝업이 차단되면 모달로 열립니다. "전체 매핑 보기"에서 등록 내역을 확인하세요.
          </p>
        </div>

        {/* 키워드 매핑 추가 모달 */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">키워드 매핑 추가</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddModal(false)
                    setNewKeyword("")
                    setNewCategory("식비")
                  }}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="keyword-modal">키워드</Label>
                  <Input
                    id="keyword-modal"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="예: 주유소, 편의점, 카페"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="category-modal">카테고리</Label>
                  <select
                    id="category-modal"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                  >
                    {categoryNames.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddModal(false)
                      setNewKeyword("")
                      setNewCategory("식비")
                    }}
                    size="sm"
                  >
                    취소
                  </Button>
                  <Button onClick={handleAdd} disabled={loading} size="sm">
                    저장
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 카테고리 관리 모달 */}
        {showCategoryManager && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 shadow-xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">카테고리 관리</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCategoryManager(false)
                    setEditingCategory(null)
                    setNewCategoryName("")
                  }}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                {/* 기본 카테고리 목록 */}
                <div>
                  <h4 className="font-semibold mb-2 text-blue-600">기본 카테고리</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map((cat) => (
                      <div
                        key={cat}
                        className="p-2 border rounded bg-gray-50 text-sm"
                      >
                        {cat}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 사용자 정의 카테고리 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-green-600">사용자 정의 카테고리</h4>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingCategory({ name: "" })
                        setNewCategoryName("")
                      }}
                      className="flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      추가
                    </Button>
                  </div>
                  
                  {editingCategory && (
                    <div className="p-3 border rounded-lg bg-gray-50 mb-2">
                      <Input
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="카테고리 이름"
                        className="mb-2"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!newCategoryName.trim()) {
                              alert("카테고리 이름을 입력해주세요.")
                              return
                            }
                            try {
                              if (editingCategory.id) {
                                await updateCategory(profileId, editingCategory.id, { name: newCategoryName.trim() })
                              } else {
                                await createCategory(profileId, { name: newCategoryName.trim() })
                              }
                              setEditingCategory(null)
                              setNewCategoryName("")
                              await loadCategories()
                              alert("✅ 카테고리가 저장되었습니다.\n\n페이지를 새로고침하면 모든 곳에서 사용할 수 있습니다.")
                            } catch (error) {
                              console.error("카테고리 저장 실패:", error)
                              alert("카테고리 저장에 실패했습니다.")
                            }
                          }}
                        >
                          저장
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingCategory(null)
                            setNewCategoryName("")
                          }}
                        >
                          취소
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {categories.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">사용자 정의 카테고리가 없습니다.</p>
                  ) : (
                    <div className="space-y-2">
                      {categories.map((cat) => (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between p-2 border rounded bg-gray-50"
                        >
                          <span className="font-medium">{cat.name}</span>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingCategory(cat)
                                setNewCategoryName(cat.name)
                              }}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (!confirm(`"${cat.name}" 카테고리를 삭제하시겠습니까?`)) return
                                try {
                                  await deleteCategory(profileId, cat.id)
                                  await loadCategories()
                                  alert("✅ 카테고리가 삭제되었습니다.")
                                } catch (error) {
                                  console.error("카테고리 삭제 실패:", error)
                                  alert("카테고리 삭제에 실패했습니다.")
                                }
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <Button
                  onClick={() => {
                    setShowCategoryManager(false)
                    setEditingCategory(null)
                    setNewCategoryName("")
                  }}
                  className="w-full"
                >
                  닫기
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 전체 매핑 보기 모달 */}
        {showAllMappings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 shadow-xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">전체 매핑 목록</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllMappings(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                {/* 키워드 매핑 */}
                <div>
                  <h4 className="font-semibold mb-2 text-blue-600">키워드 매핑 (수동 등록)</h4>
                  {Object.keys(allMappings.keywordMappings).length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">등록된 키워드 매핑이 없습니다.</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(allMappings.keywordMappings).map(([keyword, category]) => (
                        <div
                          key={keyword}
                          className="flex items-center justify-between p-2 border rounded bg-gray-50"
                        >
                          <div>
                            <span className="font-medium">{keyword}</span>
                            <span className="text-gray-500 mx-2">→</span>
                            <span className="text-blue-600">{category}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 거래명 매핑 */}
                <div>
                  <h4 className="font-semibold mb-2 text-green-600">거래명 매핑 (사용자 수정)</h4>
                  {Object.keys(allMappings.transactionMappings).length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">등록된 거래명 매핑이 없습니다.</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(allMappings.transactionMappings).map(([name, category]) => (
                        <div
                          key={name}
                          className="flex items-center justify-between p-2 border rounded bg-gray-50"
                        >
                          <div>
                            <span className="font-medium">{name}</span>
                            <span className="text-gray-500 mx-2">→</span>
                            <span className="text-green-600">{category}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <Button
                  onClick={() => setShowAllMappings(false)}
                  className="w-full"
                >
                  닫기
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 수정 모달 */}
        {editingKeyword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">매핑 수정</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-keyword">키워드</Label>
                  <Input
                    id="edit-keyword"
                    value={editKeyword}
                    onChange={(e) => setEditKeyword(e.target.value)}
                    placeholder="예: 주유소, 편의점, 카페"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-category">카테고리</Label>
                  <select
                    id="edit-category"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={handleSaveEdit} 
                    disabled={loading} 
                    className="flex-1"
                  >
                    저장
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="flex-1"
                  >
                    취소
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

