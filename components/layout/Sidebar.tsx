'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  ChevronDown, 
  ChevronLeft, 
  Menu as MenuIcon,
  X,
  LogOut
} from 'lucide-react'
import { MENU_CONFIG, QUICK_MENU, filterMenuByRole, MenuModule } from '@/config/menu'
import { logout } from '@/lib/actions/auth-actions'
import type { UserSession } from '@/lib/auth'
import { cn } from '@/lib/utils'

interface SidebarProps {
  user: UserSession | null
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ 
  user, 
  collapsed, 
  onToggle, 
  mobileOpen, 
  onMobileClose 
}: SidebarProps) {
  const pathname = usePathname()
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])

  const menu: MenuModule[] = user 
    ? filterMenuByRole(MENU_CONFIG, user.role as any)
    : MENU_CONFIG

  useEffect(() => {
    menu.forEach(module => {
      module.children.forEach(group => {
        const hasActiveItem = group.children.some(item => pathname === item.path)
        if (hasActiveItem && !expandedGroups.includes(group.id)) {
          setExpandedGroups(prev => [...prev, module.id, group.id])
        }
      })
    })
  }, [pathname])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId) 
        : [...prev, groupId]
    )
  }

  const handleLogout = async () => {
    await logout()
  }

  const SidebarContent = () => (
    <>
      <div className={cn(
        "h-14 flex items-center border-b border-slate-700/50 bg-slate-900/50 shrink-0",
        collapsed ? "justify-center px-2" : "justify-between px-4"
      )}>
        {!collapsed && (
          <span className="font-bold text-lg text-white">Menu</span>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hidden lg:block"
        >
          {collapsed ? <MenuIcon className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
        <button
          onClick={onMobileClose}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 lg:hidden"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {!collapsed && (
        <div className="p-3 border-b border-slate-700/50">
          <div className="flex gap-2">
            {QUICK_MENU.map(item => {
              const Icon = item.icon
              const isActive = pathname === item.path
              return (
                <Link
                  key={item.id}
                  href={item.path || '#'}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 p-2 rounded-lg text-xs transition-all",
                    isActive
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        {menu.map(module => (
          <div key={module.id} className="mb-4">
            {!collapsed && (
              <button
                onClick={() => toggleGroup(module.id)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-300"
              >
                <div className="flex items-center gap-2">
                  <module.icon className="w-4 h-4" />
                  <span>{module.title}</span>
                </div>
                <ChevronDown className={cn(
                  "w-3 h-3 transition-transform",
                  expandedGroups.includes(module.id) && "rotate-180"
                )} />
              </button>
            )}

            {collapsed && (
              <div className="flex justify-center py-2">
                <module.icon className="w-5 h-5 text-slate-500" />
              </div>
            )}

            {(expandedGroups.includes(module.id) || collapsed) && (
              <div className={cn("mt-1 space-y-1", collapsed && "space-y-2")}>
                {module.children.map(group => (
                  <div key={group.id}>
                    {!collapsed && (
                      <div className="px-3 py-1 text-[10px] font-medium text-slate-600 uppercase">
                        {group.title}
                      </div>
                    )}

                    {group.children.map(item => {
                      const Icon = item.icon
                      const isActive = pathname === item.path

                      return (
                        <Link
                          key={item.id}
                          href={item.path || '#'}
                          title={collapsed ? item.label : undefined}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                            isActive
                              ? "bg-indigo-600 text-white shadow-md"
                              : "text-slate-400 hover:bg-slate-800 hover:text-white",
                            collapsed && "justify-center px-2"
                          )}
                        >
                          {Icon && <Icon className={cn(
                            "w-4 h-4 shrink-0",
                            isActive ? "text-white" : "text-slate-500"
                          )} />}
                          {!collapsed && (
                            <span className="truncate">{item.label}</span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-slate-700/50 shrink-0">
        {!collapsed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                {user?.nameTh?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.nameTh || 'User'}
                </p>
                <p className="text-xs text-slate-500">
                  {user?.employeeCode}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 border border-red-500/20"
            >
              <LogOut className="w-4 h-4" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex justify-center p-2 rounded-lg text-red-400 hover:bg-red-500/10"
            title="ออกจากระบบ"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </>
  )

  return (
    <>
      <aside className={cn(
        "hidden lg:flex flex-col bg-slate-900 border-r border-slate-700/50 h-screen fixed top-14 left-0 z-30 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}>
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onMobileClose}
        />
      )}

      <aside className={cn(
        "lg:hidden fixed top-0 left-0 h-full w-72 bg-slate-900 z-50 transform transition-transform duration-300 flex flex-col",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent />
      </aside>
    </>
  )
}
