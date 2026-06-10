import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AlertProvider } from "@/components/ui/central-alert";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "ProjectHub",
  description: "Project Management Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          forcedTheme="light"
          disableTransitionOnChange
        >
          <AlertProvider>
            {children}
            {/* Sonner toaster — surfaces toast.error / toast.success notifications globally */}
            <Toaster position="top-center" richColors closeButton />
          </AlertProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
