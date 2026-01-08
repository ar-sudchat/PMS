// app/(main)/layout.tsx
import { TopNavigation } from "@/components/layout/TopNavigation";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
            {/* Fixed Top Navigation */}
            <TopNavigation />

            {/* Main Content (with top padding for fixed nav) */}
            <main
                style={{
                    paddingTop: "70px", // Height of TopNavigation
                    minHeight: "100vh",
                }}
            >
                <div style={{ padding: "24px" }}>
                    {children}
                </div>
            </main>
        </div>
    );
}
