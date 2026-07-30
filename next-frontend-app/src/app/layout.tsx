"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import Header from "../components/Header";
import { AuthProvider } from "@/lib/auth-context";
import { usePathname } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

function RootLayoutInner({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isStaff = pathname.startsWith('/staff');

    return (
        <body className={inter.className}>
            <AuthProvider>
                {!isStaff && <Header />}
                <main>{children}</main>
            </AuthProvider>
        </body>
    );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ja">
            <RootLayoutInner>{children}</RootLayoutInner>
        </html>
    );
}
