'use client'

import { useState, useEffect } from 'react'
import { Printer, Eye, Trash2, Plus, CheckSquare, Square, Wifi, Send, Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { createPrintJob, getConfiguredPrinters, getMyPrintJobs, type PrintJob } from '@/lib/actions/print-actions'

interface StickerItem {
    id: string
    code: string
    name: string
    quantity: number
    barcode?: string
    selected: boolean
}

// Sample data
const sampleItems: StickerItem[] = [
    { id: '1', code: 'PRD-001', name: 'สินค้า A', quantity: 5, barcode: '8851234567890', selected: false },
    { id: '2', code: 'PRD-002', name: 'สินค้า B', quantity: 3, barcode: '8851234567891', selected: false },
    { id: '3', code: 'PRD-003', name: 'สินค้า C', quantity: 10, barcode: '8851234567892', selected: false },
    { id: '4', code: 'PRD-004', name: 'สินค้า D', quantity: 2, barcode: '8851234567893', selected: false },
]

export default function StickerPrintPage() {
    const [items, setItems] = useState<StickerItem[]>(sampleItems)
    const [showPreview, setShowPreview] = useState(false)
    const [stickerSize, setStickerSize] = useState({ width: 50, height: 30 }) // mm

    // New item form
    const [newItem, setNewItem] = useState({ code: '', name: '', quantity: 1, barcode: '' })

    // Print mode: 'browser' or 'auto'
    const [printMode, setPrintMode] = useState<'browser' | 'auto'>('auto')

    // Printers
    const [printers, setPrinters] = useState<{ name: string; type: string; isDefault: boolean }[]>([])
    const [selectedPrinter, setSelectedPrinter] = useState<string>('')
    const [isPrinting, setIsPrinting] = useState(false)

    // Print history
    const [printJobs, setPrintJobs] = useState<PrintJob[]>([])
    const [isLoadingJobs, setIsLoadingJobs] = useState(false)

    // Load printers on mount
    useEffect(() => {
        loadPrinters()
        loadPrintJobs()
    }, [])

    const loadPrinters = async () => {
        const result = await getConfiguredPrinters()
        setPrinters(result)
        // Select default printer
        const defaultPrinter = result.find(p => p.isDefault)
        if (defaultPrinter) {
            setSelectedPrinter(defaultPrinter.name)
        } else if (result.length > 0) {
            setSelectedPrinter(result[0].name)
        }
    }

    const loadPrintJobs = async () => {
        setIsLoadingJobs(true)
        try {
            const jobs = await getMyPrintJobs(20)
            setPrintJobs(jobs)
        } finally {
            setIsLoadingJobs(false)
        }
    }

    const toggleSelect = (id: string) => {
        setItems(items.map(item =>
            item.id === id ? { ...item, selected: !item.selected } : item
        ))
    }

    const toggleSelectAll = () => {
        const allSelected = items.every(item => item.selected)
        setItems(items.map(item => ({ ...item, selected: !allSelected })))
    }

    const addItem = () => {
        if (!newItem.code || !newItem.name) return
        const item: StickerItem = {
            id: Date.now().toString(),
            ...newItem,
            selected: false
        }
        setItems([...items, item])
        setNewItem({ code: '', name: '', quantity: 1, barcode: '' })
    }

    const removeItem = (id: string) => {
        setItems(items.filter(item => item.id !== id))
    }

    const selectedItems = items.filter(item => item.selected)

    const handlePrint = () => {
        if (selectedItems.length === 0) {
            toast.error('กรุณาเลือกรายการที่ต้องการพิมพ์')
            return
        }
        setShowPreview(true)
    }

    // Browser print (with dialog)
    const executeBrowserPrint = () => {
        const printFrame = document.createElement('iframe')
        printFrame.style.position = 'absolute'
        printFrame.style.top = '-10000px'
        printFrame.style.left = '-10000px'
        document.body.appendChild(printFrame)

        const doc = printFrame.contentDocument || printFrame.contentWindow?.document
        if (!doc) return

        const stickersHTML = selectedItems.flatMap(item =>
            Array.from({ length: item.quantity }, (_, i) => `
                <div class="sticker" style="
                    width: ${stickerSize.width}mm;
                    height: ${stickerSize.height}mm;
                    border: 1px dashed #ccc;
                    padding: 2mm;
                    margin: 1mm;
                    display: inline-block;
                    box-sizing: border-box;
                    page-break-inside: avoid;
                    font-family: sans-serif;
                ">
                    <div style="font-size: 10pt; font-weight: bold;">${item.code}</div>
                    <div style="font-size: 9pt; margin-top: 1mm;">${item.name}</div>
                    ${item.barcode ? `<div style="font-size: 8pt; margin-top: 2mm; font-family: monospace;">${item.barcode}</div>` : ''}
                </div>
            `)
        ).join('')

        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>พิมพ์สติ๊กเกอร์</title>
                <style>
                    @page { size: auto; margin: 5mm; }
                    body { margin: 0; padding: 0; }
                    @media print { .sticker { border: none !important; } }
                </style>
            </head>
            <body>${stickersHTML}</body>
            </html>
        `)
        doc.close()

        setTimeout(() => {
            printFrame.contentWindow?.print()
            setTimeout(() => {
                document.body.removeChild(printFrame)
            }, 1000)
        }, 250)

        setShowPreview(false)
    }

    // Auto print (send to SATO via Print Agent)
    const executeAutoPrint = async () => {
        if (!selectedPrinter) {
            toast.error('กรุณาเลือกเครื่องพิมพ์')
            return
        }

        setIsPrinting(true)

        try {
            // Prepare payload for SATO printer
            const payload = selectedItems.flatMap(item =>
                Array.from({ length: item.quantity }, () => ({
                    code: item.code,
                    name: item.name,
                    barcode: item.barcode,
                    quantity: 1
                }))
            )

            const result = await createPrintJob('sticker', selectedPrinter, payload)

            if (result.success) {
                toast.success(`ส่งงานพิมพ์สำเร็จ (${payload.length} ชิ้น)`, {
                    description: `Job ID: ${result.jobId?.substring(0, 8)}...`
                })
                setShowPreview(false)
                // Refresh job list
                setTimeout(loadPrintJobs, 1000)
            } else {
                toast.error('ไม่สามารถส่งงานพิมพ์ได้', {
                    description: result.error
                })
            }
        } catch (error) {
            toast.error('เกิดข้อผิดพลาด')
        } finally {
            setIsPrinting(false)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700"><Loader2 className="w-3 h-3 animate-spin" /> รอพิมพ์</span>
            case 'printing':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700"><Loader2 className="w-3 h-3 animate-spin" /> กำลังพิมพ์</span>
            case 'completed':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3" /> สำเร็จ</span>
            case 'failed':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700"><XCircle className="w-3 h-3" /> ล้มเหลว</span>
            default:
                return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">{status}</span>
        }
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">พิมพ์สติ๊กเกอร์</h1>
                    <p className="text-gray-500 text-sm">เลือกรายการจากตารางแล้วกดพิมพ์</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Printer selector for auto mode */}
                    {printMode === 'auto' && printers.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Wifi className="w-4 h-4 text-green-500" />
                            <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder="เลือกเครื่องพิมพ์" />
                                </SelectTrigger>
                                <SelectContent>
                                    {printers.map(p => (
                                        <SelectItem key={p.name} value={p.name}>
                                            {p.name} ({p.type})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <Button
                        onClick={handlePrint}
                        disabled={selectedItems.length === 0}
                        className="gap-2"
                    >
                        <Printer className="w-4 h-4" />
                        พิมพ์ ({selectedItems.reduce((sum, item) => sum + item.quantity, 0)} ชิ้น)
                    </Button>
                </div>
            </div>

            {/* Print Mode Toggle */}
            <Card>
                <CardHeader className="py-3">
                    <CardTitle className="text-sm">โหมดการพิมพ์</CardTitle>
                </CardHeader>
                <CardContent className="py-3">
                    <Tabs value={printMode} onValueChange={(v) => setPrintMode(v as 'browser' | 'auto')}>
                        <TabsList className="grid w-full max-w-md grid-cols-2">
                            <TabsTrigger value="auto" className="gap-2">
                                <Wifi className="w-4 h-4" />
                                Auto Print (SATO)
                            </TabsTrigger>
                            <TabsTrigger value="browser" className="gap-2">
                                <Printer className="w-4 h-4" />
                                Browser Print
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="auto" className="mt-3">
                            <div className="p-3 bg-green-50 rounded-lg text-sm">
                                <p className="text-green-700 font-medium">พิมพ์อัตโนมัติผ่าน SATO</p>
                                <p className="text-green-600 text-xs mt-1">
                                    ส่งงานพิมพ์ไปยังเครื่อง SATO โดยตรง ไม่ต้องเลือกเครื่องพิมพ์ทุกครั้ง
                                </p>
                                {printers.length === 0 && (
                                    <p className="text-orange-600 text-xs mt-2">
                                        ⚠️ ยังไม่มีเครื่องพิมพ์ในระบบ - กรุณาตั้งค่าที่ Settings
                                    </p>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="browser" className="mt-3">
                            <div className="p-3 bg-blue-50 rounded-lg text-sm">
                                <p className="text-blue-700 font-medium">พิมพ์ผ่าน Browser</p>
                                <p className="text-blue-600 text-xs mt-1">
                                    เปิด Print Dialog ของ Browser เพื่อเลือกเครื่องพิมพ์เอง
                                </p>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Sticker Size Setting */}
            <Card>
                <CardHeader className="py-3">
                    <CardTitle className="text-sm">ขนาดสติ๊กเกอร์</CardTitle>
                </CardHeader>
                <CardContent className="py-3">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Label className="text-sm">กว้าง (mm):</Label>
                            <Input
                                type="number"
                                value={stickerSize.width}
                                onChange={(e) => setStickerSize({ ...stickerSize, width: parseInt(e.target.value) || 50 })}
                                className="w-20"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Label className="text-sm">สูง (mm):</Label>
                            <Input
                                type="number"
                                value={stickerSize.height}
                                onChange={(e) => setStickerSize({ ...stickerSize, height: parseInt(e.target.value) || 30 })}
                                className="w-20"
                            />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <div
                                className="border border-dashed border-gray-400 bg-gray-50"
                                style={{
                                    width: `${stickerSize.width * 0.5}px`,
                                    height: `${stickerSize.height * 0.5}px`,
                                    minWidth: '20px',
                                    minHeight: '10px'
                                }}
                            />
                            <span>ตัวอย่าง (ย่อ 50%)</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Add New Item */}
            <Card>
                <CardHeader className="py-3">
                    <CardTitle className="text-sm">เพิ่มรายการ</CardTitle>
                </CardHeader>
                <CardContent className="py-3">
                    <div className="flex items-end gap-3">
                        <div className="flex-1">
                            <Label className="text-xs">รหัส</Label>
                            <Input
                                value={newItem.code}
                                onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
                                placeholder="PRD-XXX"
                            />
                        </div>
                        <div className="flex-1">
                            <Label className="text-xs">ชื่อ</Label>
                            <Input
                                value={newItem.name}
                                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                placeholder="ชื่อสินค้า"
                            />
                        </div>
                        <div className="w-24">
                            <Label className="text-xs">จำนวน</Label>
                            <Input
                                type="number"
                                min={1}
                                value={newItem.quantity}
                                onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                            />
                        </div>
                        <div className="flex-1">
                            <Label className="text-xs">Barcode (ถ้ามี)</Label>
                            <Input
                                value={newItem.barcode}
                                onChange={(e) => setNewItem({ ...newItem, barcode: e.target.value })}
                                placeholder="8851234567890"
                            />
                        </div>
                        <Button onClick={addItem} className="gap-1">
                            <Plus className="w-4 h-4" /> เพิ่ม
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Items Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <button onClick={toggleSelectAll} className="p-1">
                                        {items.every(item => item.selected) ? (
                                            <CheckSquare className="w-5 h-5 text-indigo-600" />
                                        ) : (
                                            <Square className="w-5 h-5 text-gray-400" />
                                        )}
                                    </button>
                                </TableHead>
                                <TableHead>รหัส</TableHead>
                                <TableHead>ชื่อ</TableHead>
                                <TableHead>Barcode</TableHead>
                                <TableHead className="text-center">จำนวน</TableHead>
                                <TableHead className="w-20"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map(item => (
                                <TableRow
                                    key={item.id}
                                    className={item.selected ? 'bg-indigo-50' : ''}
                                >
                                    <TableCell>
                                        <button onClick={() => toggleSelect(item.id)} className="p-1">
                                            {item.selected ? (
                                                <CheckSquare className="w-5 h-5 text-indigo-600" />
                                            ) : (
                                                <Square className="w-5 h-5 text-gray-400" />
                                            )}
                                        </button>
                                    </TableCell>
                                    <TableCell className="font-mono font-medium">{item.code}</TableCell>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell className="font-mono text-sm text-gray-500">
                                        {item.barcode || '-'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Input
                                            type="number"
                                            min={1}
                                            value={item.quantity}
                                            onChange={(e) => {
                                                setItems(items.map(i =>
                                                    i.id === item.id
                                                        ? { ...i, quantity: parseInt(e.target.value) || 1 }
                                                        : i
                                                ))
                                            }}
                                            className="w-20 text-center mx-auto"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeItem(item.id)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {items.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                                        ยังไม่มีรายการ
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Print History (for auto mode) */}
            {printMode === 'auto' && (
                <Card>
                    <CardHeader className="py-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm">ประวัติการพิมพ์</CardTitle>
                        <Button variant="ghost" size="sm" onClick={loadPrintJobs} disabled={isLoadingJobs}>
                            <RefreshCw className={`w-4 h-4 ${isLoadingJobs ? 'animate-spin' : ''}`} />
                        </Button>
                    </CardHeader>
                    <CardContent className="py-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>เวลา</TableHead>
                                    <TableHead>เครื่องพิมพ์</TableHead>
                                    <TableHead>ประเภท</TableHead>
                                    <TableHead>สถานะ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {printJobs.slice(0, 5).map(job => (
                                    <TableRow key={job.id}>
                                        <TableCell className="text-xs">
                                            {new Date(job.created_at).toLocaleString('th-TH', {
                                                day: '2-digit',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </TableCell>
                                        <TableCell className="text-xs">{job.printer_name}</TableCell>
                                        <TableCell className="text-xs">{job.job_type}</TableCell>
                                        <TableCell>{getStatusBadge(job.status)}</TableCell>
                                    </TableRow>
                                ))}
                                {printJobs.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-gray-500 py-4 text-sm">
                                            ยังไม่มีประวัติการพิมพ์
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Print Preview Modal */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Eye className="w-5 h-5" />
                            ตัวอย่างก่อนพิมพ์
                        </DialogTitle>
                    </DialogHeader>

                    <div className="p-4 bg-gray-100 rounded-lg">
                        <div className="flex flex-wrap gap-2 justify-center">
                            {selectedItems.flatMap(item =>
                                Array.from({ length: Math.min(item.quantity, 5) }, (_, i) => (
                                    <div
                                        key={`${item.id}-${i}`}
                                        className="bg-white border border-dashed border-gray-300 p-2"
                                        style={{
                                            width: `${stickerSize.width * 2}px`,
                                            height: `${stickerSize.height * 2}px`,
                                        }}
                                    >
                                        <div className="text-xs font-bold">{item.code}</div>
                                        <div className="text-[10px] mt-0.5">{item.name}</div>
                                        {item.barcode && (
                                            <div className="text-[8px] font-mono mt-1 text-gray-600">
                                                {item.barcode}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                            {selectedItems.some(item => item.quantity > 5) && (
                                <div className="w-full text-center text-xs text-gray-500 mt-2">
                                    (แสดงตัวอย่างสูงสุด 5 ชิ้นต่อรายการ)
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t">
                        <span className="text-sm text-gray-500">
                            รวม {selectedItems.reduce((sum, item) => sum + item.quantity, 0)} ชิ้น
                            ({selectedItems.length} รายการ)
                        </span>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setShowPreview(false)}>
                                ยกเลิก
                            </Button>
                            {printMode === 'auto' ? (
                                <Button
                                    onClick={executeAutoPrint}
                                    disabled={isPrinting || !selectedPrinter}
                                    className="gap-2"
                                >
                                    {isPrinting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    {isPrinting ? 'กำลังส่ง...' : 'ส่งไปพิมพ์ (SATO)'}
                                </Button>
                            ) : (
                                <Button onClick={executeBrowserPrint} className="gap-2">
                                    <Printer className="w-4 h-4" />
                                    พิมพ์ (Browser)
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
