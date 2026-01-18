'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  X, Target, CheckCircle, XCircle, Calculator, Info, Loader2,
  Building2, User, TrendingUp, TrendingDown, FileText, AlertTriangle, Users
} from 'lucide-react'
import { getKPIDetail, getEmployeesForPersonalKPI, type KPIDetailData, type EmployeeKPIOption } from '@/lib/actions/kpi-dashboard-actions'
import { SmartCombobox, type ComboboxOption } from '@/components/ui/smart-combobox'

interface KPIDetailModalProps {
  isOpen: boolean
  onClose: () => void
  kpiName: string
  year: number
  period: 'month' | 'quarter' | 'year'
  periodValue: number
  employeeId?: string // Fixed employee (for My KPI page)
  defaultEmployeeId?: string // Default selection (for Team Dashboard - current user)
}

// Personal KPIs that support employee filtering
const PERSONAL_KPIS = ['On-time Meeting Minutes', 'Required Docs On-time', 'Issue Clearing']

export function KPIDetailModal({
  isOpen,
  onClose,
  kpiName,
  year,
  period,
  periodValue,
  employeeId,
  defaultEmployeeId
}: KPIDetailModalProps) {
  const [data, setData] = useState<KPIDetailData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [employees, setEmployees] = useState<EmployeeKPIOption[]>([])
  // Use employeeId if fixed, otherwise use defaultEmployeeId as initial selection
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>(employeeId || defaultEmployeeId)
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)

  const isPersonalKPI = PERSONAL_KPIS.includes(kpiName)

  // Load employees list for Personal KPIs
  useEffect(() => {
    if (isOpen && kpiName && isPersonalKPI && !employeeId) {
      loadEmployees()
    }
  }, [isOpen, kpiName, year, period, periodValue])

  // Reset selected employee when modal opens
  // Priority: employeeId (fixed) > defaultEmployeeId (current user) > undefined (all)
  // Use ?? null to ensure consistent dependency array size
  useEffect(() => {
    if (isOpen) {
      setSelectedEmployeeId(employeeId || defaultEmployeeId)
    }
  }, [isOpen, employeeId ?? null, defaultEmployeeId ?? null])

  // Load KPI data when selection changes
  useEffect(() => {
    if (isOpen && kpiName) {
      loadData()
    }
  }, [isOpen, kpiName, year, period, periodValue, selectedEmployeeId])

  const loadEmployees = async () => {
    setIsLoadingEmployees(true)
    try {
      const result = await getEmployeesForPersonalKPI(kpiName, year, period, periodValue)
      setEmployees(result)
    } catch (error) {
      console.error('Error loading employees:', error)
    } finally {
      setIsLoadingEmployees(false)
    }
  }

  const loadData = async () => {
    setIsLoading(true)
    try {
      const result = await getKPIDetail(kpiName, year, period, periodValue, selectedEmployeeId)
      setData(result)
    } catch (error) {
      console.error('Error loading KPI detail:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmployeeChange = (empId: string) => {
    setSelectedEmployeeId(empId === 'all' ? undefined : empId)
  }

  // Convert employees to combobox options
  const employeeOptions: ComboboxOption[] = useMemo(() => {
    return employees.map(emp => ({
      value: emp.id,
      label: emp.name,
      description: `${emp.employeeCode} • ${emp.position}`
    }))
  }, [employees])

  if (!isOpen) return null

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Delivery': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'Quality': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'Availability': return 'bg-teal-100 text-teal-700 border-teal-200'
      case 'Personal': return 'bg-amber-100 text-amber-700 border-amber-200'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Delivery': return TrendingUp
      case 'Quality': return Target
      case 'Availability': return CheckCircle
      case 'Personal': return User
      default: return FileText
    }
  }

  const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

  const getPeriodLabel = () => {
    if (period === 'month') return `${monthNames[periodValue - 1]} ${year}`
    if (period === 'quarter') return `Q${periodValue} ${year}`
    return `${year}`
  }

  // Render table based on KPI type
  const renderDetailTable = () => {
    if (!data || data.details.length === 0) {
      return (
        <div className="text-center py-8 text-slate-500">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-slate-400" />
          <p>ไม่พบข้อมูลในช่วงเวลานี้</p>
        </div>
      )
    }

    // Department KPIs (Project-based)
    if (['Time to Delivery', 'Man-day Control', 'Defect Ratio', 'Post Go-live Rework', 'Deploy Success Rate', 'Pre-deploy Backup'].includes(kpiName)) {
      return (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left py-3 px-4 font-semibold text-slate-600">Project</th>
              {kpiName === 'Man-day Control' && (
                <>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Planned</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Actual</th>
                </>
              )}
              {kpiName === 'Defect Ratio' && (
                <>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Done</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Not Planned</th>
                </>
              )}
              {kpiName === 'Post Go-live Rework' && (
                <>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Rework Tasks</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Total Tasks</th>
                </>
              )}
              {(kpiName === 'Deploy Success Rate' || kpiName === 'Pre-deploy Backup') && (
                <>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Success/Backup</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Total</th>
                </>
              )}
              <th className="text-center py-3 px-4 font-semibold text-slate-600">%</th>
              <th className="text-center py-3 px-4 font-semibold text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.details.map((item: any, idx: number) => (
              <tr key={idx} className="hover:bg-slate-50/50">
                <td className="py-3 px-4">
                  <div>
                    <span className="font-medium text-slate-800">{item.project_code}</span>
                    <p className="text-xs text-slate-500">{item.project_name}</p>
                  </div>
                </td>
                {kpiName === 'Man-day Control' && (
                  <>
                    <td className="text-center py-3 px-4 text-slate-600">{item.planned_mandays || '-'}</td>
                    <td className="text-center py-3 px-4 text-slate-600">{item.actual_mandays || '-'}</td>
                  </>
                )}
                {kpiName === 'Defect Ratio' && (
                  <>
                    <td className="text-center py-3 px-4 text-slate-600">{item.done_count || 0}</td>
                    <td className="text-center py-3 px-4 text-slate-600">{item.done_not_planned_count || 0}</td>
                  </>
                )}
                {kpiName === 'Post Go-live Rework' && (
                  <>
                    <td className="text-center py-3 px-4 text-slate-600">{item.post_golive_tasks || 0}</td>
                    <td className="text-center py-3 px-4 text-slate-600">{item.total_tasks || 0}</td>
                  </>
                )}
                {kpiName === 'Deploy Success Rate' && (
                  <>
                    <td className="text-center py-3 px-4 text-slate-600">{item.success_count || 0}</td>
                    <td className="text-center py-3 px-4 text-slate-600">{item.total_deploys || 0}</td>
                  </>
                )}
                {kpiName === 'Pre-deploy Backup' && (
                  <>
                    <td className="text-center py-3 px-4 text-slate-600">{item.backup_count || 0}</td>
                    <td className="text-center py-3 px-4 text-slate-600">{item.total_deploys || 0}</td>
                  </>
                )}
                <td className="text-center py-3 px-4">
                  <span className={`font-bold ${item.status === 'ผ่าน' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {item.actual_percent}%
                  </span>
                </td>
                <td className="text-center py-3 px-4">
                  {item.status === 'ผ่าน' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                      <CheckCircle className="h-3 w-3" />
                      ผ่าน
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-medium">
                      <XCircle className="h-3 w-3" />
                      ไม่ผ่าน
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }

    // Personal KPIs (Employee-based)
    if (kpiName === 'On-time Meeting Minutes') {
      return (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left py-3 px-4 font-semibold text-slate-600">พนักงาน</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-600">Project</th>
              <th className="text-center py-3 px-4 font-semibold text-slate-600">Late</th>
              <th className="text-center py-3 px-4 font-semibold text-slate-600">Total</th>
              <th className="text-center py-3 px-4 font-semibold text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.details.map((item: any, idx: number) => (
              <tr key={idx} className="hover:bg-slate-50/50">
                <td className="py-3 px-4 font-medium text-slate-800">{item.employee_name}</td>
                <td className="py-3 px-4">
                  <span className="text-slate-600">{item.project_code}</span>
                  {item.project_name && <p className="text-xs text-slate-500">{item.project_name}</p>}
                </td>
                <td className="text-center py-3 px-4">
                  <span className={`font-bold ${item.late_count <= 3 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {item.late_count}
                  </span>
                </td>
                <td className="text-center py-3 px-4 text-slate-600">{item.total_meetings}</td>
                <td className="text-center py-3 px-4">
                  {item.status === 'ผ่าน' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                      <CheckCircle className="h-3 w-3" />
                      ผ่าน
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-medium">
                      <XCircle className="h-3 w-3" />
                      ไม่ผ่าน
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }

    if (kpiName === 'Required Docs On-time') {
      return (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left py-3 px-4 font-semibold text-slate-600">พนักงาน</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-600">Project</th>
              <th className="text-center py-3 px-4 font-semibold text-slate-600">On-time</th>
              <th className="text-center py-3 px-4 font-semibold text-slate-600">Total</th>
              <th className="text-center py-3 px-4 font-semibold text-slate-600">%</th>
              <th className="text-center py-3 px-4 font-semibold text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.details.map((item: any, idx: number) => (
              <tr key={idx} className="hover:bg-slate-50/50">
                <td className="py-3 px-4 font-medium text-slate-800">{item.employee_name}</td>
                <td className="py-3 px-4">
                  <span className="text-slate-600">{item.project_code}</span>
                  {item.project_name && <p className="text-xs text-slate-500">{item.project_name}</p>}
                </td>
                <td className="text-center py-3 px-4 text-slate-600">{item.ontime_count}</td>
                <td className="text-center py-3 px-4 text-slate-600">{item.total_docs}</td>
                <td className="text-center py-3 px-4">
                  <span className={`font-bold ${item.status === 'ผ่าน' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {item.actual_percent}%
                  </span>
                </td>
                <td className="text-center py-3 px-4">
                  {item.status === 'ผ่าน' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                      <CheckCircle className="h-3 w-3" />
                      ผ่าน
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-medium">
                      <XCircle className="h-3 w-3" />
                      ไม่ผ่าน
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }

    if (kpiName === 'Issue Clearing') {
      return (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left py-3 px-4 font-semibold text-slate-600">พนักงาน</th>
              <th className="text-center py-3 px-4 font-semibold text-slate-600">Cleared</th>
              <th className="text-center py-3 px-4 font-semibold text-slate-600">Pending</th>
              <th className="text-center py-3 px-4 font-semibold text-slate-600">Total</th>
              <th className="text-center py-3 px-4 font-semibold text-slate-600">%</th>
              <th className="text-center py-3 px-4 font-semibold text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.details.map((item: any, idx: number) => (
              <tr key={idx} className="hover:bg-slate-50/50">
                <td className="py-3 px-4 font-medium text-slate-800">{item.employee_name}</td>
                <td className="text-center py-3 px-4 text-emerald-600 font-medium">{item.cleared_tasks}</td>
                <td className="text-center py-3 px-4 text-amber-600 font-medium">{item.pending_count}</td>
                <td className="text-center py-3 px-4 text-slate-600">{item.total_tasks}</td>
                <td className="text-center py-3 px-4">
                  <span className={`font-bold ${item.status === 'ผ่าน' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {item.actual_percent}%
                  </span>
                </td>
                <td className="text-center py-3 px-4">
                  {item.status === 'ผ่าน' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                      <CheckCircle className="h-3 w-3" />
                      ผ่าน
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-medium">
                      <XCircle className="h-3 w-3" />
                      ไม่ผ่าน
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }

    return null
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${data ? getCategoryColor(data.category) : 'bg-slate-100'}`}>
              {data && (() => {
                const Icon = getCategoryIcon(data.category)
                return <Icon className="h-5 w-5" />
              })()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{kpiName}</h2>
              <p className="text-sm text-slate-500">{getPeriodLabel()}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Employee Filter for Personal KPIs (only in Team Dashboard mode) */}
            {isPersonalKPI && !employeeId && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-500" />
                <SmartCombobox
                  options={employeeOptions}
                  value={selectedEmployeeId || 'all'}
                  onChange={handleEmployeeChange}
                  placeholder="เลือกพนักงาน"
                  searchPlaceholder="ค้นหาชื่อ, รหัส, ตำแหน่ง..."
                  emptyText="ไม่พบพนักงาน"
                  allLabel={`ทุกคน (${employees.length} คน)`}
                  isLoading={isLoadingEmployees}
                  className="min-w-[250px]"
                />
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Summary Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Score Card */}
                <div className={`p-4 rounded-xl border ${data.isPass ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className={`h-4 w-4 ${data.isPass ? 'text-emerald-600' : 'text-rose-600'}`} />
                    <span className="text-sm font-medium text-slate-600">ผลลัพธ์</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-bold ${data.isPass ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {data.actualValue}{kpiName === 'On-time Meeting Minutes' ? ' ครั้ง' : '%'}
                    </span>
                    <span className="text-sm text-slate-500">/ เป้า {data.target}</span>
                  </div>
                  <div className="mt-2">
                    {data.isPass ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                        <CheckCircle className="h-3 w-3" />
                        ผ่านเกณฑ์
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-medium">
                        <XCircle className="h-3 w-3" />
                        ไม่ผ่านเกณฑ์
                      </span>
                    )}
                  </div>
                </div>

                {/* Description Card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-600">คำอธิบาย</span>
                  </div>
                  <p className="text-sm text-slate-700">{data.description}</p>
                </div>

                {/* Formula Card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-600">สูตรคำนวณ</span>
                  </div>
                  <p className="text-sm text-slate-700 font-mono">{data.formula}</p>
                </div>
              </div>

              {/* Detail Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    รายละเอียดที่มาของข้อมูล ({data.details.length} รายการ)
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  {renderDetailTable()}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-slate-400" />
              <p>ไม่สามารถโหลดข้อมูลได้</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors font-medium"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}
