'use client'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
    Phone,
    Mail,
    Calendar,
} from 'lucide-react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { MKT_STAGES } from '@/lib/constants/mkt-stages'
import { MktProject } from '@/lib/actions/mkt-tracking-actions'

interface MktProjectTableProps {
    projects: MktProject[]
    onEdit: (project: MktProject) => void
}

const stageColors: Record<string, string> = {
    NEW: 'bg-blue-100 text-blue-800',
    CONTACT: 'bg-purple-100 text-purple-800',
    ESTIMATING: 'bg-yellow-100 text-yellow-800',
    QUOTED: 'bg-green-100 text-green-800',
}

export function MktProjectTable({ projects, onEdit }: MktProjectTableProps) {
    const formatCurrency = (value: number | null | undefined) => {
        if (!value) return '-'
        return new Intl.NumberFormat('th-TH').format(value) + ' บาท'
    }

    const formatDate = (date: string | Date | null | undefined) => {
        if (!date) return '-'
        return format(new Date(date), 'dd MMM yyyy', { locale: th })
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[100px]">รหัส</TableHead>
                        <TableHead>ชื่อโครงการ</TableHead>
                        <TableHead>ลูกค้า</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>มูลค่า</TableHead>
                        <TableHead>ผู้ติดต่อ</TableHead>
                        <TableHead>วันนัดประชุม</TableHead>
                        <TableHead>วันประชุมล่าสุด</TableHead>
                        <TableHead>วันส่งราคา</TableHead>
                        <TableHead className="text-center">วันในสถานะ</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {projects.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                ไม่พบข้อมูล
                            </TableCell>
                        </TableRow>
                    ) : (
                        projects.map((project) => (
                            <TableRow
                                key={project.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => onEdit(project)}
                            >
                                <TableCell className="font-medium">
                                    {project.project_code}
                                </TableCell>
                                <TableCell>
                                    <div className="max-w-[200px] font-medium truncate">
                                        {project.title}
                                    </div>
                                </TableCell>
                                <TableCell>{project.client_name || '-'}</TableCell>
                                <TableCell>
                                    <Badge className={stageColors[project.mkt_stage] || 'bg-gray-100'}>
                                        {MKT_STAGES.find(s => s.code === project.mkt_stage)?.label || project.mkt_stage}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    {formatCurrency(project.mkt_expected_value)}
                                </TableCell>
                                <TableCell>
                                    {project.mkt_contact_person && (
                                        <div className="space-y-1">
                                            <div className="text-sm">{project.mkt_contact_person}</div>
                                            {project.mkt_contact_phone && (
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Phone className="h-3 w-3" />
                                                    {project.mkt_contact_phone}
                                                </div>
                                            )}
                                            {project.mkt_contact_email && (
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Mail className="h-3 w-3" />
                                                    {project.mkt_contact_email}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {!project.mkt_contact_person && '-'}
                                </TableCell>
                                <TableCell>
                                    {project.mkt_meeting_date && (
                                        <div className="flex items-center gap-1 text-sm">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            {formatDate(project.mkt_meeting_date)}
                                        </div>
                                    )}
                                    {!project.mkt_meeting_date && '-'}
                                </TableCell>
                                <TableCell>
                                    {formatDate(project.mkt_last_meeting_date)}
                                </TableCell>
                                <TableCell>
                                    {formatDate(project.mkt_quote_sent_date)}
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="outline">
                                        {project.days_in_stage} วัน
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
