import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyOS — Your OS for studying",
  description:
    "Turn your university syllabus into a complete AI-powered learning system. Notes, numericals, MCQs, and a personal AI tutor.",
  keywords: ["study", "AI", "syllabus", "engineering", "SPPU", "notes"],
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "StudyOS",
    description: "Syllabus-first AI learning platform",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="min-h-screen bg-page font-sans antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
