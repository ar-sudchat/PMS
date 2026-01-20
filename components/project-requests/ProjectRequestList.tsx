'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow
} from '@/components/ui/table'
import { format } from 'date-fns'
import { th } from 'date-fns/locale' // Ensure 'th' is imported or handle dynamic import. 'date-fns/locale' usually has it.
import { Search, Eye, Edit, MoreHorizontal } from 'lucide-react'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import { ProjectRequest } from '@/lib/actions/project-request-actions'

interface ProjectRequestListProps {
    requests: ProjectRequest[]
}

const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    REVISION: 'bg-orange-100 text-orange-700',
    CONVERTED: 'bg-blue-100 text-blue-700'
}

const priorityColors: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-700',
    MEDIUM: 'bg-blue-100 text-blue-700',
    HIGH: 'bg-orange-100 text-orange-700',
    URGENT: 'bg-red-100 text-red-700'
}

export function ProjectRequestList({ requests }: ProjectRequestListProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [search, setSearch] = useState(searchParams.get('search') || '')

    const handleSearch = () => {
        const params = new URLSearchParams(searchParams.toString())
        if (search) {
            params.set('search', search)
        } else {
            params.delete('search')
        }
        router.push(`/project-requests?${params.toString()}`)
    }

    const handleStatusFilter = (status: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (status && status !== 'all') {
            params.set('status', status)
        } else {
            params.delete('status')
        }
        router.push(`/project-requests?${params.toString()}`)
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <CardTitle>รายการคำขอโครงการ</CardTitle>

                    <div className="flex gap-2">
                        {/* Search */}
                        <div className="flex gap-2">
                            <Input
                                placeholder="ค้นหา..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-[200px]"
                            />
                            <Button variant="outline" size="icon" onClick={handleSearch}>
                                <Search className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Status Filter */}
                        <Select
                            value={searchParams.get('status') || 'all'}
                            onValueChange={handleStatusFilter}
                        >
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="สถานะ" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">ทั้งหมด</SelectItem>
                                <SelectItem value="DRAFT">Draft</SelectItem>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="APPROVED">Approved</SelectItem>
                                <SelectItem value="REJECTED">Rejected</SelectItem>
                                <SelectItem value="REVISION">Revision</SelectItem>
                                <SelectItem value="CONVERTED">Converted</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>รหัส</TableHead>
                            <TableHead>ชื่อโครงการ</TableHead>
                            <TableHead>ลูกค้า</TableHead>
                            <TableHead>ประเภท</TableHead>
                            <TableHead>ความสำคัญ</TableHead>
                            <TableHead>สถานะ</TableHead>
                            <TableHead>วันที่สร้าง</TableHead>
                            <TableHead>ผู้สร้าง</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                                    ไม่พบข้อมูล
                                </TableCell>
                            </TableRow>
                        ) : (
                            requests.map((request) => (
                                <TableRow
                                    key={request.id}
                                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => router.push(`/project-requests/${request.id}`)}
                                >
                                    <TableCell className="font-mono text-sm">
                                        {request.request_code}
                                    </TableCell>
                                    <TableCell className="font-medium max-w-[200px] truncate">
                                        {request.title}
                                    </TableCell>
                                    <TableCell>{request.customer_name || '-'}</TableCell>
                                    <TableCell>{request.project_type_name}</TableCell>
                                    <TableCell>
                                        <Badge className={priorityColors[request.priority] || priorityColors.MEDIUM}>
                                            {request.priority_name || request.priority}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={statusColors[request.status] || statusColors.DRAFT}>
                                            {request.status_name || request.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {request.created_at ? format(new Date(request.created_at), 'dd MMM yyyy', { locale: th }) : '-'}
                                    </TableCell>
                                    <TableCell>{request.created_by_name}</TableCell>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger as={Button} variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <Link href={`/project-requests/${request.id}`}>
                                                    <DropdownMenuItem>
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        ดูรายละเอียด
                                                    </DropdownMenuItem>
                                                </Link>
                                                {(request.status === 'DRAFT' || request.status === 'REVISION') && (
                                                    <Link href={`/project-requests/${request.id}/edit`}>
                                                        <DropdownMenuItem>
                                                            <Edit className="h-4 w-4 mr-2" />
                                                            แก้ไข
                                                        </DropdownMenuItem>
                                                    </Link>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
