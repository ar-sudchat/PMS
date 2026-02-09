'use client'

import { useState, useEffect } from 'react'
import { Printer, Plus, Pencil, Trash2, Wifi, Check, X, Star, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import {
    getPrinters,
    createPrinter,
    updatePrinter,
    deletePrinter,
    testPrinterConnection,
    type Printer as PrinterType
} from '@/lib/actions/printer-actions'

const PRINTER_TYPES = [
    { value: 'SATO', label: 'SATO' },
    { value: 'ZEBRA', label: 'Zebra' },
    { value: 'BROTHER', label: 'Brother' },
    { value: 'EPSON', label: 'Epson' },
    { value: 'GENERIC', label: 'อื่นๆ' },
]

const CONNECTION_TYPES = [
    { value: 'NETWORK', label: 'Network (WiFi/LAN)' },
    { value: 'USB', label: 'USB' },
]

const PRINT_LANGUAGES = [
    { value: 'SBPL', label: 'SBPL (SATO)' },
    { value: 'ZPL', label: 'ZPL (Zebra)' },
    { value: 'ESC/POS', label: 'ESC/POS' },
    { value: 'EPL', label: 'EPL' },
]

interface FormData {
    name: string
    printer_type: string
    connection_type: string
    ip_address: string
    port: string
    printer_model: string
    print_language: string
    is_default: boolean
}

const defaultFormData: FormData = {
    name: '',
    printer_type: 'SATO',
    connection_type: 'NETWORK',
    ip_address: '',
    port: '9100',
    printer_model: '',
    print_language: 'SBPL',
    is_default: false,
}

export default function PrinterSettingsPage() {
    const [printers, setPrinters] = useState<PrinterType[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [showDialog, setShowDialog] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState<FormData>(defaultFormData)
    const [isSaving, setIsSaving] = useState(false)
    const [isTesting, setIsTesting] = useState(false)

    useEffect(() => {
        loadPrinters()
    }, [])

    const loadPrinters = async () => {
        setIsLoading(true)
        try {
            const data = await getPrinters()
            setPrinters(data)
        } finally {
            setIsLoading(false)
        }
    }

    const openAddDialog = () => {
        setEditingId(null)
        setFormData(defaultFormData)
        setShowDialog(true)
    }

    const openEditDialog = (printer: PrinterType) => {
        setEditingId(printer.id)
        // Parse connection_string to get IP and port
        let ip = ''
        let port = '9100'
        if (printer.connection_string) {
            const parts = printer.connection_string.split(':')
            ip = parts[0] || ''
            port = parts[1] || '9100'
        }
        setFormData({
            name: printer.name,
            printer_type: printer.printer_type,
            connection_type: printer.connection_type,
            ip_address: ip,
            port: port,
            printer_model: printer.printer_model || '',
            print_language: printer.print_language || 'SBPL',
            is_default: printer.is_default,
        })
        setShowDialog(true)
    }

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error('กรุณากรอกชื่อเครื่องพิมพ์')
            return
        }

        if (formData.connection_type === 'NETWORK' && !formData.ip_address.trim()) {
            toast.error('กรุณากรอก IP Address')
            return
        }

        setIsSaving(true)
        try {
            const connection_string = formData.connection_type === 'NETWORK'
                ? `${formData.ip_address}:${formData.port}`
                : null

            const data = {
                name: formData.name,
                printer_type: formData.printer_type,
                connection_type: formData.connection_type,
                connection_string: connection_string || undefined,
                printer_model: formData.printer_model || undefined,
                print_language: formData.print_language,
                is_default: formData.is_default,
            }

            let result
            if (editingId) {
                result = await updatePrinter(editingId, data)
            } else {
                result = await createPrinter(data)
            }

            if (result.success) {
                toast.success(editingId ? 'อัพเดทเครื่องพิมพ์สำเร็จ' : 'เพิ่มเครื่องพิมพ์สำเร็จ')
                setShowDialog(false)
                loadPrinters()
            } else {
                toast.error(result.error || 'เกิดข้อผิดพลาด')
            }
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (printer: PrinterType) => {
        if (!confirm(`ต้องการลบเครื่องพิมพ์ "${printer.name}" หรือไม่?`)) {
            return
        }

        const result = await deletePrinter(printer.id)
        if (result.success) {
            toast.success('ลบเครื่องพิมพ์สำเร็จ')
            loadPrinters()
        } else {
            toast.error(result.error || 'เกิดข้อผิดพลาด')
        }
    }

    const handleTest = async () => {
        if (!formData.ip_address) {
            toast.error('กรุณากรอก IP Address')
            return
        }

        setIsTesting(true)
        try {
            const result = await testPrinterConnection(formData.ip_address, parseInt(formData.port))
            if (result.success) {
                toast.success(result.message)
            } else {
                toast.error(result.message)
            }
        } finally {
            setIsTesting(false)
        }
    }

    const handleSetDefault = async (printer: PrinterType) => {
        const result = await updatePrinter(printer.id, { is_default: true })
        if (result.success) {
            toast.success(`ตั้ง "${printer.name}" เป็นเครื่องพิมพ์หลัก`)
            loadPrinters()
        }
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">ตั้งค่าเครื่องพิมพ์</h1>
                    <p className="text-gray-500 text-sm">จัดการเครื่องพิมพ์สำหรับระบบ Auto-Print</p>
                </div>
                <Button onClick={openAddDialog} className="gap-2">
                    <Plus className="w-4 h-4" />
                    เพิ่มเครื่องพิมพ์
                </Button>
            </div>

            {/* Info Card */}
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="py-4">
                    <div className="flex gap-3">
                        <Wifi className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-medium text-blue-800">การตั้งค่าเครื่องพิมพ์ SATO</p>
                            <p className="text-blue-600 mt-1">
                                1. หา IP Address ของ SATO จากเมนู Settings → Network → TCP/IP<br />
                                2. Port มาตรฐานคือ 9100<br />
                                3. ต้องมี Print Agent รันอยู่บน PC/Server เพื่อส่งงานไปยังเครื่องพิมพ์
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Printers Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">เครื่องพิมพ์ทั้งหมด</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : printers.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Printer className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>ยังไม่มีเครื่องพิมพ์ในระบบ</p>
                            <p className="text-sm mt-1">กดปุ่ม "เพิ่มเครื่องพิมพ์" เพื่อเริ่มต้น</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ชื่อ</TableHead>
                                    <TableHead>ประเภท</TableHead>
                                    <TableHead>การเชื่อมต่อ</TableHead>
                                    <TableHead>รุ่น</TableHead>
                                    <TableHead>สถานะ</TableHead>
                                    <TableHead className="w-32"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {printers.map(printer => (
                                    <TableRow key={printer.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {printer.is_default && (
                                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                                )}
                                                <span className="font-medium">{printer.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="px-2 py-0.5 rounded bg-gray-100 text-xs">
                                                {printer.printer_type}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <Wifi className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="text-sm font-mono">
                                                    {printer.connection_string || '-'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                            {printer.printer_model || '-'}
                                        </TableCell>
                                        <TableCell>
                                            {printer.is_active ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                                                    <Check className="w-3 h-3" /> ใช้งาน
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">
                                                    <X className="w-3 h-3" /> ปิดใช้งาน
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                {!printer.is_default && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleSetDefault(printer)}
                                                        title="ตั้งเป็นค่าเริ่มต้น"
                                                    >
                                                        <Star className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEditDialog(printer)}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(printer)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingId ? 'แก้ไขเครื่องพิมพ์' : 'เพิ่มเครื่องพิมพ์'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <Label>ชื่อเครื่องพิมพ์ *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="เช่น SATO-Main"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>ประเภท</Label>
                                <Select
                                    value={formData.printer_type}
                                    onValueChange={(v) => setFormData({ ...formData, printer_type: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PRINTER_TYPES.map(t => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>การเชื่อมต่อ</Label>
                                <Select
                                    value={formData.connection_type}
                                    onValueChange={(v) => setFormData({ ...formData, connection_type: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CONNECTION_TYPES.map(t => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {formData.connection_type === 'NETWORK' && (
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <Label>IP Address *</Label>
                                    <Input
                                        value={formData.ip_address}
                                        onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                                        placeholder="192.168.1.100"
                                    />
                                </div>
                                <div>
                                    <Label>Port</Label>
                                    <Input
                                        value={formData.port}
                                        onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                                        placeholder="9100"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>รุ่น (Model)</Label>
                                <Input
                                    value={formData.printer_model}
                                    onChange={(e) => setFormData({ ...formData, printer_model: e.target.value })}
                                    placeholder="เช่น CL4NX"
                                />
                            </div>

                            <div>
                                <Label>ภาษาพิมพ์</Label>
                                <Select
                                    value={formData.print_language}
                                    onValueChange={(v) => setFormData({ ...formData, print_language: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PRINT_LANGUAGES.map(t => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 py-2">
                            <Checkbox
                                id="is_default"
                                checked={formData.is_default}
                                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                            />
                            <Label htmlFor="is_default" className="cursor-pointer">ตั้งเป็นเครื่องพิมพ์หลัก</Label>
                        </div>

                        {formData.connection_type === 'NETWORK' && formData.ip_address && (
                            <Button
                                variant="outline"
                                className="w-full gap-2"
                                onClick={handleTest}
                                disabled={isTesting}
                            >
                                {isTesting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Wifi className="w-4 h-4" />
                                )}
                                ทดสอบการเชื่อมต่อ
                            </Button>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>
                            ยกเลิก
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {editingId ? 'บันทึก' : 'เพิ่ม'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
