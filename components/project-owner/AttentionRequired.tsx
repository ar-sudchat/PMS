'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, AlertCircle, Clock, DollarSign } from 'lucide-react'
import Link from 'next/link'
import type { AttentionItem } from '@/lib/actions/project-owner-dashboard-actions'

interface AttentionRequiredProps {
    items: AttentionItem[]
}

const issueIcons: Record<string, React.ReactNode> = {
    MANDAY_OVER: <AlertTriangle className="h-4 w-4" />,
    MILESTONE_DELAYED: <Clock className="h-4 w-4" />,
    BUDGET_OVER: <DollarSign className="h-4 w-4" />,
    PROJECT_OVERDUE: <AlertCircle className="h-4 w-4" />
}

const severityColors: Record<string, string> = {
    HIGH: 'text-red-600 bg-red-50 border-red-200',
    MEDIUM: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    LOW: 'text-blue-600 bg-blue-50 border-blue-200'
}

export function AttentionRequired({ items }: AttentionRequiredProps) {
    return (
        <Card className="border-red-200 bg-red-50/30">
            <CardHeader className="pb-2">
                <CardTitle className="text-red-700 flex items-center gap-2 text-lg">
                    <AlertTriangle className="h-5 w-5" />
                    ATTENTION REQUIRED
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {items.map((item, idx) => (
                        <div
                            key={idx}
                            className={`flex items-start gap-3 p-3 rounded-lg border ${severityColors[item.severity]}`}
                        >
                            <div className="mt-0.5">
                                {issueIcons[item.issue_type] || <AlertCircle className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <Link
                                        href={`/projects/${item.project_id}`}
                                        className="font-medium hover:underline truncate"
                                    >
                                        {item.project_code}: {item.project_name}
                                    </Link>
                                    <Badge
                                        variant={item.severity === 'HIGH' ? 'destructive' : 'secondary'}
                                        className="text-xs"
                                    >
                                        {item.severity}
                                    </Badge>
                                </div>
                                <p className="text-sm opacity-90">{item.issue_description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
