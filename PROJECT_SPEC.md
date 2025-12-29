# Personal Finance Tracker - 기획서 (Spec Sheet)

## 1. 프로젝트 개요 (Project Overview)
- **프로젝트 명**: Personal Finance Flow (가칭)
- **목표**: 개인의 자산/부채를 단순 UI로 기록·확인 (월 수입/월 납입 포함)
- **타겟 유저**: 개인(단일 사용자)
- **플랫폼**: 웹 어플리케이션 (PC/Mobile 반응형)
- **서버 인프라**: 단일 Next.js 서버 (Cloud Run 배포 가능), 파일 기반 저장(`frontend/data/state.json`)

## 2. 주요 기능 (현행)

### A. 자금 흐름 관리 (Cash Flow)
- 자산 입력: 유형/이름/잔액 + 월 수입(optional)
- 부채 입력: 금액, 금리, 월 납입금액(수동), 납부일

### B. 스마트 관리 & AI 비서
- (보류) 필요 시 텍스트 브리핑/챗봇 연동

### C. 대출/금융 관리
- 기본 부채 입력(금리/월 납입/납부일)만 제공, 계산기는 추후 필요 시

### D. 개인사업자 관리
- (보류) 현재 단일 사용자/프로필만 사용

### E. 세무 및 일정
- (보류) 추후 필요 시 추가

## 3. 기술 스택 (현행)
- **단일 서버**: Next.js (App Router) + Tailwind/shadcn
- **저장소**: 파일 기반 JSON `frontend/data/state.json`
- **배포**: Cloud Run 단일 컨테이너(포트 3000)

## 4. 향후 확장성 (Future Work)
- 거래(가계부) 기능 추가 시 DB/R2/Firestore 전환 검토
- 필요 시 AI 브리핑/챗봇 연동

