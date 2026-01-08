"use client"

import * as React from "react"
import Link from "next/link"
import { MainLayout } from "@/components/layout/MainLayout"
import { Card } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import {
    User,
    Building2,
    Bell,
    ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"

const settingsLinks = [
    {
        label: "Profile",
        description: "Manage your personal information and preferences",
        href: "/settings/profile",
        icon: <User className="h-5 w-5" />,
    },
    {
        label: "Workspace",
        description: "Configure workspace settings and integrations",
        href: "/settings/workspace",
        icon: <Building2 className="h-5 w-5" />,
    },
    {
        label: "Notifications",
        description: "Control how you receive notifications",
        href: "/settings/notifications",
        icon: <Bell className="h-5 w-5" />,
    },
]

export default function SettingsPage() {
    return (
        <MainLayout
            title="Settings"
            breadcrumb={[{ label: "Settings" }]}
        >
            <div className="max-w-2xl">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Settings</h1>

                {/* User Card */}
                <Card className="p-6 mb-6">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16" name="John Doe" />
                        <div>
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">John Doe</h2>
                            <p className="text-slate-500">john@projecthub.com</p>
                            <p className="text-sm text-indigo-600 mt-1">Admin</p>
                        </div>
                    </div>
                </Card>

                {/* Settings Links */}
                <div className="space-y-2">
                    {settingsLinks.map((link) => (
                        <Link key={link.href} href={link.href}>
                            <Card className="p-4 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                        {link.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                                            {link.label}
                                        </h3>
                                        <p className="text-sm text-slate-500">{link.description}</p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </MainLayout>
    )
}
