/**
 * ============================================
 * Central Alert System - ตัวอย่างการใช้งาน
 * ============================================
 *
 * ไฟล์นี้เป็นตัวอย่างการใช้งาน Central Alert System
 * ลบไฟล์นี้ได้เมื่อเข้าใจวิธีใช้แล้ว
 */

"use client"

import { useAlert, InlineAlert } from '@/components/ui/central-alert'

export function AlertExamples() {
    const alert = useAlert()

    // ============================================
    // 1. แทนที่ window.alert()
    // ============================================

    // ❌ เดิม (ห้ามใช้)
    // window.alert('บันทึกสำเร็จ!')

    // ✅ ใหม่ - ใช้แบบนี้แทน
    const showBasicAlert = async () => {
        await alert.alert('บันทึกสำเร็จ!')
    }

    // ============================================
    // 2. Alert แบบมี Type ต่างๆ
    // ============================================

    const showSuccessAlert = async () => {
        await alert.success('สำเร็จ!', 'บันทึกข้อมูลเรียบร้อยแล้ว')
    }

    const showErrorAlert = async () => {
        await alert.error('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง')
    }

    const showWarningAlert = async () => {
        await alert.warning('คำเตือน', 'ข้อมูลบางส่วนอาจสูญหาย')
    }

    const showInfoAlert = async () => {
        await alert.info('แจ้งเตือน', 'มีการอัพเดทใหม่พร้อมใช้งาน')
    }

    // ============================================
    // 3. แทนที่ window.confirm()
    // ============================================

    // ❌ เดิม (ห้ามใช้)
    // if (window.confirm('คุณต้องการลบหรือไม่?')) { ... }

    // ✅ ใหม่ - ใช้แบบนี้แทน
    const handleDelete = async () => {
        const confirmed = await alert.confirm(
            'ยืนยันการลบ',
            'คุณต้องการลบรายการนี้หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้'
        )

        if (confirmed) {
            // ทำการลบ
            console.log('ลบแล้ว!')
        }
    }

    // Confirm แบบกำหนด text เอง
    const handleDeleteCustom = async () => {
        const confirmed = await alert.confirm(
            'ยืนยันการลบโปรเจค',
            'โปรเจคและข้อมูลทั้งหมดจะถูกลบถาวร',
            {
                confirmText: 'ลบเลย',
                cancelText: 'ไม่ลบ',
            }
        )

        if (confirmed) {
            // ทำการลบ
        }
    }

    // ============================================
    // 4. แทนที่ window.prompt()
    // ============================================

    // ❌ เดิม (ห้ามใช้)
    // const name = window.prompt('กรุณาใส่ชื่อ:')

    // ✅ ใหม่ - ใช้แบบนี้แทน
    const handlePrompt = async () => {
        const value = await alert.prompt('กรุณาใส่ชื่อโปรเจค', {
            inputPlaceholder: 'ชื่อโปรเจค...',
            inputDefaultValue: '',
        })

        if (value !== null) {
            console.log('ชื่อโปรเจค:', value)
        }
    }

    // Prompt แบบ textarea
    const handlePromptTextarea = async () => {
        const value = await alert.prompt('กรุณาใส่เหตุผลการปฏิเสธ', {
            inputType: 'textarea',
            inputPlaceholder: 'ระบุเหตุผล...',
            confirmText: 'ส่ง',
            cancelText: 'ยกเลิก',
        })

        if (value !== null) {
            console.log('เหตุผล:', value)
        }
    }

    // ============================================
    // 5. Alert แบบ Custom Buttons
    // ============================================

    const showCustomButtonsAlert = async () => {
        await alert.alert({
            type: 'warning',
            title: 'มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก',
            message: 'คุณต้องการบันทึกก่อนออกหรือไม่?',
            buttons: [
                {
                    text: 'ไม่บันทึก',
                    variant: 'ghost',
                    onClick: () => console.log('ไม่บันทึก'),
                },
                {
                    text: 'บันทึก',
                    variant: 'primary',
                    onClick: async () => {
                        // บันทึกข้อมูล
                        console.log('กำลังบันทึก...')
                    },
                },
            ],
        })
    }

    // ============================================
    // 6. Alert แบบ Async Action
    // ============================================

    const handleDeleteWithLoading = async () => {
        const confirmed = await alert.confirm(
            'ยืนยันการลบ',
            'กำลังลบข้อมูล...',
            {
                onConfirm: async () => {
                    // Simulate API call
                    await new Promise(resolve => setTimeout(resolve, 2000))
                    console.log('ลบสำเร็จ!')
                },
            }
        )
    }

    // ============================================
    // 7. InlineAlert - Alert แบบแสดงในหน้า (ไม่ใช่ Modal)
    // ============================================

    return (
        <div className="space-y-4 p-4">
            <h2 className="text-lg font-semibold">ตัวอย่าง Alert Types</h2>

            <div className="flex flex-wrap gap-2">
                <button onClick={showBasicAlert} className="px-4 py-2 bg-gray-200 rounded">
                    Basic Alert
                </button>
                <button onClick={showSuccessAlert} className="px-4 py-2 bg-green-200 rounded">
                    Success
                </button>
                <button onClick={showErrorAlert} className="px-4 py-2 bg-red-200 rounded">
                    Error
                </button>
                <button onClick={showWarningAlert} className="px-4 py-2 bg-amber-200 rounded">
                    Warning
                </button>
                <button onClick={showInfoAlert} className="px-4 py-2 bg-blue-200 rounded">
                    Info
                </button>
            </div>

            <h2 className="text-lg font-semibold mt-6">ตัวอย่าง Confirm & Prompt</h2>

            <div className="flex flex-wrap gap-2">
                <button onClick={handleDelete} className="px-4 py-2 bg-red-200 rounded">
                    Confirm Delete
                </button>
                <button onClick={handlePrompt} className="px-4 py-2 bg-purple-200 rounded">
                    Prompt
                </button>
                <button onClick={showCustomButtonsAlert} className="px-4 py-2 bg-orange-200 rounded">
                    Custom Buttons
                </button>
            </div>

            <h2 className="text-lg font-semibold mt-6">InlineAlert (แสดงในหน้า)</h2>

            <InlineAlert type="success" title="สำเร็จ!">
                บันทึกข้อมูลเรียบร้อยแล้ว
            </InlineAlert>

            <InlineAlert type="error" title="เกิดข้อผิดพลาด">
                ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้
            </InlineAlert>

            <InlineAlert type="warning" title="คำเตือน">
                กรุณาตรวจสอบข้อมูลก่อนบันทึก
            </InlineAlert>

            <InlineAlert type="info">
                ระบบจะปิดปรับปรุงในวันที่ 1 ม.ค. 2567
            </InlineAlert>

            <InlineAlert type="warning" dismissible onDismiss={() => console.log('dismissed')}>
                Alert แบบกดปิดได้
            </InlineAlert>
        </div>
    )
}

// ============================================
// ตัวอย่างการใช้ใน Component จริง
// ============================================

export function RealWorldExample() {
    const alert = useAlert()

    const handleSaveProject = async () => {
        try {
            // เรียก API บันทึก
            // await saveProject(data)

            await alert.success('บันทึกสำเร็จ', 'ข้อมูลโปรเจคถูกบันทึกเรียบร้อยแล้ว')
        } catch (error) {
            await alert.error('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่')
        }
    }

    const handleDeleteProject = async (projectId: string) => {
        const confirmed = await alert.confirm(
            'ยืนยันการลบโปรเจค',
            'โปรเจคและข้อมูลทั้งหมดจะถูกลบถาวร ไม่สามารถกู้คืนได้',
            {
                confirmText: 'ลบโปรเจค',
                cancelText: 'ยกเลิก',
            }
        )

        if (confirmed) {
            try {
                // await deleteProject(projectId)
                await alert.success('ลบสำเร็จ', 'โปรเจคถูกลบเรียบร้อยแล้ว')
            } catch (error) {
                await alert.error('เกิดข้อผิดพลาด', 'ไม่สามารถลบโปรเจคได้')
            }
        }
    }

    const handleRejectApproval = async () => {
        const reason = await alert.prompt('กรุณาระบุเหตุผลการปฏิเสธ', {
            inputType: 'textarea',
            inputPlaceholder: 'ระบุเหตุผล...',
            confirmText: 'ปฏิเสธ',
            cancelText: 'ยกเลิก',
        })

        if (reason !== null && reason.trim()) {
            // await rejectApproval(approvalId, reason)
            await alert.success('ดำเนินการสำเร็จ', 'ปฏิเสธคำขอเรียบร้อยแล้ว')
        } else if (reason !== null) {
            await alert.warning('กรุณาระบุเหตุผล', 'ต้องระบุเหตุผลก่อนปฏิเสธ')
        }
    }

    return (
        <div>
            <button onClick={handleSaveProject}>บันทึก</button>
            <button onClick={() => handleDeleteProject('123')}>ลบ</button>
            <button onClick={handleRejectApproval}>ปฏิเสธ</button>
        </div>
    )
}
