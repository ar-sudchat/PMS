'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { Modal } from '@/components/ui/modal';
import { Customer, CustomerFormData } from '@/types/customer';
import { createCustomer, updateCustomer } from '@/lib/actions/customer-actions';
import { Switch } from '@/components/ui/Switch'; // Ensure correct casing for Switch component path
import { toast } from 'sonner';

interface CustomerModalProps {
    open: boolean;
    onClose: () => void;
    mode: 'create' | 'edit';
    data: Customer | null;
    onSuccess: () => void;
}

export function CustomerModal({ open, onClose, mode, data, onSuccess }: CustomerModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const formRef = useRef<HTMLDivElement>(null);

    // Handle Enter key to move to next field
    const handleEnterKey = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const inputs = Array.from(formRef.current?.querySelectorAll(
                'input:not([disabled]):not([type="hidden"]):not([type="checkbox"])'
            ) || []) as HTMLElement[];
            const currentIdx = inputs.indexOf(e.currentTarget);
            if (currentIdx !== -1 && currentIdx < inputs.length - 1) {
                inputs[currentIdx + 1].focus();
            }
        }
    };

    const [formData, setFormData] = useState<CustomerFormData>({
        code: '',
        name: '',
        is_active: true
    });

    useEffect(() => {
        if (mode === 'edit' && data) {
            setFormData({
                code: data.code,
                name: data.name,
                is_active: data.is_active
            });
        } else {
            setFormData({ code: '', name: '', is_active: true });
        }
    }, [mode, data, open]);

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            let result;
            if (mode === 'create') {
                result = await createCustomer(formData);
            } else {
                if (!data?.id) return;
                result = await updateCustomer(data.id, formData);
            }

            if (result.success) {
                toast.success(mode === 'create' ? 'Customer created successfully' : 'Customer updated successfully');
                onSuccess();
                onClose();
            }
        } catch (error) {
            console.error(error);
            toast.error('Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={mode === 'create' ? 'เพิ่มลูกค้า' : 'แก้ไขลูกค้า'}
            size="sm"
        >
            <div ref={formRef} className="space-y-4">
                {/* Code */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">รหัสลูกค้า</label>
                    <input
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        onKeyDown={handleEnterKey}
                        placeholder="e.g. CUST-001"
                        required
                        disabled={mode === 'edit'}
                    />
                </div>

                {/* Name */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">ชื่อลูกค้า</label>
                    <input
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        onKeyDown={handleEnterKey}
                        placeholder="e.g. บริษัท ABC จำกัด"
                        required
                    />
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">สถานะ</label>
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={formData.is_active}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                        <span className="text-sm">{formData.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                >
                    ยกเลิก
                </button>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                    {isLoading ? 'กำลังบันทึก...' : (mode === 'create' ? 'บันทึก' : 'อัพเดท')}
                </button>
            </div>
        </Modal>
    );
}
