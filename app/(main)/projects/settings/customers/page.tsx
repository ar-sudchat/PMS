'use client';

import { useState, useEffect } from 'react';
import { Plus, Users, Edit, Trash2 } from 'lucide-react';
import { SuperTable } from '@/components/shared/SuperTable/SuperTable';
import { Customer } from '@/types/customer';
import { getCustomers, deleteCustomer } from '@/lib/actions/customer-actions';
import { CustomerModal } from '@/components/modals/CustomerModal';
import { ConfirmDeleteModal } from '@/components/modals/ConfirmDeleteModal';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function CustomersPage() {
    const [data, setData] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [selectedItem, setSelectedItem] = useState<Customer | null>(null);

    // Delete State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Customer | null>(null);

    const refreshData = async () => {
        try {
            const customers = await getCustomers();
            console.log("Fetched customers:", customers); // Debugging
            setData(customers);
        } catch (error) {
            console.error('Failed to fetch customers:', error);
            toast.error('Failed to load customers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshData();
    }, []);

    const handleCreate = () => {
        setModalMode('create');
        setSelectedItem(null);
        setIsModalOpen(true);
    };

    const handleEdit = (customer: Customer) => {
        setSelectedItem(customer);
        setModalMode('edit');
        setIsModalOpen(true);
    };

    const handleDeleteClick = (customer: Customer) => {
        setItemToDelete(customer);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await deleteCustomer(itemToDelete.id);
            toast.success('Customer deleted successfully');
            refreshData();
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete customer');
        }
    };

    const handleSaveSuccess = () => {
        setIsModalOpen(false);
        setSelectedItem(null);
        refreshData();
    };

    const columns: ColumnDef<Customer>[] = [
        {
            accessorKey: "code",
            header: "Code",
            cell: ({ row }) => (
                <span className="font-mono text-slate-500 font-medium">{row.original.code}</span>
            ),
            size: 100,
        },
        {
            accessorKey: "name",
            header: "Customer",
            cell: ({ row }) => (
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                        style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "8px",
                            background: `#6366f115`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: '#6366f1',
                        }}
                    >
                        <Users size={18} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, color: "#1e293b", fontSize: '14px' }}>{row.original.name}</div>
                    </div>
                </div>
            ),
            size: 500,
        },
        /*
        {
            accessorKey: "address",
            header: "ที่อยู่",
            cell: ({ row }) => (
                <span className="text-slate-600 text-sm">{row.original.address || '-'}</span>
            ),
            size: 200,
        },
        {
            accessorKey: "tax_id",
            header: "Tax ID",
            cell: ({ row }) => (
                <span className="text-slate-600 text-sm font-mono">{row.original.tax_id || '-'}</span>
            ),
            size: 120,
        },
        {
            accessorKey: "contact_name",
            header: "ผู้ติดต่อ",
            cell: ({ row }) => (
                <div>
                    <div className="text-slate-800 text-sm">{row.original.contact_name || '-'}</div>
                    {row.original.contact_email && (
                        <div className="text-xs text-slate-500">{row.original.contact_email}</div>
                    )}
                </div>
            ),
            size: 180,
        },
        {
            accessorKey: "contact_phone",
            header: "โทรศัพท์",
            cell: ({ row }) => (
                <span className="text-slate-600 text-sm">{row.original.contact_phone || '-'}</span>
            ),
            size: 120,
        },
        */
        {
            accessorKey: "is_active",
            header: "Status",
            cell: ({ getValue }) => {
                const active = getValue() as boolean;
                return (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {active ? 'Active' : 'Inactive'}
                    </span>
                );
            },
            size: 90,
        },
        {
            id: 'actions',
            header: () => <div style={{ textAlign: "right" }}>Actions</div>,
            cell: ({ row }) => (
                <div style={{ textAlign: "right", display: "flex", justifyContent: "flex-end", gap: "4px" }}>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(row.original)}
                        title="Edit Details"
                        className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                    >
                        <Edit size={16} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(row.original)}
                        title="Delete Customer"
                        className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                    >
                        <Trash2 size={16} />
                    </Button>
                </div>
            ),
            size: 100,
            enableSorting: false,
        }
    ];

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading customers...</div>;
    }

    return (
        <div className="h-full flex flex-col space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
                    <p className="text-slate-500">Manage customer accounts</p>
                </div>
                <Button
                    onClick={handleCreate}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                >
                    <Plus size={20} />
                    เพิ่มลูกค้า
                </Button>
            </div>

            {/* SuperTable */}
            <SuperTable
                data={data}
                columns={columns}
                size="md"
                enableSorting={true}
                enableGlobalFilter={true}
                searchPlaceholder="Search customers..."
            />

            {/* Modal */}
            <CustomerModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                mode={modalMode}
                data={selectedItem}
                onSuccess={handleSaveSuccess}
            />

            {/* Delete Confirm */}
            <ConfirmDeleteModal
                open={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="ลบลูกค้า"
                message={`ต้องการลบลูกค้า "${itemToDelete?.name}" หรือไม่?`}
                isLoading={false}
            />
        </div>
    );
}
