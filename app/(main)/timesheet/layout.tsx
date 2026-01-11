"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Clock, CheckSquare, BarChart3 } from "lucide-react";

const tabs = [
    { name: "My Timesheet", href: "/timesheet", icon: Clock },
];

export default function TimesheetLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col h-full bg-gray-50/50">
            <div className="border-b bg-white px-6 py-3">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Clock className="h-6 w-6 text-blue-600" />
                        Timesheet Management
                    </h1>
                    <div className="h-6 w-[1px] bg-gray-200 mx-2" />
                    <nav className="flex items-center gap-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = pathname === tab.href;
                            return (
                                <Link key={tab.href} href={tab.href}>
                                    <Button
                                        variant={isActive ? "secondary" : "ghost"}
                                        size="sm"
                                        className={cn(
                                            "gap-2",
                                            isActive && "bg-blue-50 text-blue-700 hover:bg-blue-100"
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {tab.name}
                                    </Button>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>
            <div className="flex-1 p-6 overflow-auto">
                {children}
            </div>
        </div>
    );
}
