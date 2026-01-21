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
import { th } from 'date-fns/locale'
import { Search, Eye, Edit, MoreHorizontal, Plus } from 'lucide-react'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ProjectRequestDetailDialog } from '@/components/project-requests/ProjectRequestDetailDialog'
import { ProjectRequest } from '@/lib/actions/project-request-actions'

interface ProjectRequestListProps {
    requests: ProjectRequest[]
    customers: any[]
    requestTypes: any[]
    priorities: any[]
    currentUserId: string
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

export function ProjectRequestList({
    requests,
    customers,
    requestTypes,
    priorities,
    currentUserId
}: ProjectRequestListProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [search, setSearch] = useState(searchParams.get('search') || '')

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)

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

    const openCreateDialog = () => {
        setSelectedRequestId(null)
        setIsDialogOpen(true)
    }

    const openDetailDialog = (id: string) => {
        setSelectedRequestId(id)
        setIsDialogOpen(true)
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex flex-col space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl">รายการคำขอโครงการ</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    จัดการคำขอโครงการและสถานะการอนุมัติ
                                </p>
                            </div>
                            <Button onClick={openCreateDialog}>
                                <Plus className="h-4 w-4 mr-2" />
                                สร้างคำขอใหม่
                            </Button>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50/50 p-1 rounded-lg">
                            {/* Search & Filter Group */}
                            <div className="flex flex-1 w-full sm:w-auto gap-2 items-center">
                                <div className="relative flex-1 sm:max-w-[300px]">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="ค้นหาโครงการ หรือ ลูกค้า..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        className="pl-8 bg-white"
                                    />
                                </div>

                                <Select
                                    value={searchParams.get('status') || 'all'}
                                    onValueChange={handleStatusFilter}
                                >
                                    <SelectTrigger className="w-[180px] bg-white">
                                        <SelectValue placeholder="สถานะ: ทั้งหมด" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">สถานะ: ทั้งหมด</SelectItem>
                                        <SelectItem value="DRAFT">Draft</SelectItem>
                                        <SelectItem value="PENDING">Pending</SelectItem>
                                        <SelectItem value="APPROVED">Approved</SelectItem>
                                        <SelectItem value="REJECTED">Rejected</SelectItem>
                                        <SelectItem value="REVISION">Revision</SelectItem>
                                        <SelectItem value="CONVERTED">Converted</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Button variant="ghost" size="icon" onClick={handleSearch} className="shrink-0">
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>
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
                                <TableHead>เลขที่โครงการ</TableHead>
                                <TableHead>วันที่สร้าง</TableHead>
                                <TableHead>ผู้สร้าง</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {requests.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                                        ไม่พบข้อมูล
                                    </TableCell>
                                </TableRow>
                            ) : (
                                requests.map((request) => (
                                    <TableRow
                                        key={request.id}
                                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                                        onClick={() => openDetailDialog(request.id)}
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
                                            {request.converted_project_code ? (
                                                <span className="font-mono font-medium text-green-600">
                                                    {request.converted_project_code}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
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
                                                    <DropdownMenuItem onClick={() => openDetailDialog(request.id)}>
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        ดูรายละเอียด
                                                    </DropdownMenuItem>
                                                    {(request.status === 'DRAFT' || request.status === 'REVISION') && (
                                                        <DropdownMenuItem onClick={() => openDetailDialog(request.id)}>
                                                            <Edit className="h-4 w-4 mr-2" />
                                                            แก้ไข
                                                        </DropdownMenuItem>
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

            {/* Unified Detail/Create Dialog */}
            <ProjectRequestDetailDialog
                requestId={selectedRequestId}
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                currentUserId={currentUserId}
                customers={customers}
                requestTypes={requestTypes}
                priorities={priorities}
                onUpdateSuccess={() => {
                    setIsDialogOpen(false)
                    router.refresh()
                }}
            />
        </>
    )
}
