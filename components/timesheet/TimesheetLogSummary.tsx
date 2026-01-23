"use client"

import { useState, useEffect } from "react"
import { getDailyLogSummary, DailyLogSummaryItem } from "@/lib/actions/timesheet-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Copy, Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

export function TimesheetLogSummary() {
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [data, setData] = useState<DailyLogSummaryItem[]>([])
    const [loading, setLoading] = useState(false)

    const fetchData = async () => {
        setLoading(true)
        const res = await getDailyLogSummary(date)
        if (res.success) {
            setData(res.data)
        } else {
            toast.error("Failed to fetch log summary")
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchData()
    }, [date])

    const copyToClipboard = () => {
        // Group by position
        const groups: Record<string, DailyLogSummaryItem[]> = {}
        data.forEach(item => {
            if (!groups[item.position]) groups[item.position] = []
            groups[item.position].push(item)
        })

        let text = `📅 Daily Log Summary: ${format(new Date(date), 'dd MMM yyyy')}\n\n`

        Object.keys(groups).sort().forEach(pos => {
            text += `🔹 ${pos}\n`
            const notLogged = groups[pos].filter(i => i.status === 'Not Logged')
            const logged = groups[pos].filter(i => i.status === 'Logged')

            if (notLogged.length > 0) {
                text += `❌ Not Logged:\n`
                notLogged.forEach(i => {
                    text += `  - ${i.name} (Tasks: ${i.task_count})\n`
                })
            }
            if (logged.length > 0) {
                text += `✅ Logged:\n`
                logged.forEach(i => {
                    text += `  - ${i.name}: ${i.logged_hours}h\n`
                })
            }
            text += '\n'
        })

        text += `\nPlease update your timesheet! ⏳`

        navigator.clipboard.writeText(text)
        toast.success("Copied summary to clipboard")
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold">Daily Log Summary</CardTitle>
                <div className="flex items-center gap-2">
                    <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-40 h-8 text-sm"
                    />
                    <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button size="sm" onClick={copyToClipboard} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Copy className="w-3 h-3 mr-2" />
                        Copy for Chat
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Position</TableHead>
                                <TableHead className="text-center">Tasks in Hand</TableHead>
                                <TableHead className="text-center">Logged Today</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Loading...
                                    </TableCell>
                                </TableRow>
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No employees found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((item) => (
                                    <TableRow key={item.id} className={item.status === 'Not Logged' ? 'bg-red-50/50' : ''}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="font-normal text-xs">
                                                {item.position}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center font-mono">
                                            {item.task_count}
                                        </TableCell>
                                        <TableCell className="text-center font-mono font-bold text-slate-700">
                                            {item.logged_hours}h
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {item.status === 'Logged' ? (
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">Logged</Badge>
                                            ) : (
                                                <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">Not Logged</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
