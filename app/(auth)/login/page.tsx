'use client'

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Layers } from "lucide-react"
import { login } from "@/lib/actions/auth-actions"

export default function LoginPage() {
    const router = useRouter()
    const [employeeCode, setEmployeeCode] = React.useState("")
    const [password, setPassword] = React.useState("")
    const [isLoading, setIsLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            const result = await login(employeeCode, password)

            if (result.success) {
                if (result.mustChangePassword) {
                    router.push('/change-password')
                } else {
                    router.push('/')
                }
            } else {
                setError(result.error || 'Login failed')
            }
        } catch (err) {
            setError('An error occurred during login')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex">
            {/* Left - Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-slate-950">
                <div className="w-full max-w-md space-y-8">
                    {/* Logo */}
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 text-2xl font-bold text-indigo-600">
                            <Layers className="h-8 w-8" />
                            <span>ProjectHub</span>
                        </div>
                        <h1 className="mt-6 text-3xl font-bold text-slate-900 dark:text-white">
                            Welcome back
                        </h1>
                        <p className="mt-2 text-slate-600 dark:text-slate-400">
                            Sign in to your account to continue
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {error && (
                            <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg">
                                {error}
                            </div>
                        )}

                        <Input
                            label="Employee Code"
                            type="text"
                            placeholder="e.g. 240001"
                            value={employeeCode}
                            onChange={(e) => setEmployeeCode(e.target.value)}
                            required
                        />

                        <div>
                            <Input
                                label="Password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <div className="mt-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                     <Checkbox id="remember" />
                                     <label htmlFor="remember" className="text-sm text-slate-600 cursor-pointer">Remember me</label>
                                </div>
                                <Link
                                    href="/forgot-password"
                                    className="text-sm text-indigo-600 hover:text-indigo-500"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Signing in..." : "Sign in"}
                        </Button>
                    </form>

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-white dark:bg-slate-950 px-4 text-slate-500">
                                Default Password: 1234
                            </span>
                        </div>
                    </div>

                    
                    {/* Sign up link */}
                    <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                        Don't have an account?{" "}
                        <Link
                            href="/register"
                            className="font-medium text-indigo-600 hover:text-indigo-500"
                        >
                            Contact Admin
                        </Link>
                    </p>
                </div>
            </div>

            {/* Right - Branding */}
            <div className="hidden lg:flex lg:flex-1 relative bg-slate-900 overflow-hidden">
                <div className="absolute inset-0">
                    <img 
                        src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop" 
                        alt="Abstract Background" 
                        className="w-full h-full object-cover opacity-40 hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                </div>
                
                <div className="relative z-10 w-full h-full flex flex-col justify-end p-16">
                    <div className="max-w-md">
                        <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
                            Build the future, <br/>
                            <span className="text-indigo-400">one task at a time.</span>
                        </h2>
                        <p className="text-lg text-slate-300">
                            The modern platform for engineering and product teams.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
