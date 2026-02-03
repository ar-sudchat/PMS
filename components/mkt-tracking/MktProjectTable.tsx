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
import { format } from 'date-fns'
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
    const formatDate = (date: string | Date | null | undefined) => {
        if (!date) return '-'
        return format(new Date(date), 'dd-MM-yy')
    }

    // Extract first name only
    const getFirstName = (fullName: string | null | undefined) => {
        if (!fullName) return '-'
        return fullName.split(' ')[0]
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
                        <TableHead>ผู้จัดการ</TableHead>
                        <TableHead>เจ้าของ</TableHead>
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
                                <TableCell>
                                    <span className="truncate block max-w-[150px]">
                                        {project.client_name || '-'}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <Badge className={stageColors[project.mkt_stage] || 'bg-gray-100'}>
                                        {MKT_STAGES.find(s => s.code === project.mkt_stage)?.label || project.mkt_stage}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {getFirstName(project.project_manager_name)}
                                </TableCell>
                                <TableCell>
                                    {getFirstName(project.project_owner_name)}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                    {formatDate(project.mkt_meeting_date)}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                    {formatDate(project.mkt_last_meeting_date)}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
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
