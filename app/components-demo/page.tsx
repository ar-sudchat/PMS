"use client"

import * as React from "react"
import {
  BarChart3,
  Bell,
  Calendar,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  Folder,
  Home,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Rocket,
  Search,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react"

const avatarColors = [
  "from-red-400 to-rose-500",
  "from-orange-400 to-amber-500",
  "from-amber-400 to-yellow-500",
  "from-lime-400 to-green-500",
  "from-emerald-400 to-teal-500",
  "from-cyan-400 to-blue-500",
  "from-blue-400 to-indigo-500",
  "from-indigo-400 to-purple-500",
  "from-purple-400 to-pink-500",
  "from-pink-400 to-rose-500",
]

function getAvatarColor(name: string): string {
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return avatarColors[hash % avatarColors.length]
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const statusColors = {
  online: "bg-emerald-500",
  away: "bg-amber-500",
  busy: "bg-red-500",
  offline: "bg-slate-400",
}

const projects = [
  {
    name: "E-Commerce Website",
    progress: 72,
    tasks: "18 of 25 tasks",
    due: "Jan 15",
    color: "from-indigo-500 to-purple-500",
  },
  {
    name: "Mobile App Redesign",
    progress: 48,
    tasks: "12 of 25 tasks",
    due: "Feb 02",
    color: "from-cyan-500 to-blue-500",
  },
  {
    name: "API Development",
    progress: 85,
    tasks: "34 of 40 tasks",
    due: "Dec 22",
    color: "from-emerald-500 to-teal-500",
  },
]

const team = [
  { name: "Alice Johnson", role: "Product Owner", workload: 60, tasks: 5, status: "online" },
  { name: "Bob Smith", role: "Frontend Dev", workload: 85, tasks: 8, status: "away" },
  { name: "Charlie Brown", role: "Backend Dev", workload: 70, tasks: 6, status: "online" },
  { name: "Diana Prince", role: "UI Designer", workload: 45, tasks: 4, status: "offline" },
]

const quickStats = [
  { label: "Open Projects", value: "14", trend: "+2 this week", color: "from-indigo-500 to-purple-500" },
  { label: "Tasks Due", value: "32", trend: "8 today", color: "from-pink-500 to-rose-500" },
  { label: "Team Members", value: "18", trend: "3 new", color: "from-cyan-500 to-blue-500" },
  { label: "Avg. Progress", value: "76%", trend: "Up 6%", color: "from-emerald-500 to-teal-500" },
]

const menuItems = [
  { label: "Home", icon: Home },
  { label: "Dashboard", icon: LayoutGrid },
  { label: "My Tasks", icon: CheckSquare, count: 12, active: true },
  { label: "Calendar", icon: Calendar },
  { label: "Reports", icon: BarChart3 },
  { label: "Notifications", icon: Bell, count: 3 },
]

const projectItems = ["E-Commerce", "Mobile App", "API Development", "New Project"]

export default function ComponentsDemo() {
  const [projectsOpen, setProjectsOpen] = React.useState(true)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden lg:flex w-72 flex-col bg-gradient-to-b from-slate-900 to-slate-950 text-slate-300 border-r border-white/5">
          <div className="px-6 py-5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">PHProjectHub</h1>
                <p className="text-xs text-slate-500">Project Management</p>
              </div>
            </div>
          </div>

          <div className="px-4 py-4">
            <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-400 hover:bg-slate-800 hover:border-slate-600 transition-all cursor-pointer">
              <Search className="w-4 h-4" />
              <span className="text-sm">Search...</span>
              <kbd className="ml-auto px-2 py-0.5 text-[10px] bg-slate-700 rounded-md">⌘K</kbd>
            </div>
          </div>

          <div className="px-4 py-2 text-xs uppercase tracking-widest text-slate-500">Main Menu</div>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              if (item.active) {
                return (
                  <a
                    key={item.label}
                    className="flex items-center gap-3 px-4 py-2.5 mx-3 rounded-xl text-white bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/20 shadow-lg shadow-indigo-500/5"
                  >
                    <Icon className="w-5 h-5 text-indigo-400" />
                    <span className="font-medium">{item.label}</span>
                    {item.count ? (
                      <span className="ml-auto px-2 py-0.5 text-xs bg-indigo-500 text-white rounded-full">{item.count}</span>
                    ) : null}
                  </a>
                )
              }

              return (
                <a
                  key={item.label}
                  className="flex items-center gap-3 px-4 py-2.5 mx-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200 group"
                >
                  <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="font-medium">{item.label}</span>
                  {item.count ? (
                    <span className="ml-auto px-2 py-0.5 text-xs bg-slate-700 text-white rounded-full">{item.count}</span>
                  ) : null}
                </a>
              )}
            )}
          </nav>

          <div className="px-4 pt-4 text-xs uppercase tracking-widest text-slate-500">Projects</div>
          <button
            onClick={() => setProjectsOpen((prev) => !prev)}
            className="flex items-center gap-3 px-4 py-2.5 mx-3 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all duration-200"
          >
            <Folder className="w-5 h-5" />
            <span className="font-medium">Projects</span>
            <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${projectsOpen ? "rotate-180" : "rotate-0"}`} />
          </button>
          {projectsOpen ? (
            <div className="mt-1 space-y-1">
              {projectItems.map((item) => (
                <a
                  key={item}
                  className="flex items-center gap-3 px-4 py-2 mx-6 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200"
                >
                  <span className="text-slate-600">•</span>
                  <span className="text-sm">{item}</span>
                  {item === "New Project" ? (
                    <Plus className="w-3.5 h-3.5 ml-auto text-indigo-400" />
                  ) : null}
                </a>
              ))}
            </div>
          ) : null}

          <div className="mt-auto">
            <div className="mx-4 my-4 border-t border-white/5" />
            <div className="mx-3 p-3 bg-slate-800/50 border border-slate-700/50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                    UN
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">User Name</p>
                  <p className="text-xs text-slate-500 truncate">user@example.com</p>
                </div>
                <button className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1">
          <div className="px-6 md:px-10 py-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Project Overview</p>
                <h2 className="text-3xl md:text-4xl font-semibold text-slate-900">
                  Welcome back, <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Arti</span>
                </h2>
                <p className="mt-2 text-slate-600">Track progress, manage workload, and deliver on time.</p>
              </div>
              <div className="flex items-center gap-3">
                <button className="px-4 py-2 text-sm font-medium bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors">
                  Share Update
                </button>
                <button className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-shadow">
                  + New Project
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              {quickStats.map((stat) => (
                <div
                  key={stat.label}
                  className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm shadow-slate-200/50 hover:shadow-lg hover:shadow-slate-200/70 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500">{stat.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-800">{stat.value}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-lg`}>
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">{stat.trend}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm shadow-slate-200/50 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">Project Progress</h3>
                      <p className="text-sm text-slate-500">Track your project milestones</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors">
                    View All →
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  {projects.map((project) => (
                    <div
                      key={project.name}
                      className="group p-4 bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 rounded-xl transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${project.color}`} />
                          <span className="font-medium text-slate-700">{project.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-indigo-600">{project.progress}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${project.color} rounded-full transition-all duration-500`}
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                        <span>{project.tasks}</span>
                        <span>Due: {project.due}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm shadow-slate-200/50 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">Team Workload</h3>
                      <p className="text-sm text-slate-500">Current task distribution</p>
                    </div>
                  </div>
                  <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {team.map((member) => (
                      <div
                        key={member.name}
                        className="group p-4 bg-gradient-to-br from-slate-50 to-white border border-slate-200 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 rounded-2xl transition-all duration-300 cursor-pointer"
                      >
                        <div className="flex items-start gap-4">
                          <div className="relative">
                            <div
                              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getAvatarColor(member.name)} flex items-center justify-center text-white text-lg font-bold shadow-lg`}
                            >
                              {getInitials(member.name)}
                            </div>
                            <div
                              className={`absolute -bottom-1 -right-1 w-4 h-4 ${statusColors[member.status as keyof typeof statusColors]} border-2 border-white rounded-full`}
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-800">{member.name}</h4>
                            <p className="text-sm text-slate-500">{member.role}</p>
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-slate-500">Workload</span>
                                <span className="font-semibold text-slate-700">{member.tasks} Tasks</span>
                              </div>
                              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full bg-gradient-to-r ${getAvatarColor(member.name)} rounded-full`}
                                  style={{ width: `${member.workload}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm shadow-slate-200/50 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <ClipboardList className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">Priority Tasks</h3>
                      <p className="text-sm text-slate-500">What needs attention today</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors">
                    See Board
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  {[
                    { title: "Finalize landing page", team: "Marketing", priority: "Urgent", color: "bg-red-500" },
                    { title: "API gateway load test", team: "Backend", priority: "High", color: "bg-orange-500" },
                    { title: "Update design system", team: "Design", priority: "Medium", color: "bg-amber-500" },
                  ].map((task) => (
                    <div
                      key={task.title}
                      className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all"
                    >
                      <div className={`w-2.5 h-10 rounded-full ${task.color}`} />
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">{task.title}</p>
                        <p className="text-xs text-slate-500">{task.team} Team</p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold text-white rounded-full ${task.color}`}>
                        {task.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm shadow-slate-200/50 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">Upcoming</h3>
                    <p className="text-sm text-slate-500">Calendar highlights</p>
                  </div>
                  <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  {[
                    { title: "Sprint Review", time: "Today · 2:00 PM", tag: "Team" },
                    { title: "Client Demo", time: "Tomorrow · 10:00 AM", tag: "External" },
                    { title: "Design Sync", time: "Fri · 4:30 PM", tag: "UX" },
                  ].map((event) => (
                    <div key={event.title} className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all">
                      <p className="font-medium text-slate-800">{event.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{event.time}</p>
                      <span className="inline-flex mt-3 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-full">
                        {event.tag}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
