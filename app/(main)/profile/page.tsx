'use client'

import { useState, useEffect } from 'react'
import { User, Mail, Phone, Lock, Save, Camera } from 'lucide-react'
import { getSession, updateProfile, changePassword } from '@/lib/actions/auth-actions'

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    // Profile form
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [nickname, setNickname] = useState('')

    // Password form
    const [showPasswordForm, setShowPasswordForm] = useState(false)
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    useEffect(() => {
        loadUser()
    }, [])

    const loadUser = async () => {
        const session = await getSession()
        setUser(session)
        if (session) {
            setEmail(session.email || '')
        }
        setIsLoading(false)
    }

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        setMessage(null)

        const result = await updateProfile({ email, phone, nickname })

        if (result.success) {
            setMessage({ type: 'success', text: 'บันทึกข้อมูลสำเร็จ' })
        } else {
            setMessage({ type: 'error', text: result.error || 'เกิดข้อผิดพลาด' })
        }

        setIsSaving(false)
    }

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'รหัสผ่านใหม่ไม่ตรงกัน' })
            return
        }

        setIsSaving(true)
        setMessage(null)

        const result = await changePassword(currentPassword, newPassword)

        if (result.success) {
            setMessage({ type: 'success', text: 'เปลี่ยนรหัสผ่านสำเร็จ' })
            setShowPasswordForm(false)
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
        } else {
            setMessage({ type: 'error', text: result.error || 'เกิดข้อผิดพลาด' })
        }

        setIsSaving(false)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">โปรไฟล์</h1>

            {/* Message */}
            {message && (
                <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Profile Card */}
            <div className="bg-white rounded-xl border p-6 mb-6">
                {/* Avatar & Name */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-2xl font-bold">
                            {user?.nameTh?.charAt(0) || 'U'}
                        </div>
                        <button className="absolute bottom-0 right-0 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700">
                            <Camera className="w-4 h-4" />
                        </button>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold">{user?.nameTh}</h2>
                        <p className="text-slate-500">{user?.employeeCode}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${user?.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                user?.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                                    'bg-slate-100 text-slate-700'
                            }`}>
                            {user?.role}
                        </span>
                    </div>
                </div>

                {/* Profile Form */}
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-11 pr-4 py-2 border border-slate-300 rounded-lg"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            เบอร์โทร
                        </label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full pl-11 pr-4 py-2 border border-slate-300 rounded-lg"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            ชื่อเล่น
                        </label>
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        บันทึก
                    </button>
                </form>
            </div>

            {/* Change Password */}
            <div className="bg-white rounded-xl border p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Lock className="w-5 h-5" />
                        เปลี่ยนรหัสผ่าน
                    </h3>
                    <button
                        onClick={() => setShowPasswordForm(!showPasswordForm)}
                        className="text-blue-600 text-sm hover:underline"
                    >
                        {showPasswordForm ? 'ยกเลิก' : 'เปลี่ยนรหัสผ่าน'}
                    </button>
                </div>

                {showPasswordForm && (
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                รหัสผ่านปัจจุบัน
                            </label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                รหัสผ่านใหม่
                            </label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                ยืนยันรหัสผ่านใหม่
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            เปลี่ยนรหัสผ่าน
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
