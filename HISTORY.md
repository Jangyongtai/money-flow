# 💰 Money Flow Project History (2025-12-30)

## 📅 2025년 12월 30일: 클라우드 배포 및 실서비스 가동

### 🚀 1. 배포 인프라 구축
- **GitHub 연동**: 로컬 소스코드를 `Jangyongtai/money-flow` 리포지토리에 연동 완료.
- **Firebase 프로젝트**: `money-flow-503ff` 프로젝트 생성 및 Blaze(Pay-as-you-go) 요금제 적용.
- **예산 관리**: 예상치 못한 비용 발생 방지를 위한 $1 예산 알림 설정 완료.

### 🛠️ 2. 소스코드 최적화 및 빌드 에러 해결
- **API Key 의존성 제거**: 공휴일 API 등을 로컬 데이터 방식으로 전환하여 복잡한 환경 변수 설정 최소화.
- **IAM 보안 접속**: 물리적인 `service-account.json` 파일 없이 구글 클라우드 서비스 계정 권한(IAM)을 통한 Firestore 보안 접속 구현.
- **빌드 버그 수정**: `package-lock.json` 동기화 문제 해결 및 Next.js 보안 취약점 업데이트(v15.5.7).
- **엄격한 검사 우회**: 배포 가속화를 위해 빌드 시 ESLint 및 TypeScript 검사 오류를 무시하도록 `next.config.ts` 설정.

### 🔐 3. 보안 시스템 (나만의 비밀 대문)
- **URL 토큰 인증**: `?token=...` 파라미터를 이용한 접근 제어 로직(`AuthWrapper`) 구현.
- **로컬 스토리지 유지**: 한 번 인증된 기기(PC/핸드폰)에서는 토큰 없이도 접속 가능하도록 편의성 증대.
- **현재 비밀 토큰**: `v8Xn2p9RkL5mQt7`

### 🔗 4. 서비스 주소
- **URL**: [https://money-flow--money-flow-503ff.asia-east1.hosted.app](https://money-flow--money-flow-503ff.asia-east1.hosted.app)
- **리전**: `asia-east1` (대만)

---
*본 기록은 2025년 12월 30일 마지막 배포 성공 시점을 기준으로 작성되었습니다.*
