"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Layers, Github, Mail, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

export default function RegisterPage() {
    const [name, setName] = React.useState("")
    const [email, setEmail] = React.useState("")
    const [password, setPassword] = React.useState("")
    const [confirmPassword, setConfirmPassword] = React.useState("")
    const [agreeTerms, setAgreeTerms] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(false)

    // Password strength calculation
    const getPasswordStrength = (pass: string) => {
        let score = 0
        if (pass.length >= 8) score++
        if (/[a-z]/.test(pass)) score++
        if (/[A-Z]/.test(pass)) score++
        if (/[0-9]/.test(pass)) score++
        if (/[^a-zA-Z0-9]/.test(pass)) score++
        return score
    }

    const passwordStrength = getPasswordStrength(password)
    const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"]
    const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-green-500"]

    const requirements = [
        { met: password.length >= 8, text: "At least 8 characters" },
        { met: /[a-z]/.test(password), text: "Lowercase letter" },
        { met: /[A-Z]/.test(password), text: "Uppercase letter" },
        { met: /[0-9]/.test(password), text: "Number" },
        { met: /[^a-zA-Z0-9]/.test(password), text: "Special character" },
    ]

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) return
        setIsLoading(true)
        setTimeout(() => {
            window.location.href = "/"
        }, 1000)
    }

    return (
        <div className="min-h-screen flex">
            {/* Left - Branding */}
            <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-indigo-600 to-purple-700 items-center justify-center p-12">
                <div className="max-w-lg text-center text-white">
                    <h2 className="text-4xl font-bold mb-6">
                        Start managing your projects today
                    </h2>
                    <p className="text-lg text-indigo-100">
                        Join thousands of teams who use ProjectHub to streamline their workflow
                        and deliver exceptional results.
                    </p>
                </div>
            </div>

            {/* Right - Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md space-y-8">
                    {/* Logo */}
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 text-2xl font-bold text-indigo-600">
                            <Layers className="h-8 w-8" />
                            <span>ProjectHub</span>
                        </div>
                        <h1 className="mt-6 text-3xl font-bold text-slate-900 dark:text-white">
                            Create your account
                        </h1>
                        <p className="mt-2 text-slate-600 dark:text-slate-400">
                            Start your 14-day free trial
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input
                            label="Full name"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />

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
                                placeholder="Create a password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />

                            {/* Password Strength */}
                            {password && (
                                <div className="mt-3 space-y-2">
                                    <div className="flex gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "h-1 flex-1 rounded-full transition-colors",
                                                    i < passwordStrength ? strengthColors[passwordStrength - 1] : "bg-slate-200"
                                                )}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-600">
                                        Password strength: {strengthLabels[passwordStrength - 1] || "Very Weak"}
                                    </p>
                                    <div className="grid grid-cols-2 gap-1 text-xs">
                                        {requirements.map((req, i) => (
                                            <div key={i} className={cn("flex items-center gap-1", req.met ? "text-green-600" : "text-slate-400")}>
                                                {req.met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                                {req.text}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <Input
                            label="Confirm password"
                            type="password"
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            error={confirmPassword && password !== confirmPassword ? "Passwords don't match" : undefined}
                            required
                        />

                        <Checkbox
                            label="I agree to the Terms of Service and Privacy Policy"
                            checked={agreeTerms}
                            onChange={(e) => setAgreeTerms(e.target.checked)}
                        />

                        <Button type="submit" fullWidth isLoading={isLoading} disabled={!agreeTerms}>
                            Create account
                        </Button>
                    </form>

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-white dark:bg-slate-900 px-4 text-slate-500">
                                Or sign up with
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

                    {/* Login link */}
                    <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                        Already have an account?{" "}
                        <Link
                            href="/login"
                            className="font-medium text-indigo-600 hover:text-indigo-500"
                        >
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
