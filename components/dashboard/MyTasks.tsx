import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, PlayCircle, AlertCircle } from "lucide-react"

interface Task {
    id: number
    title: string
    project: string
    status: string
    dueDate: string
}

interface MyTasksProps {
    tasks: Task[]
}

const statusMap: Record<string, { icon: any, color: "default" | "success" | "warning" | "destructive" | "secondary" }> = {
    "Completed": { icon: CheckCircle2, color: "success" },
    "In Progress": { icon: PlayCircle, color: "default" }, // Primary color
    "Todo": { icon: Clock, color: "secondary" },
    "Overdue": { icon: AlertCircle, color: "destructive" },
}

export function MyTasks({ tasks }: MyTasksProps) {
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>My Tasks Today</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {tasks.slice(0, 5).map((task) => {
                    const statusConfig = statusMap[task.status] || statusMap["Todo"]
                    const Icon = statusConfig.icon

                    return (
                        <div key={task.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                            <div className="flex items-start gap-3">
                                <div className={`mt-1 h-2 w-2 rounded-full ${task.status === "Overdue" ? "bg-red-500" : "bg-primary"}`} />
                                <div>
                                    <p className="font-medium text-sm leading-none">{task.title}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{task.project}</p>
                                </div>
                            </div>
                            <Badge variant={statusConfig.color} className="gap-1">
                                <Icon className="h-3 w-3" />
                                {task.status}
                            </Badge>
                        </div>
                    )
                })}
            </CardContent>
        </Card>
    )
}
