const API_URL = '/api'; // same-origin Next API base

// 공휴일 API
export async function getHolidays(year?: number, month?: number): Promise<{ holidays: any[]; year: number; month?: number }> {
    const params = new URLSearchParams()
    if (year) params.append('year', year.toString())
    if (month) params.append('month', month.toString())

    const res = await fetch(`${API_URL}/holidays?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to fetch holidays');
    return res.json();
}

export async function getProfile(profileId: string) {
    const res = await fetch(`${API_URL}/profiles/${profileId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
}

export async function getAssets(profileId: string) {
    const res = await fetch(`${API_URL}/profiles/${profileId}/assets`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to fetch assets');
    return res.json();
}

export async function createProfile(name: string) {
    const res = await fetch(`${API_URL}/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type: 'PERSONAL' }),
    });
    if (!res.ok) throw new Error('Failed to create profile');
    return res.json();
}

export async function getProfiles() {
    const res = await fetch(`${API_URL}/profiles`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to fetch profiles');
    return res.json();
}

export async function saveAssets(profileId: string, assets: any[]) {
    // Send assets to the new backend endpoint
    const res = await fetch(`${API_URL}/profiles/${profileId}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assets),
    });

    if (!res.ok) {
        console.error("Failed to save assets to backend");
        return false;
    }

    const saved = await res.json();
    console.log(`Saved ${saved.length} assets to DB for profile ${profileId}`);
    return true;
}

export async function saveDebts(profileId: string, debts: any[]) {
    const res = await fetch(`${API_URL}/profiles/${profileId}/debts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(debts),
    });

    if (!res.ok) {
        console.error("Failed to save debts to backend");
        return false;
    }

    const saved = await res.json();
    console.log(`Saved ${saved.length} debts to DB for profile ${profileId}`);
    return true;
}

export async function getDebts(profileId: string) {
    const res = await fetch(`${API_URL}/profiles/${profileId}/debts`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to fetch debts');
    return res.json();
}

export async function getExpenses(profileId: string) {
    const res = await fetch(`${API_URL}/profiles/${profileId}/expenses`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
        console.warn("Failed to fetch expenses; returning empty list", res.status);
        return [];
    }
    return res.json();
}

export async function saveExpenses(profileId: string, expenses: any[]) {
    const res = await fetch(`${API_URL}/profiles/${profileId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenses),
    });

    if (!res.ok) {
        console.error("Failed to save expenses to backend");
        return false;
    }

    const saved = await res.json();
    console.log(`Saved ${saved.length} expenses to storage for profile ${profileId}`);
    return true;
}

export async function cleanupExpenses(profileId: string): Promise<{ success: boolean; message: string; beforeCount: number; afterCount: number; removedCount: number }> {
    const res = await fetch(`${API_URL}/profiles/${profileId}/expenses/cleanup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to cleanup expenses');
    return res.json();
}

export async function getIncomes(profileId: string) {
    const res = await fetch(`${API_URL}/profiles/${profileId}/incomes`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
        console.warn("Failed to fetch incomes; returning empty list", res.status);
        return [];
    }
    return res.json();
}

export async function saveIncomes(profileId: string, incomes: any[]) {
    const res = await fetch(`${API_URL}/profiles/${profileId}/incomes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incomes),
    });

    if (!res.ok) {
        console.error("Failed to save incomes to backend");
        return false;
    }

    const saved = await res.json();
    console.log(`Saved ${saved.length} incomes to storage for profile ${profileId}`);
    return true;
}

export async function uploadTransactions(profileId: string, file: File): Promise<{ success: boolean; count: number; duplicate: number; message: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_URL}/profiles/${profileId}/transactions/upload`, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '엑셀 파일 업로드에 실패했습니다.');
    }

    return res.json();
}

export async function uploadMultipleTransactions(profileId: string, files: File[]): Promise<{ success: boolean; count: number; duplicate: number; ambiguous: number; message: string }> {
    try {
        const formData = new FormData();
        files.forEach((file) => {
            formData.append('files', file);
        });

        const res = await fetch(`${API_URL}/profiles/${profileId}/transactions/upload-multiple`, {
            method: 'POST',
            body: formData,
        });

        if (!res.ok) {
            let errorMessage = '엑셀 파일 업로드에 실패했습니다.';
            try {
                const error = await res.json();
                errorMessage = error.error || errorMessage;
            } catch {
                errorMessage = `서버 오류 (${res.status}): ${res.statusText}`;
            }
            throw new Error(errorMessage);
        }

        return res.json();
    } catch (error: any) {
        console.error('Upload multiple transactions error:', error);
        throw error;
    }
}

// --- Memo API ---
export async function getMemos() {
    const res = await fetch(`${API_URL}/memos`, { method: "GET" })
    if (!res.ok) throw new Error("메모 목록을 불러오지 못했습니다.")
    return res.json()
}

export async function addMemo(content: string) {
    const res = await fetch(`${API_URL}/memos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
    })
    if (!res.ok) throw new Error("메모를 저장하지 못했습니다.")
    return res.json()
}

export async function updateMemo(id: string, content: string) {
    const res = await fetch(`${API_URL}/memos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, content }),
    })
    if (!res.ok) throw new Error("메모를 수정하지 못했습니다.")
    return res.json()
}

export async function deleteMemo(id: string) {
    const res = await fetch(`${API_URL}/memos?id=${id}`, { method: "DELETE" })
    if (!res.ok) throw new Error("메모를 삭제하지 못했습니다.")
    return res.json()
}

export async function addMemoComment(memoId: string, content: string) {
    const res = await fetch(`${API_URL}/memos/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memoId, content }),
    })
    if (!res.ok) throw new Error("댓글을 추가하지 못했습니다.")
    return res.json()
}

export async function getTransactions(profileId: string, filters?: { startDate?: string; endDate?: string; type?: 'INCOME' | 'EXPENSE' }) {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.type) params.append('type', filters.type);

    const queryString = params.toString();
    const url = `${API_URL}/profiles/${profileId}/transactions${queryString ? `?${queryString}` : ''}`;

    const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
        console.warn("Failed to fetch transactions; returning empty list", res.status);
        return [];
    }

    return res.json();
}

export async function updateTransaction(profileId: string, transactionId: string, updates: any, updateAllWithSameName = false) {
    const res = await fetch(`${API_URL}/profiles/${profileId}/transactions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: transactionId, updateAllWithSameName, ...updates }),
    });

    if (!res.ok) {
        throw new Error('거래 내역 업데이트에 실패했습니다.');
    }

    return res.json();
}

export async function deleteTransaction(profileId: string, transactionId: string) {
    const res = await fetch(`${API_URL}/profiles/${profileId}/transactions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: transactionId }),
    });

    if (!res.ok) {
        throw new Error('거래 내역 삭제에 실패했습니다.');
    }

    return res.json();
}

export async function deleteAllTransactions(profileId: string) {
    const res = await fetch(`${API_URL}/profiles/${profileId}/transactions/delete-all`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
        throw new Error('전체 거래 내역 삭제에 실패했습니다.');
    }

    return res.json();
}

export async function deleteTransactionNameMappings(profileId: string): Promise<void> {
    const res = await fetch(`${API_URL}/profiles/${profileId}/transactions/mappings`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '매핑 삭제에 실패했습니다.');
    }
}

export async function getTransactionNameMappings(profileId: string): Promise<Record<string, string>> {
    const res = await fetch(`${API_URL}/profiles/${profileId}/transactions/mappings`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
        return {};
    }

    const data = await res.json();
    return data.mappings || {};
}

export async function getKeywordCategoryMappings(profileId: string): Promise<Record<string, string>> {
    const res = await fetch(`${API_URL}/profiles/${profileId}/transactions/keyword-mappings`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
        return {};
    }

    const data = await res.json();
    return data.mappings || {};
}

export async function saveKeywordCategoryMapping(profileId: string, keyword: string, category: string): Promise<void> {
    const res = await fetch(`${API_URL}/profiles/${profileId}/transactions/keyword-mappings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, category }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '키워드 매핑 저장에 실패했습니다.');
    }
}

export async function deleteKeywordCategoryMapping(profileId: string, keyword: string): Promise<void> {
    const res = await fetch(`${API_URL}/profiles/${profileId}/transactions/keyword-mappings`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '키워드 매핑 삭제에 실패했습니다.');
    }
}

export async function getMerchantCategoryMappings(profileId: string): Promise<Record<string, string>> {
    const res = await fetch(`${API_URL}/profiles/${profileId}/transactions/merchant-mappings`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return {};
    const data = await res.json();
    return data.mappings || {};
}

export async function updateMerchantCategoryMapping(profileId: string, merchantName: string, category: string): Promise<void> {
    await fetch(`${API_URL}/profiles/${profileId}/transactions/merchant-mappings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantName, category }),
    });
}

export async function deleteMerchantCategoryMapping(profileId: string, merchantName: string): Promise<void> {
    await fetch(`${API_URL}/profiles/${profileId}/transactions/merchant-mappings`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantName }),
    });
}

export async function updateTransactionNameMapping(profileId: string, name: string, category: string): Promise<void> {
    await fetch(`${API_URL}/profiles/${profileId}/transactions/mappings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category }),
    });
}

export async function deleteTransactionNameMapping(profileId: string, name: string): Promise<void> {
    await fetch(`${API_URL}/profiles/${profileId}/transactions/mappings`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    });
}

// 거래 재검증/재분류
export async function reclassifyTransactions(profileId: string, options?: { scope?: 'needsReview' | 'lowConfidence' | 'all'; confidenceThreshold?: number }) {
    const res = await fetch(`${API_URL}/profiles/${profileId}/transactions/reclassify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            scope: options?.scope || 'needsReview',
            confidenceThreshold: options?.confidenceThreshold ?? 0.7,
        }),
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || '재검증에 실패했습니다.');
    }

    return res.json();
}

// 카테고리 목록 조회 (기본 + 사용자 정의 병합)
export async function getCategories(profileId: string): Promise<{
    categories: any[];
    categoryNames: string[];
    count: number;
}> {
    const res = await fetch(`${API_URL}/profiles/${profileId}/categories`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
        throw new Error('카테고리 조회에 실패했습니다.');
    }

    return res.json();
}

export async function saveCategories(profileId: string, categories: any[]): Promise<any[]> {
    const res = await fetch(`${API_URL}/profiles/${profileId}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categories),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '카테고리 저장에 실패했습니다.');
    }

    return res.json();
}

export async function createCategory(profileId: string, category: { name: string; color?: string; icon?: string; parentId?: string; keywords?: string[] }): Promise<any> {
    const res = await fetch(`${API_URL}/profiles/${profileId}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '카테고리 생성에 실패했습니다.');
    }

    const data = await res.json();
    return data.category;
}

export async function updateCategory(profileId: string, categoryId: string, updates: Partial<any>): Promise<any> {
    const res = await fetch(`${API_URL}/profiles/${profileId}/categories`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: categoryId, ...updates }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '카테고리 수정에 실패했습니다.');
    }

    const data = await res.json();
    return data.category;
}

export async function deleteCategory(profileId: string, categoryId: string): Promise<void> {
    const res = await fetch(`${API_URL}/profiles/${profileId}/categories?id=${categoryId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '카테고리 삭제에 실패했습니다.');
    }
}

export async function classifyTransactionWithAI(text: string, amount: number): Promise<{
    category: string
    name: string
    confidence: number
    needsReview: boolean
}> {
    const res = await fetch(`${API_URL}/ai/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, amount }),
    });

    if (!res.ok) {
        throw new Error('AI 분류 중 오류가 발생했습니다.');
    }

    return res.json();
}

export async function analyzeTransactions(profileId: string, filters?: { startDate?: string; endDate?: string }) {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const url = `${API_URL}/profiles/${profileId}/transactions/analyze${queryString ? `?${queryString}` : ''}`;

    const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
        throw new Error('패턴 분석 중 오류가 발생했습니다.');
    }

    return res.json();
}

export async function getTransactionSources(profileId: string) {
    const res = await fetch(`${API_URL}/profiles/${profileId}/transactions/sources`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
        console.warn("Failed to fetch transaction sources; returning empty list", res.status);
        return [];
    }

    return res.json();
}
