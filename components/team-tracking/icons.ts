import {
    Briefcase,
    Code2,
    Bug,
    FileText,
    Phone,
    Users,
    Wrench,
    AlertTriangle,
    Clock,
    Check,
    ClipboardList,
    Megaphone,
    Search,
    type LucideIcon,
} from 'lucide-react'

export interface IconOption {
    name: string
    label: string
    Icon: LucideIcon
}

export const ICON_OPTIONS: IconOption[] = [
    { name: 'briefcase', label: 'งาน', Icon: Briefcase },
    { name: 'code', label: 'พัฒนา', Icon: Code2 },
    { name: 'bug', label: 'แก้บั๊ก', Icon: Bug },
    { name: 'document', label: 'เอกสาร', Icon: FileText },
    { name: 'meeting', label: 'ประชุม', Icon: Users },
    { name: 'call', label: 'โทร', Icon: Phone },
    { name: 'install', label: 'ติดตั้ง', Icon: Wrench },
    { name: 'issue', label: 'ปัญหา', Icon: AlertTriangle },
    { name: 'waiting', label: 'รอ', Icon: Clock },
    { name: 'done', label: 'เสร็จ', Icon: Check },
    { name: 'survey', label: 'สำรวจ', Icon: Search },
    { name: 'announce', label: 'แจ้ง', Icon: Megaphone },
    { name: 'task', label: 'Task', Icon: ClipboardList },
]

export const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
    ICON_OPTIONS.map((o) => [o.name, o.Icon])
)
