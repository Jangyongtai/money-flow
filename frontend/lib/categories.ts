// 공통 카테고리 목록 (모든 컴포넌트에서 사용)
// 기본 10가지 카테고리 (간단하고 편리하게)
export const CATEGORIES = [
  "식비",
  "교통비",
  "쇼핑",
  "통신비",
  "공과금",
  "의료",
  "교육",
  "유흥",
  "저축/투자",
  "미분류",
  "기타",
]

// 카테고리를 동적으로 가져오는 함수 (DB에서 로드한 카테고리와 기본 카테고리 병합)
export async function getCategoriesList(profileId?: string): Promise<string[]> {
  // TODO: 추후 DB에서 사용자 정의 카테고리를 가져와서 병합
  // const customCategories = profileId ? await getCategories(profileId) : []
  // const customCategoryNames = customCategories.map(c => c.name)
  // return [...new Set([...CATEGORIES, ...customCategoryNames])]
  
  return CATEGORIES
}

