import type { Metadata } from "next";
import { Geist, Geist_Mono, Silkscreen } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const silkscreen = Silkscreen({
  variable: "--font-silkscreen",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Pokémon Battle Simulator",
  description: "Build teams and simulate turn-based Pokémon battles.",
};

const NAV_LINKS = [
  { href: "/teams", label: "Team Builder" },
  { href: "/battle", label: "Battle" },
  { href: "/simulate", label: "Simulate" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${silkscreen.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-field text-ink">
        <header className="border-b-4 border-panel-ink bg-panel">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link href="/" className="font-display text-lg tracking-wide text-panel-ink">
              Battle Simulator
            </Link>
            <nav className="flex gap-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded border-2 border-panel-ink px-3 py-1.5 text-sm font-medium text-panel-ink transition-colors hover:bg-panel-ink hover:text-panel"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
