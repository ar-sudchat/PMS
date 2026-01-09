'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Transition } from '@headlessui/react'
import { 
  ChevronDown, 
  Layers, 
  Bell, 
  Search,
  Menu as MenuIcon,
  User,
  Settings,
  LogOut
} from 'lucide-react'
import { MENU_CONFIG, filterMenuByRole, MenuModule } from '@/config/menu'
import { logout } from '@/lib/actions/auth-actions'
import type { UserSession } from '@/lib/auth'
import { cn } from '@/lib/utils'

interface TopNavProps {
  user: UserSession | null
  onMenuClick: () => void
}

export function TopNav({ user, onMenuClick }: TopNavProps) {
  const pathname = usePathname()
  
  const menu: MenuModule[] = user 
    ? filterMenuByRole(MENU_CONFIG, user.role as any)
    : MENU_CONFIG

  const handleLogout = async () => {
    await logout()
  }

  return (
    <nav className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 shadow-lg sticky top-0 z-40">
      <div className="px-4 lg:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <MenuIcon className="w-5 h-5" />
            </button>

            <Link href="/" className="flex items-center gap-3 group">
              <div className="h-9 w-9 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-indigo-500/50 transition-shadow">
                <Layers className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight hidden sm:block">
                ProjectHub
              </span>
            </Link>
          </div>

          <div className="hidden lg:flex items-center space-x-1">
            {menu.map((module) => {
              const Icon = module.icon
              const isActive = module.children.some(group => 
                group.children.some(item => pathname === item.path)
              )

              return (
                <Menu key={module.id} as="div" className="relative">
                  {({ open }) => (
                    <>
                      <Menu.Button
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                          open || isActive
                            ? "bg-slate-700 text-white shadow-lg"
                            : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{module.title}</span>
                        <ChevronDown className={cn(
                          "h-4 w-4 transition-transform",
                          open && "rotate-180"
                        )} />
                      </Menu.Button>

                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <Menu.Items className="absolute left-0 mt-2 w-72 origin-top-left bg-white rounded-xl shadow-2xl ring-1 ring-black/5 focus:outline-none z-50 overflow-hidden">
                          {module.children.map((group) => (
                            <div key={group.id} className="p-2">
                              <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 rounded-lg">
                                {group.title}
                              </div>
                              <div className="mt-1 space-y-0.5">
                                {group.children.map((item) => {
                                  const ItemIcon = item.icon
                                  const isItemActive = pathname === item.path

                                  return (
                                    <Menu.Item key={item.id}>
                                      {({ active }) => (
                                        <Link
                                          href={item.path || '#'}
                                          className={cn(
                                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                                            isItemActive
                                              ? "bg-indigo-50 text-indigo-700 font-medium"
                                              : active
                                                ? "bg-slate-100 text-slate-900"
                                                : "text-slate-700 hover:bg-slate-50"
                                          )}
                                        >
                                          {ItemIcon && (
                                            <ItemIcon className={cn(
                                              "w-4 h-4",
                                              isItemActive ? "text-indigo-600" : "text-slate-400"
                                            )} />
                                          )}
                                          <span className="flex-1">{item.label}</span>
                                        </Link>
                                      )}
                                    </Menu.Item>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </Menu.Items>
                      </Transition>
                    </>
                  )}
                </Menu>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 hidden sm:block">
              <Search className="w-5 h-5" />
            </button>

            <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                  {user?.nameTh?.charAt(0) || user?.name?.charAt(0) || 'U'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-white truncate max-w-[120px]">
                    {user?.nameTh || user?.name || 'User'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {user?.role || 'member'}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
              </Menu.Button>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-white rounded-xl shadow-2xl ring-1 ring-black/5 focus:outline-none z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-medium text-slate-900">
                      {user?.nameTh || user?.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {user?.employeeCode} • {user?.email}
                    </p>
                  </div>

                  <div className="p-2">
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          href="/profile"
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
                            active ? "bg-slate-100" : ""
                          )}
                        >
                          <User className="w-4 h-4 text-slate-400" />
                          <span>โปรไฟล์</span>
                        </Link>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          href="/settings"
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
                            active ? "bg-slate-100" : ""
                          )}
                        >
                          <Settings className="w-4 h-4 text-slate-400" />
                          <span>ตั้งค่า</span>
                        </Link>
                      )}
                    </Menu.Item>
                  </div>

                  <div className="p-2 border-t">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={handleLogout}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full text-red-600",
                            active ? "bg-red-50" : ""
                          )}
                        >
                          <LogOut className="w-4 h-4" />
                          <span>ออกจากระบบ</span>
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>
    </nav>
  )
}
