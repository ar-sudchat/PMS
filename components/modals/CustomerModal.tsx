'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { Modal } from '@/components/ui/modal';
import { Customer, CustomerFormData } from '@/types/customer';
import { createCustomer, updateCustomer } from '@/lib/actions/customer-actions';
import { Switch } from '@/components/ui/Switch';
import { toast } from 'sonner';

const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

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

    const handleEnterKey = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const inputs = Array.from(formRef.current?.querySelectorAll(
                'input:not([disabled]):not([type="hidden"]):not([type="checkbox"]), textarea:not([disabled])'
            ) || []) as HTMLElement[];
            const currentIdx = inputs.indexOf(e.currentTarget);
            if (currentIdx !== -1 && currentIdx < inputs.length - 1) {
                inputs[currentIdx + 1].focus();
            }
        }
    };

    const [formData, setFormData] = useState<CustomerFormData>({
        code: '', name: '', short_name: '',
        is_customer: true, is_prime: false, is_partner: false, is_vendor: false,
        address: '', tax_id: '', contact_name: '', contact_email: '', contact_phone: '',
        is_active: true
    });

    useEffect(() => {
        if (mode === 'edit' && data) {
            setFormData({
                code: data.code,
                name: data.name,
                short_name: data.short_name || '',
                is_customer: data.is_customer ?? true,
                is_prime: data.is_prime ?? false,
                is_partner: data.is_partner ?? false,
                is_vendor: data.is_vendor ?? false,
                address: data.address || '',
                tax_id: data.tax_id || '',
                contact_name: data.contact_name || '',
                contact_email: data.contact_email || '',
                contact_phone: data.contact_phone || '',
                is_active: data.is_active
            });
        } else {
            setFormData({
                code: '', name: '', short_name: '',
                is_customer: true, is_prime: false, is_partner: false, is_vendor: false,
                address: '', tax_id: '', contact_name: '', contact_email: '', contact_phone: '',
                is_active: true
            });
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
                toast.success(mode === 'create' ? 'สร้าง Account สำเร็จ' : 'อัพเดท Account สำเร็จ');
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
            title={mode === 'create' ? 'เพิ่ม Account' : 'แก้ไข Account'}
            size="md"
        >
            <div ref={formRef} className="space-y-4">
                {/* Code */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">รหัส Account</label>
                    <input
                        className={inputClass}
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        onKeyDown={handleEnterKey}
                        placeholder="e.g. CUST-001"
                        required
                        disabled={mode === 'edit'}
                    />
                </div>

                {/* Name & Short Name */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-2">
                        <label className="text-sm font-medium">ชื่อ Account</label>
                        <input
                            className={inputClass}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            onKeyDown={handleEnterKey}
                            placeholder="e.g. บริษัท ABC จำกัด"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">ชื่อย่อ</label>
                        <input
                            className={inputClass}
                            value={formData.short_name}
                            onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                            onKeyDown={handleEnterKey}
                            placeholder="e.g. ABC"
                        />
                    </div>
                </div>

                {/* Account Type - Switches */}
                <div className="p-3 bg-slate-50 rounded-lg space-y-3">
                    <label className="text-sm font-medium text-slate-700">Account Type</label>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Customer</span>
                            <Switch
                                checked={formData.is_customer}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_customer: checked })}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Partner</span>
                            <Switch
                                checked={formData.is_partner}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_partner: checked })}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Prime</span>
                            <Switch
                                checked={formData.is_prime}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_prime: checked })}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Vendor</span>
                            <Switch
                                checked={formData.is_vendor}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_vendor: checked })}
                            />
                        </div>
                    </div>
                </div>

                {/* Address & Tax ID */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-2">
                        <label className="text-sm font-medium">ที่อยู่</label>
                        <input
                            className={inputClass}
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            onKeyDown={handleEnterKey}
                            placeholder="ที่อยู่บริษัท"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Tax ID</label>
                        <input
                            className={inputClass}
                            value={formData.tax_id}
                            onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                            onKeyDown={handleEnterKey}
                            placeholder="เลขประจำตัวผู้เสียภาษี"
                        />
                    </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">ผู้ติดต่อ</label>
                        <input
                            className={inputClass}
                            value={formData.contact_name}
                            onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                            onKeyDown={handleEnterKey}
                            placeholder="ชื่อผู้ติดต่อ"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Email</label>
                        <input
                            className={inputClass}
                            type="email"
                            value={formData.contact_email}
                            onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                            onKeyDown={handleEnterKey}
                            placeholder="email@example.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">โทรศัพท์</label>
                        <input
                            className={inputClass}
                            value={formData.contact_phone}
                            onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                            onKeyDown={handleEnterKey}
                            placeholder="0xx-xxx-xxxx"
                        />
                    </div>
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
