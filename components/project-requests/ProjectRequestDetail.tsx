
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

interface ProjectRequestDetailProps {
    request: any
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

export function ProjectRequestDetail({ request }: ProjectRequestDetailProps) {
    if (!request) return null

    return (
        <div className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>ข้อมูลโครงการ</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="font-medium text-gray-500">รหัสคำขอ</div>
                            <div className="col-span-2 font-mono">{request.request_code}</div>

                            <div className="font-medium text-gray-500">ชื่อโครงการ</div>
                            <div className="col-span-2 font-medium">{request.title}</div>

                            <div className="font-medium text-gray-500">ประเภท</div>
                            <div className="col-span-2">{request.project_type_name}</div>

                            <div className="font-medium text-gray-500">ความสำคัญ</div>
                            <div className="col-span-2">
                                <Badge className={priorityColors[request.priority]}>
                                    {request.priority_name || request.priority}
                                </Badge>
                            </div>

                            <div className="font-medium text-gray-500">สถานะ</div>
                            <div className="col-span-2">
                                <Badge className={statusColors[request.status]}>
                                    {request.status_name || request.status}
                                </Badge>
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <div className="font-medium text-gray-500 mb-2">รายละเอียด</div>
                            <div className="bg-gray-50 p-3 rounded-md text-sm whitespace-pre-wrap">
                                {request.description || '-'}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>ข้อมูลลูกค้า</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="font-medium text-gray-500">ลูกค้า</div>
                            <div className="col-span-2">{request.customer_name || '-'}</div>

                            <div className="font-medium text-gray-500">ผู้ติดต่อ</div>
                            <div className="col-span-2">{request.contact_person || '-'}</div>

                            <div className="font-medium text-gray-500">Email</div>
                            <div className="col-span-2">{request.contact_email || '-'}</div>

                            <div className="font-medium text-gray-500">เบอร์โทร</div>
                            <div className="col-span-2">{request.contact_phone || '-'}</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Estimates & Dates */}
            <Card>
                <CardHeader>
                    <CardTitle>ประมาณการและกำหนดการ</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <div className="font-medium text-gray-500 mb-1">งบประมาณ</div>
                            <div className="text-lg font-semibold">
                                {request.estimated_budget ? request.estimated_budget.toLocaleString() : '-'} บาท
                            </div>
                        </div>

                        <div>
                            <div className="font-medium text-gray-500 mb-1">Man-day</div>
                            <div className="text-lg font-semibold">
                                {request.estimated_mandays || '-'} วัน
                            </div>
                        </div>

                        <div>
                            <div className="font-medium text-gray-500 mb-1">วันที่เริ่มต้น (คาดการณ์)</div>
                            <div>
                                {request.expected_start_date ? format(new Date(request.expected_start_date), 'dd MMM yyyy', { locale: th }) : '-'}
                            </div>
                        </div>

                        <div>
                            <div className="font-medium text-gray-500 mb-1">วันที่สิ้นสุด (คาดการณ์)</div>
                            <div>
                                {request.expected_end_date ? format(new Date(request.expected_end_date), 'dd MMM yyyy', { locale: th }) : '-'}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Notes */}
            {request.notes && (
                <Card>
                    <CardHeader>
                        <CardTitle>หมายเหตุ</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{request.notes}</p>
                    </CardContent>
                </Card>
            )}

            {/* Rejection / Revision Reason */}
            {(request.rejection_reason || request.revision_reason) && (
                <Card className={`border-l-4 ${request.status === 'REJECTED' ? 'border-l-red-500' : 'border-l-orange-500'}`}>
                    <CardHeader>
                        <CardTitle className={request.status === 'REJECTED' ? 'text-red-700' : 'text-orange-700'}>
                            {request.status === 'REJECTED' ? 'เหตุผลที่ปฏิเสธ' : 'สิ่งที่ต้องแก้ไข'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm whitespace-pre-wrap">
                            {request.status === 'REJECTED' ? request.rejection_reason : request.revision_reason}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                            โดย: {request.status === 'REJECTED' ? request.rejected_by_name : request.revision_requested_by_name} •
                            วันที่: {request.status === 'REJECTED'
                                ? format(new Date(request.rejected_at), 'dd/MM/yyyy HH:mm', { locale: th })
                                : format(new Date(request.revision_requested_at), 'dd/MM/yyyy HH:mm', { locale: th })}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
