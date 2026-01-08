'use client';

import { Header } from './Header';
import { TopNavigation } from './TopNavigation';

interface MainLayoutProps {
    children: React.ReactNode;
    title?: string;
    breadcrumb?: { label: string; href?: string }[];
}

export function MainLayout({ children, title, breadcrumb }: MainLayoutProps) {
    return (
        <div className="min-h-screen bg-[#F3F4F6]">
            <TopNavigation />
            {/* Main Content Area */}
            <div className="transition-all duration-300 ease-in-out pt-[70px]">
                {/* Header */}
                <Header
                    title={title}
                    breadcrumb={breadcrumb}
                />

                {/* Page Content */}
                <main className="p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
