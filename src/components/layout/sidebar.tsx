'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  LayoutDashboard,
  Package,
  Boxes,
  Tag,
  FolderOpen,
  ShoppingCart,
  ClipboardList,
  Users,
  Wallet,
  BarChart3,
  Settings,
  Menu,
  LogOut,
  ChevronLeft,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, highlight: false },
  { name: 'Produtos', href: '/produtos', icon: Package, highlight: false },
  { name: 'Categorias', href: '/categorias', icon: FolderOpen, highlight: false },
  { name: 'Estoque', href: '/estoque', icon: Boxes, highlight: false },
  { name: 'Combos', href: '/combos', icon: ShoppingCart, highlight: false },
  { name: 'Ofertas', href: '/ofertas', icon: Tag, highlight: false },
  { name: 'Pedidos', href: '/pedidos', icon: ClipboardList, highlight: true },
  { name: 'Clientes', href: '/clientes', icon: Users, highlight: false },
  { name: 'Financeiro', href: '/financeiro', icon: Wallet, highlight: false },
  { name: 'Relatórios', href: '/relatorios', icon: BarChart3, highlight: false },
  { name: 'Configurações', href: '/configuracoes', icon: Settings, highlight: false },
]

interface SidebarProps {
  storeName?: string
  storeLogo?: string | null
  onLogout: () => void
}

function SidebarContent({ storeName = 'Minha Loja', onLogout }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4">
        <h1 className="text-xl font-bold truncate">{storeName}</h1>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))
            const isHighlight = item.highlight && !isActive
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : isHighlight
                      ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 border border-orange-300/50 dark:border-orange-700/50 font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5', isHighlight && 'text-orange-500')} />
                {item.name}
                {isHighlight && (
                  <span className="ml-auto flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                )}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Logout */}
      <div className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={onLogout}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sair
        </Button>
      </div>
    </div>
  )
}

export function Sidebar({ storeName, storeLogo, onLogout }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-card border-r transition-all duration-300',
          collapsed ? 'lg:w-16' : 'lg:w-64'
        )}
      >
        {collapsed ? (
          <CollapsedSidebar onExpand={() => setCollapsed(false)} onLogout={onLogout} />
        ) : (
          <>
            <SidebarContent storeName={storeName} storeLogo={storeLogo} onLogout={onLogout} />
            <Button
              variant="ghost"
              size="icon"
              className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background"
              onClick={() => setCollapsed(true)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </>
        )}
      </aside>

      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-4 left-4 z-40"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent storeName={storeName} storeLogo={storeLogo} onLogout={onLogout} />
        </SheetContent>
      </Sheet>
    </>
  )
}

function CollapsedSidebar({ onExpand, onLogout }: { onExpand: () => void; onLogout: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col items-center py-4">
      <Button
        variant="ghost"
        size="icon"
        className="mb-4"
        onClick={onExpand}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <nav className="flex-1 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))
          const isHighlight = item.highlight && !isActive
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : isHighlight
                    ? 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              title={item.name}
            >
              <item.icon className="h-5 w-5" />
              {isHighlight && (
                <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
              )}
            </Link>
          )
        })}
      </nav>

      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-foreground"
        onClick={onLogout}
        title="Sair"
      >
        <LogOut className="h-5 w-5" />
      </Button>
    </div>
  )
}
