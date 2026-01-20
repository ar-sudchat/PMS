
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

interface ProjectRequestDetailProps {
    request: any
}

export function ProjectRequestDetail({ request }: ProjectRequestDetailProps) {
    if (!request) return null

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Project Info */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
                            ข้อมูลคำขอ
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <Label>ชื่อโครงการ</Label>
                                <Input
                                    value={request.title}
                                    disabled
                                    className="mt-1 bg-slate-50 text-slate-900 opacity-100 border-slate-200"
                                />
                            </div>

                            <div>
                                <Label>ประเภทโครงการ</Label>
                                <Input
                                    value={request.project_type_name || request.project_type}
                                    disabled
                                    className="mt-1 bg-slate-50 text-slate-900 opacity-100 border-slate-200"
                                />
                            </div>

                            <div>
                                <Label>ความสำคัญ</Label>
                                <Input
                                    value={request.priority_name || request.priority}
                                    disabled
                                    className="mt-1 bg-slate-50 text-slate-900 opacity-100 border-slate-200"
                                />
                            </div>

                            <div className="col-span-2">
                                <Label>รายละเอียด</Label>
                                <Textarea
                                    value={request.description || '-'}
                                    rows={4}
                                    disabled
                                    className="mt-1 resize-none bg-slate-50 text-slate-900 opacity-100 border-slate-200"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <div className="w-1 h-5 bg-orange-500 rounded-full"></div>
                            ประมาณการ
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>งบประมาณ (บาท)</Label>
                                <Input
                                    value={request.estimated_budget ? request.estimated_budget.toLocaleString() : '-'}
                                    disabled
                                    className="mt-1 bg-slate-50 text-slate-900 opacity-100 border-slate-200"
                                />
                            </div>

                            <div>
                                <Label>Man-day</Label>
                                <Input
                                    value={request.estimated_mandays || '-'}
                                    disabled
                                    className="mt-1 bg-slate-50 text-slate-900 opacity-100 border-slate-200"
                                />
                            </div>

                            <div>
                                <Label>เริ่ม (คาดการณ์)</Label>
                                <Input
                                    value={request.expected_start_date ? format(new Date(request.expected_start_date), 'dd/MM/yyyy', { locale: th }) : '-'}
                                    disabled
                                    className="mt-1 bg-slate-50 text-slate-900 opacity-100 border-slate-200"
                                />
                            </div>

                            <div>
                                <Label>สิ้นสุด (คาดการณ์)</Label>
                                <Input
                                    value={request.expected_end_date ? format(new Date(request.expected_end_date), 'dd/MM/yyyy', { locale: th }) : '-'}
                                    disabled
                                    className="mt-1 bg-slate-50 text-slate-900 opacity-100 border-slate-200"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Customer Info & Notes */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <div className="w-1 h-5 bg-green-500 rounded-full"></div>
                            ข้อมูลลูกค้า
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <Label>ลูกค้า</Label>
                                <Input
                                    value={request.customer_name || '-'}
                                    disabled
                                    className="mt-1 bg-slate-50 text-slate-900 opacity-100 border-slate-200"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <Label>ผู้ติดต่อ</Label>
                                    <Input
                                        value={request.contact_person || '-'}
                                        disabled
                                        className="mt-1 bg-slate-50 text-slate-900 opacity-100 border-slate-200"
                                    />
                                </div>
                                <div>
                                    <Label>Email</Label>
                                    <Input
                                        value={request.contact_email || '-'}
                                        disabled
                                        className="mt-1 bg-slate-50 text-slate-900 opacity-100 border-slate-200"
                                    />
                                </div>
                                <div>
                                    <Label>เบอร์โทร</Label>
                                    <Input
                                        value={request.contact_phone || '-'}
                                        disabled
                                        className="mt-1 bg-slate-50 text-slate-900 opacity-100 border-slate-200"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <div className="w-1 h-5 bg-slate-500 rounded-full"></div>
                            หมายเหตุ
                        </h3>
                        <Textarea
                            value={request.notes || '-'}
                            rows={3}
                            disabled
                            className="mt-1 resize-none bg-slate-50 text-slate-900 opacity-100 border-slate-200"
                        />
                    </div>

                    {/* Rejection / Revision Reason Block (Kept as special alert-like box as it has no equivalent in Create Form) */}
                    {(request.rejection_reason || request.revision_reason) && (
                        <div className={`p-4 rounded-lg border border-l-4 ${request.status === 'REJECTED' ? 'bg-red-50 border-red-200 border-l-red-500' : 'bg-orange-50 border-orange-200 border-l-orange-500'}`}>
                            <h4 className={`font-semibold mb-2 ${request.status === 'REJECTED' ? 'text-red-700' : 'text-orange-700'}`}>
                                {request.status === 'REJECTED' ? 'เหตุผลที่ปฏิเสธ' : 'สิ่งที่ต้องแก้ไข'}
                            </h4>
                            <p className="text-sm whitespace-pre-wrap text-slate-800">
                                {request.status === 'REJECTED' ? request.rejection_reason : request.revision_reason}
                            </p>
                            <div className="mt-3 pt-3 border-t border-slate-200/50 flex items-center gap-2 text-xs text-slate-500">
                                <span className="font-medium">โดย: {request.status === 'REJECTED' ? request.rejected_by_name : request.revision_requested_by_name}</span>
                                <span>•</span>
                                <span>{request.status === 'REJECTED'
                                    ? format(new Date(request.rejected_at), 'dd/MM/yyyy HH:mm', { locale: th })
                                    : format(new Date(request.revision_requested_at), 'dd/MM/yyyy HH:mm', { locale: th })}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
