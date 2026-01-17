import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import type { TimesheetDashboardData } from '@/lib/actions/timesheet-dashboard-actions'

export function exportTimesheetToExcel(data: TimesheetDashboardData, year: number, month: number) {
  const workbook = XLSX.utils.book_new()

  // Sheet 1: Employee Summary
  const employeeData = data.employees.map(e => ({
    'Employee Code': e.employee_code || '',
    'Employee Name': e.employee_name,
    'Department': e.department_name,
    'Week 1': e.week1_hours || 0,
    'Week 2': e.week2_hours || 0,
    'Week 3': e.week3_hours || 0,
    'Week 4': e.week4_hours || 0,
    'Week 5': e.week5_hours || 0,
    'Total Hours': e.total_hours || 0,
    'Utilization %': e.utilization_percent || 0
  }))

  const ws1 = XLSX.utils.json_to_sheet(employeeData)
  // Set column widths
  ws1['!cols'] = [
    { wch: 15 }, // Employee Code
    { wch: 25 }, // Employee Name
    { wch: 20 }, // Department
    { wch: 10 }, // Week 1
    { wch: 10 }, // Week 2
    { wch: 10 }, // Week 3
    { wch: 10 }, // Week 4
    { wch: 10 }, // Week 5
    { wch: 12 }, // Total Hours
    { wch: 12 }  // Utilization %
  ]
  XLSX.utils.book_append_sheet(workbook, ws1, 'Employee Summary')

  // Sheet 2: Department Summary
  const deptData = data.departments.map(d => ({
    'Department': d.department_name,
    'Employee Count': d.employee_count,
    'Total Hours': d.total_hours || 0,
    'Avg Hours/Entry': d.avg_hours_per_entry || 0
  }))

  const ws2 = XLSX.utils.json_to_sheet(deptData)
  ws2['!cols'] = [
    { wch: 25 },
    { wch: 15 },
    { wch: 12 },
    { wch: 15 }
  ]
  XLSX.utils.book_append_sheet(workbook, ws2, 'By Department')

  // Sheet 3: Project Summary
  const projData = data.projects.map(p => ({
    'Project Code': p.project_code,
    'Project Name': p.project_name,
    'Total Hours': p.total_hours || 0,
    'Actual Man-days': p.actual_mandays || 0,
    'Planned Man-days': p.planned_mandays || 0,
    'Budget Used %': p.budget_used_percent || 0,
    'Employee Count': p.employee_count || 0
  }))

  const ws3 = XLSX.utils.json_to_sheet(projData)
  ws3['!cols'] = [
    { wch: 15 },
    { wch: 30 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 15 }
  ]
  XLSX.utils.book_append_sheet(workbook, ws3, 'By Project')

  // Sheet 4: Low Utilization
  if (data.lowUtil.length > 0) {
    const lowUtilData = data.lowUtil.map(e => ({
      'Employee Code': e.employee_code || '',
      'Employee Name': e.employee_name,
      'Department': e.department_name,
      'Total Hours': e.total_hours || 0,
      'Utilization %': e.utilization_percent || 0
    }))

    const ws4 = XLSX.utils.json_to_sheet(lowUtilData)
    ws4['!cols'] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 20 },
      { wch: 12 },
      { wch: 12 }
    ]
    XLSX.utils.book_append_sheet(workbook, ws4, 'Low Utilization')
  }

  // Sheet 5: Missing Timesheet
  if (data.missing.length > 0) {
    const missingData = data.missing.map(e => ({
      'Employee Code': e.employee_code || '',
      'Employee Name': e.employee_name,
      'Department': e.department_name,
      'Last Entry Date': e.last_entry_date || 'Never',
      'Days Since Last Entry': e.days_since_last_entry || '-',
      'Status': e.status
    }))

    const ws5 = XLSX.utils.json_to_sheet(missingData)
    ws5['!cols'] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 20 },
      { wch: 15 },
      { wch: 18 },
      { wch: 15 }
    ]
    XLSX.utils.book_append_sheet(workbook, ws5, 'Missing Timesheet')
  }

  // Generate file and trigger download
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]
  const fileName = `Timesheet_${year}_${monthNames[month - 1]}.xlsx`

  // Write to buffer and save
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, fileName)
}
