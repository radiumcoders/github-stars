import { Button } from "@/components/ui/button";
import { Geist, Geist_Mono } from "next/font/google";
import { Star } from "lucide-react";
import type { Metadata } from "next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GitHub Stars Video",
  description: "Generate an animation for your GitHub stars.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
      <body className="flex min-h-dvh flex-col bg-background font-sans">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6">
          <span className="text-sm font-medium tracking-tight">GitHub Stars</span>
          <Button variant="ghost" size="sm" asChild className="h-8 font-mono text-xs">
            <a
              href="https://github.com/radiumcoders/github-stars"
              target="_blank"
              rel="noreferrer noopener"
            >
              <Star data-icon="inline-start" />
              Star on GitHub
            </a>
          </Button>
        </div>

        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}