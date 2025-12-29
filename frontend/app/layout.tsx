import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import './globals.css'
import Navigation from '@/components/layout/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Personal Finance Flow',
  description: 'Smart Personal Finance Tracker',
}

function NavigationWrapper() {
  return <Navigation />
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <Suspense fallback={
          <nav className="sticky top-0 z-50 bg-white border-b shadow-sm h-14">
            <div className="max-w-7xl mx-auto px-2 sm:px-4 flex items-center h-full">
              <div className="text-lg font-bold text-blue-600">💰 Personal Finance</div>
            </div>
          </nav>
        }>
          <NavigationWrapper />
        </Suspense>
        {children}
      </body>
    </html>
  )
}
