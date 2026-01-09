'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { TopNav } from './TopNav'
import { getSession } from '@/lib/actions/auth-actions'
import type { UserSession } from '@/lib/auth'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [user, setUser] = useState<UserSession | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const session = await getSession()
    setUser(session)
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top Navigation Only */}
      <TopNav 
        user={user}
        onMenuClick={() => {}}
      />

      {/* Full-width Main Content */}
      <main className="w-full">
        <div className="p-6 pt-20">
          {children}
        </div>
      </main>
    </div>
  )
}
