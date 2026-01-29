'use client'

import { useRouter } from 'next/navigation'
import { Sidebar } from './sidebar'
import { createClient } from '@/lib/supabase/client'
import { Toaster } from '@/components/ui/sonner'

interface DashboardLayoutProps {
  children: React.ReactNode
  storeName?: string
  storeLogo?: string | null
}

export function DashboardLayout({ children, storeName, storeLogo }: DashboardLayoutProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        storeName={storeName} 
        storeLogo={storeLogo} 
        onLogout={handleLogout} 
      />
      
      {/* Main content */}
      <main className="lg:pl-64 min-h-screen">
        <div className="p-4 pt-16 lg:pt-4 lg:p-8">
          {children}
        </div>
      </main>

      <Toaster position="top-right" richColors />
    </div>
  )
}
