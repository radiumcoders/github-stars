import { Button } from "@/components/ui/button";
import { Geist, Geist_Mono } from "next/font/google";
import { ExternalLink } from "lucide-react";
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
        <header className="flex h-14 items-center justify-between border-b border-border px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-6 items-center justify-center border border-border bg-foreground">
              <span className="font-mono text-[10px] font-medium text-background">★</span>
            </div>
            <span className="text-sm font-medium tracking-tight">GitHub Stars</span>
          </div>
          <Button variant="ghost" size="sm" asChild className="h-8 font-mono text-xs">
            <a
              href="https://github.com/radiumcoders/github-stars"
              target="_blank"
              rel="noreferrer noopener"
            >
              <ExternalLink data-icon="inline-start" />
              Source
            </a>
          </Button>
        </header>

        <div className="flex flex-1 flex-col">{children}</div>

        <footer className="border-t border-border px-4 py-6 text-center font-mono text-[11px] text-muted-foreground">
          Not endorsed or affiliated with GitHub.
        </footer>
      </body>
    </html>
  );
}