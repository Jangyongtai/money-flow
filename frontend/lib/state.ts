import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"
import { db } from "./firebase-admin"

export type Profile = { id: string; name: string; type?: string; businessNumber?: string }
export type Asset = {
  id: string
  profileId: string
  type: string
  name: string
  balance: number
  monthlyIncome?: number | null
  monthlyIncomeDay?: number | null
}
export type Debt = {
  id: string
  profileId: string
  type: string
  name: string
  amount: number
  interestRate?: number | null
  paymentAmount?: number | null
  paymentDay?: number | null
}
export type RecurringExpense = {
  id: string
  profileId: string
  category?: string
  name: string
  amount: number
  billingDay?: number | null
  source?: string // auto-debt 등 출처 표시
  originId?: string // 출처의 원본 ID (예: debt id)
}
export type Income = {
  id: string
  profileId: string
  name: string
  amount: number
  payDay?: number | null
}

export type Transaction = {
  id: string
  profileId: string
  date: string // YYYY-MM-DD 형식
  datetime?: string // YYYY-MM-DD HH:mm:ss 형식 (중복 체크용)
  type: 'INCOME' | 'EXPENSE'
  category?: string
  name: string
  amount: number
  description?: string
  transactionNumber?: string // 거래번호 (중복 체크용)
  // AI 관련 필드
  originalText?: string // 원본 거래 내역 텍스트 (엑셀에서 파싱된 원본)
  confidence?: number // AI 분류 신뢰도 (0-1)
  needsReview?: boolean // 사용자 확인 필요 여부
  userConfirmed?: boolean // 사용자가 확인했는지
  aiCategory?: string // AI가 추론한 카테고리
  classificationReason?: string // 분류 근거 (어떤 키워드나 규칙으로 분류되었는지)
  // 중복 체크 관련
  duplicateCheckConfidence?: number // 중복 체크 신뢰도 (0-1)
  possibleDuplicate?: boolean // 중복 가능성 플래그
  sourceFile?: string // 원본 파일명
  sourceCardName?: string // 카드사/은행사 이름 (엑셀에서 파싱)
  sourceCardNumber?: string // 카드번호 뒷4자리 (엑셀에서 파싱)
  sourceAccountNumber?: string // 계좌번호 (엑셀에서 파싱)
  // 취소건 관련
  isCancelled?: boolean // 취소건 여부
  originalAmount?: number // 원본 금액 (부호 포함, 취소건 매칭용)
}

export type Category = {
  id: string
  profileId: string
  name: string
  color?: string
  icon?: string
  parentId?: string // 상위 카테고리 (계층 구조 지원)
  keywords?: string[] // 자동 분류를 위한 키워드
  createdAt?: string
  updatedAt?: string
}

type State = {
  profiles: Profile[]
  assets: Asset[]
  debts: Debt[]
  expenses: RecurringExpense[]
  incomes: Income[]
  transactions: Transaction[]
  categories: Category[]
  transactionNameMappings?: Record<string, string> // 사용자별 거래명-카테고리 매핑
  merchantCategoryMappings?: Record<string, string> // 전역 가맹점명-카테고리 매핑 (AI API 결과 저장, 모든 사용자 공유)
  keywordCategoryMappings?: Record<string, string> // 수동으로 추가한 키워드-카테고리 매핑 (예: "주유소" -> "주유비", 모든 사용자 공유)
}

const DATA_DIR = path.join(process.cwd(), "data")
const STATE_FILE = path.join(DATA_DIR, "state.json")

// NOTE: We are transitioning to Firestore. 
// load and save are kept for types but will eventually be removed.
export async function load(): Promise<State> {
  return {
    profiles: [],
    assets: [],
    debts: [],
    expenses: [],
    incomes: [],
    transactions: [],
    categories: [],
  }
}

export async function save(state: State) {
  // No-op for now as we write directly to Firestore collections
}

// Profile 관리
export async function listProfiles(): Promise<Profile[]> {
  const snapshot = await db.collection('profiles').get();
  return snapshot.docs.map(doc => doc.data() as Profile);
}

export async function getProfile(profileId: string): Promise<Profile | null> {
  const doc = await db.collection('profiles').doc(profileId).get();
  return doc.exists ? (doc.data() as Profile) : null;
}

export async function createProfile(name: string, type?: string, businessNumber?: string): Promise<Profile> {
  const profile: Profile = {
    id: randomUUID(),
    name,
    type,
    businessNumber,
  }
  await db.collection('profiles').doc(profile.id).set(profile);
  return profile
}

export async function upsertProfile(profile: Profile) {
  await db.collection('profiles').doc(profile.id).set(profile, { merge: true });
  return profile
}


// Asset 관리
export async function getAssets(profileId: string): Promise<Asset[]> {
  try {
    console.log(`[DB] Fetching assets for profile: ${profileId}`);
    const snapshot = await db.collection('profiles').doc(profileId).collection('assets').get();
    const assets = snapshot.docs.map(doc => doc.data() as Asset);
    console.log(`[DB] Successfully fetched ${assets.length} assets`);
    return assets;
  } catch (error) {
    console.error(`[DB ERROR] Failed to get assets for ${profileId}:`, error);
    throw error;
  }
}

export async function saveAssets(profileId: string, assets: Asset[]) {
  const batch = db.batch();

  // Clear existing assets for this profile first (Firestore doesn't have a simple "replace collection" so we delete and add)
  const existing = await db.collection('profiles').doc(profileId).collection('assets').get();
  existing.docs.forEach(doc => batch.delete(doc.ref));

  assets.forEach(asset => {
    const ref = db.collection('profiles').doc(profileId).collection('assets').doc(asset.id);
    batch.set(ref, asset);
  });

  await batch.commit();
  return assets
}

// Debt 관리
export async function getDebts(profileId: string): Promise<Debt[]> {
  const snapshot = await db.collection('profiles').doc(profileId).collection('debts').get();
  return snapshot.docs.map(doc => doc.data() as Debt);
}

export async function saveDebts(profileId: string, debts: Debt[]) {
  const batch = db.batch();

  const existing = await db.collection('profiles').doc(profileId).collection('debts').get();
  existing.docs.forEach(doc => batch.delete(doc.ref));

  debts.forEach(debt => {
    if (!debt.id) return; // Skip if no ID
    const ref = db.collection('profiles').doc(profileId).collection('debts').doc(debt.id);
    batch.set(ref, debt);
  });

  await batch.commit();
  return debts
}

// Expense 관리
export async function getExpenses(profileId: string): Promise<RecurringExpense[]> {
  try {
    const snapshot = await db.collection('profiles').doc(profileId).collection('expenses').get();
    return snapshot.docs.map(doc => doc.data() as RecurringExpense);
  } catch (error) {
    console.error(`[DB ERROR] Failed to get expenses:`, error);
    return [];
  }
}

export async function saveExpenses(profileId: string, expenses: RecurringExpense[]) {
  const batch = db.batch();

  const existing = await db.collection('profiles').doc(profileId).collection('expenses').get();
  existing.docs.forEach(doc => batch.delete(doc.ref));

  expenses.forEach(expense => {
    if (!expense.id) return;
    const ref = db.collection('profiles').doc(profileId).collection('expenses').doc(expense.id);
    batch.set(ref, expense);
  });

  await batch.commit();
  return expenses
}

// Income 관리
export async function getIncomes(profileId: string): Promise<Income[]> {
  try {
    const snapshot = await db.collection('profiles').doc(profileId).collection('incomes').get();
    return snapshot.docs.map(doc => doc.data() as Income);
  } catch (error) {
    console.error(`[DB ERROR] Failed to get incomes:`, error);
    return [];
  }
}

export async function saveIncomes(profileId: string, incomes: Income[]) {
  const batch = db.batch();

  const existing = await db.collection('profiles').doc(profileId).collection('incomes').get();
  existing.docs.forEach(doc => batch.delete(doc.ref));

  incomes.forEach(income => {
    if (!income.id) return;
    const ref = db.collection('profiles').doc(profileId).collection('incomes').doc(income.id);
    batch.set(ref, { ...income, profileId });
  });

  await batch.commit();
  return incomes
}

// Transaction 관리
export async function saveTransactions(profileId: string, transactions: Transaction[]) {
  const existingTransactions = await getTransactions(profileId);

  // 문자열 유사도 계산 (Levenshtein distance 기반)
  function calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0
    if (!str1 || !str2) return 0.0
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    if (longer.length === 0) return 1.0
    const commonChars = new Set()
    for (const char of shorter) {
      if (longer.includes(char)) {
        commonChars.add(char)
      }
    }
    const similarity = commonChars.size / longer.length
    if (longer.includes(shorter) || shorter.includes(longer)) {
      return Math.max(similarity, 0.8)
    }
    return similarity
  }

  // 중복 체크 함수
  const checkDuplicate = (newTxn: Transaction, existing: Transaction[]): {
    isDuplicate: boolean
    confidence: number
    reason?: string
  } => {
    let maxConfidence = 0
    let duplicateReason = ""
    for (const existingTxn of existing) {
      let confidence = 0
      let reason = ""
      if (newTxn.transactionNumber && existingTxn.transactionNumber) {
        if (newTxn.transactionNumber === existingTxn.transactionNumber) {
          if (newTxn.datetime && existingTxn.datetime) {
            if (newTxn.datetime === existingTxn.datetime) return { isDuplicate: true, confidence: 1.0, reason: "거래번호 + datetime 일치" }
            confidence = 0.7; reason = "거래번호 일치, 시간 다름"
          } else {
            confidence = 0.8; reason = "거래번호 일치"
          }
        }
      }
      if (newTxn.datetime && existingTxn.datetime) {
        const timeDiff = Math.abs(new Date(newTxn.datetime).getTime() - new Date(existingTxn.datetime).getTime())
        const timeDiffMinutes = timeDiff / (1000 * 60)
        if (timeDiffMinutes <= 5 && newTxn.amount === existingTxn.amount && newTxn.name === existingTxn.name) {
          if (timeDiffMinutes === 0) return { isDuplicate: true, confidence: 1.0, reason: "datetime + 금액 + 항목명 완전 일치" }
          confidence = Math.max(confidence, 0.9); reason = "시간 5분 이내 + 금액 + 항목명 일치"
        }
      }
      if (newTxn.date === existingTxn.date && newTxn.amount === existingTxn.amount) {
        const nameSimilarity = calculateSimilarity(newTxn.name, existingTxn.name)
        if (nameSimilarity > 0.9) {
          if (newTxn.datetime && existingTxn.datetime) {
            const timeDiff = Math.abs(new Date(newTxn.datetime).getTime() - new Date(existingTxn.datetime).getTime()) / (1000 * 60)
            if (timeDiff <= 30) { confidence = Math.max(confidence, 0.85); reason = `날짜 + 금액 + 항목명 유사(${Math.round(nameSimilarity * 100)}%) + 시간 30분 이내` }
            else { confidence = Math.max(confidence, 0.6); reason = `날짜 + 금액 + 항목명 유사(${Math.round(nameSimilarity * 100)}%) + 시간 차이 큼` }
          } else { confidence = Math.max(confidence, 0.7); reason = `날짜 + 금액 + 항목명 유사(${Math.round(nameSimilarity * 100)}%)` }
        } else if (nameSimilarity > 0.7) {
          confidence = Math.max(confidence, 0.5); reason = `날짜 + 금액 일치, 항목명 유사(${Math.round(nameSimilarity * 100)}%)`
        }
      }
      if (newTxn.date === existingTxn.date && newTxn.amount === existingTxn.amount && newTxn.name !== existingTxn.name) {
        confidence = Math.max(confidence, 0.3); reason = "날짜 + 금액 일치, 항목명 다름"
      }
      if (confidence > maxConfidence) { maxConfidence = confidence; duplicateReason = reason }
    }
    if (maxConfidence >= 0.9) return { isDuplicate: true, confidence: maxConfidence, reason: duplicateReason }
    if (maxConfidence >= 0.5) return { isDuplicate: false, confidence: maxConfidence, reason: duplicateReason }
    return { isDuplicate: false, confidence: 0, reason: "" }
  }

  // 취소건 매칭
  const findMatchingTransaction = (cancelledTxn: Transaction, transactions: Transaction[]): Transaction | null => {
    if (!cancelledTxn.isCancelled && (cancelledTxn.originalAmount || 0) >= 0) return null
    const cancelledAmount = Math.abs(cancelledTxn.originalAmount || cancelledTxn.amount)
    const cancelledDate = new Date(cancelledTxn.date)
    for (const txn of transactions) {
      if (txn.id === cancelledTxn.id) continue
      const nameSimilarity = calculateSimilarity(cancelledTxn.name, txn.name)
      if (nameSimilarity < 0.8) continue
      if (Math.abs(txn.amount - cancelledAmount) > 1) continue
      const txnDate = new Date(txn.date)
      const daysDiff = Math.abs((cancelledDate.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff <= 4) return txn
    }
    return null
  }

  const cancelledTransactionIds = new Set<string>()
  const matchedOriginalIds = new Set<string>()
  for (const txn of transactions) {
    if (txn.isCancelled || (txn.originalAmount || 0) < 0) {
      const matched = findMatchingTransaction(txn, existingTransactions) || findMatchingTransaction(txn, transactions);
      if (matched) { cancelledTransactionIds.add(txn.id); matchedOriginalIds.add(matched.id) }
    }
  }

  const batch = db.batch();
  const processedTransactions: Transaction[] = []
  const duplicates: Transaction[] = []
  const ambiguous: Transaction[] = []

  // 취소건 처리 (DB에서 삭제)
  for (const id of matchedOriginalIds) {
    batch.delete(db.collection('profiles').doc(profileId).collection('transactions').doc(id));
  }

  for (const txn of transactions) {
    if (cancelledTransactionIds.has(txn.id)) continue;
    const checkResult = checkDuplicate(txn, existingTransactions);
    if (checkResult.isDuplicate) {
      duplicates.push(txn);
    } else if (checkResult.confidence >= 0.5) {
      const amb = { ...txn, duplicateCheckConfidence: checkResult.confidence, possibleDuplicate: true, needsReview: true };
      ambiguous.push(amb);
      batch.set(db.collection('profiles').doc(profileId).collection('transactions').doc(txn.id), amb);
    } else {
      processedTransactions.push(txn);
      batch.set(db.collection('profiles').doc(profileId).collection('transactions').doc(txn.id), txn);
    }
  }

  await batch.commit();

  return {
    new: processedTransactions,
    ambiguous: ambiguous,
    duplicate: duplicates.length,
    total: processedTransactions.length + ambiguous.length,
    ambiguousCount: ambiguous.length,
  }
}

export async function getTransactions(profileId: string, filters?: { startDate?: string; endDate?: string; type?: 'INCOME' | 'EXPENSE' }) {
  let query: any = db.collection('profiles').doc(profileId).collection('transactions');

  if (filters?.startDate) {
    query = query.where('date', '>=', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.where('date', '<=', filters.endDate);
  }
  if (filters?.type) {
    query = query.where('type', '==', filters.type);
  }

  const snapshot = await query.orderBy('date', 'desc').get();
  return snapshot.docs.map((doc: any) => doc.data() as Transaction);
}

export async function deleteTransaction(profileId: string, transactionId: string): Promise<boolean> {
  await db.collection('profiles').doc(profileId).collection('transactions').doc(transactionId).delete();
  return true
}

export async function deleteAllTransactions(profileId: string) {
  const snapshot = await db.collection('profiles').doc(profileId).collection('transactions').get();
  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  return true
}

// 사용자 매핑 삭제 (별도 관리)
export async function deleteTransactionNameMappings(profileId: string) {
  await db.collection('settings').doc('transactionNameMappings').set({}, { merge: false });
  return true
}

// 사용자 매핑 조회
export async function getTransactionNameMappings(profileId: string): Promise<Record<string, string>> {
  const doc = await db.collection('settings').doc('transactionNameMappings').get();
  return (doc.data() as Record<string, string>) || {};
}

// 카테고리 관리 함수들
export async function getCategories(profileId: string): Promise<Category[]> {
  const snapshot = await db.collection('profiles').doc(profileId).collection('categories').get();
  return snapshot.docs.map(doc => doc.data() as Category);
}

export async function saveCategories(profileId: string, categories: Category[]) {
  const batch = db.batch();
  const existing = await db.collection('profiles').doc(profileId).collection('categories').get();
  existing.docs.forEach(doc => batch.delete(doc.ref));

  categories.forEach(cat => {
    const ref = db.collection('profiles').doc(profileId).collection('categories').doc(cat.id);
    batch.set(ref, cat);
  });

  await batch.commit();
  return categories
}

export async function createCategory(profileId: string, category: Omit<Category, 'id' | 'profileId'>): Promise<Category> {
  const newCategory: Category = {
    id: randomUUID(),
    profileId,
    ...category,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  await db.collection('profiles').doc(profileId).collection('categories').doc(newCategory.id).set(newCategory);
  return newCategory
}

export async function updateCategory(profileId: string, categoryId: string, updates: Partial<Category>): Promise<Category> {
  await db.collection('profiles').doc(profileId).collection('categories').doc(categoryId).set({
    ...updates,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  const doc = await db.collection('profiles').doc(profileId).collection('categories').doc(categoryId).get();
  return doc.data() as Category;
}

export async function deleteCategory(profileId: string, categoryId: string): Promise<boolean> {
  await db.collection('profiles').doc(profileId).collection('categories').doc(categoryId).delete();
  return true
}

// 전역 가맹점명-카테고리 매핑 조회 (모든 사용자 공유)
export async function getMerchantCategoryMapping(merchantName: string, profileId?: string): Promise<string | null> {
  const doc = await db.collection('settings').doc('merchantCategoryMappings').get();
  const mappings = (doc.data() as Record<string, string>) || {};
  const normalizedName = normalizeMerchantName(merchantName)
  return mappings[normalizedName] || null
}

// 전역 가맹점명-카테고리 매핑 저장 (AI API 결과 저장, 모든 사용자 공유)
export async function saveMerchantCategoryMapping(merchantName: string, category: string, profileId?: string): Promise<void> {
  const normalizedName = normalizeMerchantName(merchantName)
  await db.collection('settings').doc('merchantCategoryMappings').set({
    [normalizedName]: category
  }, { merge: true });
}

// 가맹점명 정규화 (회사명, 카드사 접두사 제거, 지점명 제거 등)
export function normalizeMerchantName(merchantName: string): string {
  let normalized = merchantName.trim()

  // 카드사/은행 접두사 제거
  normalized = normalized
    .replace(/^(주식회사|유한회사|합자회사|합명회사|\(주\)|\(유\))\s*/i, "")
    .replace(/^(삼성|신한|kb|국민|현대|롯데|하나|bc|우리|nh|농협|카카오|토스|국민은행|신한은행|우리은행|하나은행|kb국민|kb국민은행)\s*/i, "")
    .replace(/\s*(카드|은행|뱅크|bank|card)\s*/gi, "")

  // 지점명 제거 (예: "맥도날드 평내점" → "맥도날드")
  // 패턴: 브랜드명 + 공백 + 지점명(한글/영문/숫자 조합) + "점"
  normalized = normalized
    .replace(/\s+[가-힣a-zA-Z0-9\s]*점\s*$/i, "") // 끝에 오는 "XXX점" 제거
    .replace(/\s+[가-힣a-zA-Z0-9\s]*지점\s*$/i, "") // 끝에 오는 "XXX지점" 제거
    .replace(/\s+[가-힣a-zA-Z0-9\s]*매장\s*$/i, "") // 끝에 오는 "XXX매장" 제거
    .replace(/\s+[가-힣a-zA-Z0-9\s]*센터\s*$/i, "") // 끝에 오는 "XXX센터" 제거
    .replace(/\s+[가-힣a-zA-Z0-9\s]*본점\s*$/i, "") // 끝에 오는 "XXX본점" 제거

  // 지역명 + 점 패턴 제거 (예: "평내점", "강남점", "서울점" 등)
  // 주요 지역명 패턴
  const regionPatterns = [
    "평내", "호평", "마석", "강남", "강북", "서울", "부산", "대구", "인천", "광주", "대전", "울산",
    "수원", "성남", "고양", "용인", "부천", "안산", "안양", "남양주", "화성", "평택", "의정부",
    "시흥", "김포", "광명", "군포", "이천", "양주", "오산", "구리", "안성", "포천", "의왕", "하남",
    "여주", "양평", "동두천", "과천", "가평", "연천", "hongdae", "gangnam", "myeongdong"
  ]

  for (const region of regionPatterns) {
    const regex = new RegExp(`\\s+${region}\\s*점\\s*$`, "i")
    normalized = normalized.replace(regex, "")
  }

  // 거래번호/승인번호 제거
  normalized = normalized
    .replace(/\s*승인번호\s*:?\s*\d+/gi, "")
    .replace(/\s*거래번호\s*:?\s*\d+/gi, "")
    .replace(/\s*승인\s*:?\s*\d+/gi, "")

  // 불필요한 공백 정리 및 소문자 변환
  normalized = normalized.trim().replace(/\s+/g, " ").toLowerCase()

  return normalized
}

// 키워드-카테고리 매핑 조회 (수동으로 추가한 키워드, 모든 사용자 공유)
export async function getKeywordCategoryMapping(keyword: string, profileId?: string): Promise<string | null> {
  const doc = await db.collection('settings').doc('keywordCategoryMappings').get();
  const mappings = (doc.data() as Record<string, string>) || {};
  const normalizedKeyword = keyword.trim().toLowerCase()
  return mappings[normalizedKeyword] || null
}

// 키워드-카테고리 매핑 저장 (수동 추가, 모든 사용자 공유)
export async function saveKeywordCategoryMapping(keyword: string, category: string, profileId?: string): Promise<void> {
  const normalizedKeyword = keyword.trim().toLowerCase()
  await db.collection('settings').doc('keywordCategoryMappings').set({
    [normalizedKeyword]: category
  }, { merge: true });
}

// 모든 키워드-카테고리 매핑 조회
export async function getAllKeywordCategoryMappings(profileId?: string): Promise<Record<string, string>> {
  const doc = await db.collection('settings').doc('keywordCategoryMappings').get();
  return (doc.data() as Record<string, string>) || {};
}

// 키워드-카테고리 매핑 삭제
export async function deleteKeywordCategoryMapping(keyword: string, profileId?: string): Promise<void> {
  const normalizedKeyword = keyword.trim().toLowerCase()
  const docRef = db.collection('settings').doc('keywordCategoryMappings');
  const doc = await docRef.get();
  if (doc.exists) {
    const data = doc.data() as any;
    delete data[normalizedKeyword];
    await docRef.set(data);
  }
}

// 거래 전체 교체 (재분류용)
export async function replaceTransactions(profileId: string, transactions: Transaction[]) {
  const batch = db.batch();
  const existing = await db.collection('profiles').doc(profileId).collection('transactions').get();
  existing.docs.forEach(doc => batch.delete(doc.ref));

  transactions.forEach(txn => {
    const ref = db.collection('profiles').doc(profileId).collection('transactions').doc(txn.id);
    batch.set(ref, txn);
  });

  await batch.commit();
  return true
}

