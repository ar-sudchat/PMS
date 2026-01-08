"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Layers, ArrowLeft, Mail } from "lucide-react"

export default function ForgotPasswordPage() {
    const [email, setEmail] = React.useState("")
    const [isLoading, setIsLoading] = React.useState(false)
    const [submitted, setSubmitted] = React.useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setTimeout(() => {
            setIsLoading(false)
            setSubmitted(true)
        }, 1500)
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-900">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 text-2xl font-bold text-indigo-600">
                        <Layers className="h-8 w-8" />
                        <span>ProjectHub</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
                    {!submitted ? (
                        <>
                            <h1 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-2">
                                Forgot your password?
                            </h1>
                            <p className="text-center text-slate-600 dark:text-slate-400 mb-6">
                                No worries! Enter your email and we'll send you reset instructions.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <Input
                                    label="Email address"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    leftIcon={<Mail className="h-4 w-4 text-slate-400" />}
                                    required
                                />

                                <Button type="submit" fullWidth isLoading={isLoading}>
                                    Send reset link
                                </Button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center">
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <Mail className="h-8 w-8 text-green-600" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                Check your email
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 mb-6">
                                We've sent password reset instructions to <strong>{email}</strong>
                            </p>
                            <Button variant="outline" onClick={() => setSubmitted(false)}>
                                Try another email
                            </Button>
                        </div>
                    )}

                    <div className="mt-6 text-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-500"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
