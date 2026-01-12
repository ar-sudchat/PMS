'use client'

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Layers, ArrowRight, User } from "lucide-react"
import { login } from "@/lib/actions/auth-actions"

export default function LoginPage() {
    const router = useRouter()
    const [employeeCode, setEmployeeCode] = React.useState("")
    const [isLoading, setIsLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            const result = await login(employeeCode)

            if (result.success) {
                router.push('/')
            } else {
                setError(result.error || 'Login failed')
                setIsLoading(false)
            }
        } catch (err) {
            setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ')
            setIsLoading(false)
        }
    }

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#0a0a0a] text-white">
            {/* Ambient Background Effects */}
            <div className="absolute inset-0 w-full h-full">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px]" />
                <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] rounded-full bg-purple-500/10 blur-[100px]" />
            </div>

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative z-10 w-full max-w-[420px] p-6"
            >
                {/* Glass Card */}
                <div className="relative backdrop-blur-2xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl ring-1 ring-white/5">

                    {/* Header */}
                    <div className="text-center mb-10 space-y-2">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 mb-4 shadow-lg shadow-indigo-500/30"
                        >
                            <Layers className="h-6 w-6 text-white" />
                        </motion.div>
                        <h1 className="text-2xl font-medium tracking-tight text-white">
                            Project Management
                        </h1>
                        <p className="text-sm text-zinc-400">
                            กรอกรหัสพนักงานเพื่อเข้าสู่ระบบ
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="p-3 text-xs text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg text-center"
                            >
                                {error}
                            </motion.div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <Input
                                    label="รหัสพนักงาน"
                                    type="text"
                                    placeholder="เช่น 240001"
                                    value={employeeCode}
                                    onChange={(e) => setEmployeeCode(e.target.value)}
                                    required
                                    autoFocus
                                    className="bg-black/20 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50 transition-all hover:bg-black/30 h-12 text-lg"
                                    leftIcon={<User className="h-5 w-5 text-zinc-500" />}
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-900/20 border-0 transition-all active:scale-[0.98] text-base"
                            disabled={isLoading || !employeeCode.trim()}
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    กำลังเข้าสู่ระบบ...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    เข้าสู่ระบบ <ArrowRight className="w-4 h-4 opacity-70" />
                                </span>
                            )}
                        </Button>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 text-center">
                        <p className="text-xs text-zinc-500">
                            Intranet Access Only
                        </p>

                        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-600">
                            <span>Powered by ProjectHub Team</span>
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <p className="mt-8 text-center text-xs text-zinc-600/60 font-medium tracking-widest uppercase">
                    © 2026 MacLab • Advanced Group
                </p>
            </motion.div>
        </div>
    )
}
