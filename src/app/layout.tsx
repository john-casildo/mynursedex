import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import L from "@/components/L";
import LangToggle from "@/components/LangToggle";
import ThemeToggle from "@/components/ThemeToggle";
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
  title: "NurseDex",
  description:
    "Consulta rápida de conceptos de enfermería: fármacos, patologías y laboratorios.",
};

// Runs before paint so the saved (or phone's) theme and language apply without a flash.
const initScript = `try{var d=document.documentElement,t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))d.classList.add("dark");var l=localStorage.getItem("lang")||((navigator.language||"").toLowerCase().indexOf("es")===0?"es":"en");d.lang=l}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: initScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <header className="sticky top-0 z-10 bg-header shadow-md">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
            <Link href="/" className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full border-4 border-white bg-mask shadow-inner" />
              <span className="hidden gap-1.5 min-[400px]:flex">
                <span className="h-2.5 w-2.5 rounded-full bg-white" />
                <span className="h-2.5 w-2.5 rounded-full bg-ceil" />
                <span className="h-2.5 w-2.5 rounded-full bg-mask" />
              </span>
              <span className="text-xl font-bold tracking-tight text-white">
                NurseDex
              </span>
            </Link>
            <div className="ml-auto flex items-center gap-1">
              <LangToggle />
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5">
          {children}
        </main>
        <footer className="mx-auto max-w-2xl px-4 pb-6 text-center text-xs text-muted">
          <L
            en="Study aid only. Always follow your instructor, facility policy and current drug references."
            es="Solo para estudio. Siga siempre las indicaciones de su docente, los protocolos del centro y referencias de fármacos actualizadas."
          />
        </footer>
      </body>
    </html>
  );
}
