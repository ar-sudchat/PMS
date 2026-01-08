"use client"

import * as React from "react"
import { MainLayout } from "@/components/layout/MainLayout"
import { Button } from "@/components/ui/button"
import { SummaryCard } from "@/components/dashboard/SummaryCard"
import { ProjectProgress } from "@/components/dashboard/ProjectProgress"
import { TeamWorkload } from "@/components/dashboard/TeamWorkload"
import { RecentActivities } from "@/components/dashboard/RecentActivities"
import {
  FolderKanban,
  ListTodo,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react"
import { getDashboardStats } from "@/lib/mock-data"

export default function DashboardPage() {
  const stats = getDashboardStats()

  return (
    <MainLayout>
      {/* Welcome Section */}
      <div className="mb-8 bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold mb-2">
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Welcome back, John!
              </span>{" "}
              <span className="inline-block animate-bounce">👋</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Here's what's happening with your projects today
            </p>
          </div>
          <Button variant="outline" size="sm" className="hidden sm:flex shadow-sm hover:shadow-md transition-shadow">
            <Clock className="h-4 w-4 mr-2" />
            Today
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <SummaryCard
          label="Total Projects"
          value={stats.totalProjects}
          change="+2 from last week"
          trend="up"
          icon={<FolderKanban className="h-5 w-5" />}
          gradientFrom="#6366F1"
          gradientTo="#8B5CF6"
        />
        <SummaryCard
          label="In Progress"
          value={stats.inProgress}
          change="-1 from last week"
          trend="down"
          icon={<ListTodo className="h-5 w-5" />}
          gradientFrom="#06B6D4"
          gradientTo="#3B82F6"
        />
        <SummaryCard
          label="Completed"
          value={stats.completed}
          change="+5 from last week"
          trend="up"
          icon={<CheckCircle2 className="h-5 w-5" />}
          gradientFrom="#10B981"
          gradientTo="#059669"
        />
        <SummaryCard
          label="Overdue"
          value={stats.overdue}
          change=""
          trend="critical"
          icon={<AlertTriangle className="h-5 w-5" />}
          gradientFrom="#F59E0B"
          gradientTo="#EF4444"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ProjectProgress />
        <RecentActivities />
      </div>

      {/* Team Workload */}
      <div className="mb-8">
        <TeamWorkload />
      </div>
    </MainLayout>
  )
}
