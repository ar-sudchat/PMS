"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Layers, Github, Mail } from "lucide-react"

export default function LoginPage() {
    const [email, setEmail] = React.useState("")
    const [password, setPassword] = React.useState("")
    const [remember, setRemember] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        // Simulate login - in real app, call API
        setTimeout(() => {
            window.location.href = "/"
        }, 1000)
    }

    return (
        <div className="min-h-screen flex">
            {/* Left - Form */}
            <div className="flex-1 flex items-center justify-center p-8">
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
                        <Input
                            label="Email address"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                                <Checkbox
                                    label="Remember me"
                                    checked={remember}
                                    onChange={(e) => setRemember(e.target.checked)}
                                />
                                <Link
                                    href="/forgot-password"
                                    className="text-sm text-indigo-600 hover:text-indigo-500"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                        </div>

                        <Button type="submit" fullWidth isLoading={isLoading}>
                            Sign in
                        </Button>
                    </form>

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-white dark:bg-slate-900 px-4 text-slate-500">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    {/* Social Login */}
                    <div className="grid grid-cols-2 gap-4">
                        <Button variant="outline" leftIcon={<Mail className="h-4 w-4" />}>
                            Google
                        </Button>
                        <Button variant="outline" leftIcon={<Github className="h-4 w-4" />}>
                            GitHub
                        </Button>
                    </div>

                    {/* Sign up link */}
                    <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                        Don't have an account?{" "}
                        <Link
                            href="/register"
                            className="font-medium text-indigo-600 hover:text-indigo-500"
                        >
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>

            {/* Right - Branding */}
            <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-indigo-600 to-purple-700 items-center justify-center p-12">
                <div className="max-w-lg text-center text-white">
                    <h2 className="text-4xl font-bold mb-6">
                        Manage your projects with ease
                    </h2>
                    <p className="text-lg text-indigo-100">
                        Stay organized, collaborate with your team, and deliver projects on time.
                        ProjectHub makes project management simple and intuitive.
                    </p>
                    <div className="mt-12 grid grid-cols-3 gap-8 text-center">
                        <div>
                            <div className="text-3xl font-bold">50K+</div>
                            <div className="text-indigo-200 text-sm">Active Users</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold">10M+</div>
                            <div className="text-indigo-200 text-sm">Tasks Completed</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold">99.9%</div>
                            <div className="text-indigo-200 text-sm">Uptime</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
