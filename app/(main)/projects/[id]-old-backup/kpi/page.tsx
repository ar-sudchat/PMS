"use client";

import { KPIDashboard } from "@/components/kpi/KPIDashboard";
import { mockCMMIProjects, mockKPITimesheets } from "@/lib/mock-projects";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ProjectKPIDashboardPage({ params }: { params: { id: string } }) {
    // In a real app, fetch based on params.id
    const project = mockCMMIProjects[0];
    const timesheets = mockKPITimesheets;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/timesheet">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <div className="flex items-baseline gap-2">
                        <h1 className="text-2xl font-bold text-gray-900">{project.project_name}</h1>
                        <span className="text-gray-500 font-mono text-sm">{project.project_code}</span>
                    </div>
                    <p className="text-muted-foreground">KPI Dashboard & Performance Analytics.</p>
                </div>
            </div>

            <KPIDashboard project={project} timesheets={timesheets} />
        </div>
    );
}
