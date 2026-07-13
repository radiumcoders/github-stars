import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <header className="flex justify-end p-2">
            <Button variant="ghost" asChild>
              <a
                href="https://github.com/radiumcoders/github-stars"
                target="_blank"
                rel="noreferrer noopener"
              >
                <ExternalLink className="mr-2 size-4" />
                GitHub
              </a>
            </Button>
            <ThemeToggle />
          </header>
          {children}
          <footer className="p-4 text-center text-sm text-muted-foreground">
            Not endorsed or affiliated with GitHub.
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}