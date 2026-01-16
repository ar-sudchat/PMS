// Task Assignment Status Configuration
// ============================================
// Tracks the workflow of task assignment from SA request to PM assignment

export interface AssignmentStatusConfig {
    value: string
    label: string
    label_th: string
    color: string
    bgColor: string
    icon: string
    description: string
}

export const ASSIGNMENT_STATUSES: AssignmentStatusConfig[] = [
    {
        value: 'requested',
        label: 'Requested',
        label_th: 'รอจ่ายงาน',
        color: '#F59E0B',
        bgColor: '#FEF3C7',
        icon: 'clock',
        description: 'SA เปิด Task รอ PM จ่ายงาน'
    },
    {
        value: 'assigned',
        label: 'Assigned',
        label_th: 'จ่ายงานแล้ว',
        color: '#10B981',
        bgColor: '#D1FAE5',
        icon: 'check-circle',
        description: 'PM จ่ายงานให้พนักงานแล้ว'
    }
]

// Helper functions
export const getAssignmentStatusConfig = (status: string): AssignmentStatusConfig | undefined => {
    return ASSIGNMENT_STATUSES.find(s => s.value === status)
}

export const getRequestedStatus = (): string => 'requested'
export const getAssignedStatus = (): string => 'assigned'

export const isTaskRequested = (status: string): boolean => status === 'requested'
export const isTaskAssigned = (status: string): boolean => status === 'assigned'
