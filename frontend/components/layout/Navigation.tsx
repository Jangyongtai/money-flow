"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Wallet, CreditCard, TrendingDown, TrendingUp, FileText, LayoutDashboard, Calendar, ChevronDown } from "lucide-react"

const menuItems = [
  { 
    key: "finance-schedule", 
    label: "금융일정", 
    path: "/finance-schedule", 
    icon: Calendar,
    subMenus: [
      { label: "달력 보기", path: "/finance-schedule?view=calendar" },
      { label: "목록 보기", path: "/finance-schedule?view=list" },
    ]
  },
  { 
    key: "memo", 
    label: "메모", 
    path: "/memo", 
    icon: FileText,
  },
  { 
    key: "assets", 
    label: "자산", 
    path: "/", 
    icon: Wallet,
    subMenus: [
      { label: "자산 목록", path: "/?tab=assets" },
      { label: "자산 추가", path: "/?tab=assets&action=add" },
    ]
  },
  { 
    key: "debts", 
    label: "부채", 
    path: "/", 
    icon: CreditCard,
    subMenus: [
      { label: "부채 목록", path: "/?tab=debts" },
      { label: "부채 추가", path: "/?tab=debts&action=add" },
    ]
  },
  { 
    key: "expenses", 
    label: "정기지출", 
    path: "/", 
    icon: TrendingDown,
    subMenus: [
      { label: "지출 목록", path: "/?tab=expenses" },
      { label: "지출 추가", path: "/?tab=expenses&action=add" },
    ]
  },
  { 
    key: "incomes", 
    label: "정기수입", 
    path: "/", 
    icon: TrendingUp,
    subMenus: [
      { label: "수입 목록", path: "/?tab=incomes" },
      { label: "수입 추가", path: "/?tab=incomes&action=add" },
    ]
  },
  { 
    key: "transactions", 
    label: "가계부", 
    path: "/transactions", 
    icon: FileText,
    subMenus: [
      { label: "거래 내역", path: "/transactions" },
      { label: "파일 업로드", path: "/transactions#upload" },
      { label: "패턴 분석", path: "/transactions#analysis" },
    ]
  },
  { 
    key: "dashboard", 
    label: "대시보드", 
    path: "/dashboard", 
    icon: LayoutDashboard,
    subMenus: [
      { label: "요약", path: "/dashboard" },
      { label: "자산 현황", path: "/dashboard#assets" },
      { label: "부채 현황", path: "/dashboard#debts" },
    ]
  },
]

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null)

  console.log("[Navigation] Rendered, pathname:", pathname, "currentTab:", searchParams.get("tab"))

  // Wizard 페이지에서 탭으로 처리할 항목들
  const isWizardPage = pathname === "/"
  const wizardTabs = ["assets", "debts", "expenses", "incomes"]
  const currentTab = searchParams.get("tab") || "assets"
  
  const handleNavigation = (item: typeof menuItems[0], subPath?: string) => {
    const targetPath = subPath || item.path
    console.log("[Navigation] handleNavigation:", item.key, targetPath)
    
    if (targetPath === "/" && wizardTabs.includes(item.key)) {
      // Wizard 페이지 내에서 탭 전환 - URL 쿼리 파라미터 사용
      const newPath = `/?tab=${item.key}`
      console.log("[Navigation] Pushing to:", newPath)
      router.push(newPath)
    } else {
      console.log("[Navigation] Pushing to:", targetPath)
      router.push(targetPath)
    }
    setOpenSubMenu(null)
  }

  const handleMenuClick = (item: typeof menuItems[0], e: React.MouseEvent) => {
    console.log("[Navigation] handleMenuClick:", item.key, "hasSubMenus:", !!item.subMenus?.length)
    e.stopPropagation()
    
    // 하위 메뉴가 있어도 메인 버튼 클릭 시에는 바로 네비게이션
    // 하위 메뉴는 화살표 아이콘 클릭 시에만 토글
    const target = e.target as HTMLElement
    const isChevronClick = target.closest('svg') || target.closest('.chevron-icon')
    
    if (item.subMenus && item.subMenus.length > 0 && isChevronClick) {
      // 화살표 아이콘 클릭 시에만 하위 메뉴 토글
      const newOpenState = openSubMenu === item.key ? null : item.key
      console.log("[Navigation] Toggling submenu:", newOpenState)
      setOpenSubMenu(newOpenState)
    } else {
      // 메인 버튼 클릭 시 바로 네비게이션
      handleNavigation(item)
    }
  }

  return (
    <nav className="sticky top-0 z-50 bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between h-14">
          {/* 로고 */}
          <div className="flex items-center gap-2 shrink-0 mr-4">
            <a href="/" className="text-xl leading-none" aria-label="Home">
              💰
            </a>
            <span className="hidden lg:inline text-lg font-bold text-blue-600 hover:text-blue-700 transition-colors">
              Personal Finance
            </span>
          </div>
          
          <div className="flex items-center gap-0.5 sm:gap-1 flex-1 overflow-x-auto scrollbar-hide relative">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = 
                item.path === "/" 
                  ? pathname === "/" && currentTab === item.key
                  : pathname.startsWith(item.path)
              const isSubMenuOpen = openSubMenu === item.key
              
              return (
                <div key={item.key} className="relative shrink-0">
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    onClick={(e) => handleMenuClick(item, e)}
                    className={cn(
                      "flex items-center gap-1.5 sm:gap-2 shrink-0 h-10 px-2 sm:px-3 rounded-lg transition-all",
                      isActive 
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm" 
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium whitespace-nowrap hidden lg:inline">
                      {item.label}
                    </span>
                    <span className="text-xs font-medium whitespace-nowrap lg:hidden">
                      {{
                        assets: "자산",
                        debts: "부채",
                        expenses: "지출",
                        incomes: "수입",
                        transactions: "가계부",
                        dashboard: "대시",
                        "finance-schedule": "일정",
                      }[item.key] ?? (item.label.length > 3 ? item.label.slice(0, 2) : item.label)}
                    </span>
                    {item.subMenus && item.subMenus.length > 0 && (
                      <ChevronDown 
                        className={cn(
                          "w-3 h-3 shrink-0 transition-transform hidden sm:inline chevron-icon",
                          isSubMenuOpen && "rotate-180"
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          const newOpenState = openSubMenu === item.key ? null : item.key
                          console.log("[Navigation] Chevron clicked, toggling submenu:", newOpenState)
                          setOpenSubMenu(newOpenState)
                        }}
                      />
                    )}
                  </Button>
                  
                  {/* 하위 메뉴 */}
                  {isSubMenuOpen && item.subMenus && item.subMenus.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg min-w-[160px] z-50" style={{ pointerEvents: 'auto' }}>
                      {item.subMenus.map((subMenu, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleNavigation(item, subMenu.path)
                          }}
                          className={cn(
                            "w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors first:rounded-t-lg last:rounded-b-lg",
                            pathname === subMenu.path || (subMenu.path.includes("#") && pathname === item.path)
                              ? "bg-blue-50 text-blue-700 font-medium"
                              : "text-gray-700"
                          )}
                        >
                          {subMenu.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      
      {/* 하위 메뉴 외부 클릭 시 닫기 */}
      {openSubMenu && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => setOpenSubMenu(null)}
        />
      )}
    </nav>
  )
}

