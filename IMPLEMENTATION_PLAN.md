# Implementation Plan: Personal Finance Flow

## User Review Required
> [!IMPORTANT]
> **Database Host**: GCP Cloud SQL is recommended for production, but for cost-savings during development, we can run PostgreSQL in a Docker container on a Compute Engine or use a free-tier compatible service (e.g., Supabase, Neon) connected to the app.

## Proposed Tech Stack
- **Frontend**: Next.js 14+ (App Router), Tailwind CSS, Lucide Icons.
- **Backend**: NestJS (TypeScript).
- **Database**: PostgreSQL (Prisma ORM or TypeORM).
- **Deployment**: Google Cloud Run (Frontend & Backend containers).

## Database Schema Design (Conceptual)

### `Profile` (Entity)
- `id`: UUID
- `type`: 'PERSONAL' | 'BUSINESS'
- `name`: String (e.g., "Personal", "Cafe A", "Online Store B")
- `businessNumber`: String (Optional, for businesses)

### `Transaction` (Entity)
- `id`: UUID
- `profileId`: MK -> Profile.id
- `date`: DateTime
- `type`: 'INCOME' | 'EXPENSE'
- `category`: String
- `amount`: Decimal
- `description`: String
- `taxDedudctible`: Boolean (For business expenses)

### `Loan` (Entity)
- `id`: UUID
- `profileId`: MK -> Profile
- `principal`: Decimal
- `interestRate`: Decimal
- `startDate`: Date
- `termMonths`: Integer
- `paymentType`: 'LEVEL_PAYMENT' | 'BALLOON' | 'LEVEL_PRINCIPAL'

### `TaxSchedule` (Entity)
- `id`: UUID
- `profileId`: MK -> Profile
- `taxType`: 'VAT' | 'INCOME_GLOBAL' | 'PROPERTY' | 'OTHER'
- `dueDate`: Date
- `isPaid`: Boolean
- `estimatedAmount`: Decimal

### `Asset` (Entity) - **[NEW]**
- `id`: UUID
- `profileId`: MK -> Profile
- `type`: 'CASH' | 'BANK' | 'REAL_ESTATE' | 'STOCK' | 'OTHER'
- `name`: String
- `balance`: Decimal

### `AiLog` (Entity)
- `id`: UUID
- `profileId`: MK -> Profile
- `message`: String
- `response`: String
- `createdAt`: DateTime

## Phase 1: Infrastructure & Project Init
#### [NEW] [docker-compose.yml](file:///docker-compose.yml)
- PostgreSQL & NestJS setup.

#### [NEW] [frontend/](file:///frontend/)
- **Setup Phase**:
    - `components/setup/Wizard.tsx`: Multi-step form (Profile Type -> Assets -> Debts).
    - `components/setup/ProfileTypeStep.tsx`: Card selection for Personal/Business.
    - `components/setup/AssetStep.tsx`: Dynamic inputs for Cash, Bank, Real Estate.
- **Dashboard Phase**:
    - `components/dashboard/SummaryCard.tsx`: Total Balance, Monthly Expense.
    - `components/dashboard/TransactionList.tsx`: Simple list view with icons.
    - `components/ui/*`: Shadcn UI (Card, Button, Input, Dialog).

#### [NEW] [backend/](file:///backend/)
- Initialize NestJS app.
- **Feature**: Excel/CSV Parser (SheetJS).
- **Feature**: AI Service Module (LangChain + OpenAI/Gemini Adapter).

## Phase 2: AI & Advanced Features
- **Frontend**: Floating Chat Widget.
- **Backend**: RAG (Retrieval-Augmented Generation) for transaction history query.

## Phase 3: Multi-User Support & Mapping Strategy

### Current Implementation (Single User)
- **transactionNameMappings**: 사용자별 (profileId 기반) ✓
- **merchantCategoryMappings**: 전역 (모든 사용자 공유)
- **keywordCategoryMappings**: 전역 (모든 사용자 공유)

### Future Multi-User Support
> [!IMPORTANT]
> **사용자별 매핑 우선순위**: 같은 키워드(예: "식당", "주유소")라도 사용자마다 다른 카테고리로 분류할 수 있어야 함
> 
> **구조 개선 방향**:
> - `merchantCategoryMappings`: 사용자별 + 전역 (우선순위: 사용자별 > 전역)
> - `keywordCategoryMappings`: 사용자별 + 전역 (우선순위: 사용자별 > 전역)
> 
> **예시**:
> - 사용자 A: "주유소" → "주유비"
> - 사용자 B: "주유소" → "교통비"
> - 전역 기본값: "주유소" → "주유비" (사용자별 매핑이 없을 때만 사용)

### Database Schema (Future)
```sql
-- 사용자별 가맹점 매핑
CREATE TABLE user_merchant_mappings (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id),
  merchant_name_normalized VARCHAR(255),
  category VARCHAR(50),
  created_at TIMESTAMP,
  UNIQUE(profile_id, merchant_name_normalized)
);

-- 사용자별 키워드 매핑
CREATE TABLE user_keyword_mappings (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id),
  keyword VARCHAR(255),
  category VARCHAR(50),
  created_at TIMESTAMP,
  UNIQUE(profile_id, keyword)
);

-- 전역 가맹점 매핑 (기본값, 사용자별 매핑이 없을 때 사용)
CREATE TABLE global_merchant_mappings (
  id UUID PRIMARY KEY,
  merchant_name_normalized VARCHAR(255),
  category VARCHAR(50),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  UNIQUE(merchant_name_normalized)
);
```

## Verification Plan
### Automated Tests
- Backend: Jest unit tests for `LoanCalculator` logic.
- Frontend: Build check `npm run build`.

### Manual Verification
- Create 1 personal + 2 business profiles.
- Input mixed transactions.
- Check Dashboard aggregations (Total vs Indivudal).
