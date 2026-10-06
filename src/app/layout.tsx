import type { Metadata } from "next";
import Link from "next/link";
import { Atkinson_Hyperlegible, Pixelify_Sans } from "next/font/google";
import CategoryNav from "@/components/CategoryNav";
import L from "@/components/L";
import LangToggle from "@/components/LangToggle";
import PixelNurse from "@/components/PixelNurse";
import ThemeToggle from "@/components/ThemeToggle";
import { entries } from "@/lib/concepts";
import { AREAS, CATEGORIES, type Area, type Category } from "@/lib/types";
import "./globals.css";

const body = Atkinson_Hyperlegible({
  variable: "--font-body",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const pixel = Pixelify_Sans({
  variable: "--font-pixel",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NurseDex",
  description:
    "Consulta rápida de conceptos de enfermería: fármacos, patologías, laboratorios y planes de cuidado NANDA.",
};

// Runs before paint so the saved (or phone's) theme and language apply without a flash.
const initScript = `try{var d=document.documentElement,t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))d.classList.add("dark");var l=localStorage.getItem("lang")||((navigator.language||"").toLowerCase().indexOf("es")===0?"es":"en");d.lang=l}catch(e){}`;

const counts = Object.fromEntries([
  ["all", entries.length],
  ...CATEGORIES.map((c) => [c, entries.filter((e) => e.category === c).length]),
]) as Record<Category | "all", number>;

const areaCounts = Object.fromEntries(
  AREAS.map((a) => [a, entries.filter((e) => e.areas.includes(a)).length]),
) as Record<Area, number>;

function Brand({ size }: { size: number }) {
  return (
    <Link href="/" className="flex items-center gap-3 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mask">
      <span className="grid place-items-center rounded-[3px] bg-mist p-1 ring-2 ring-white/80">
        <PixelNurse size={size} />
      </span>
      <span className="font-pixel text-2xl leading-none text-white">NurseDex</span>
    </Link>
  );
}

function DexLights() {
  return (
    <span className="flex gap-1.5" aria-hidden>
      <span className="h-2 w-2 bg-mask" />
      <span className="h-2 w-2 bg-ceil" />
      <span className="h-2 w-2 bg-white" />
    </span>
  );
}

const disclaimer = (
  <L
    en="Study aid only. Always follow your instructors, facility protocols and current drug references."
    es="Solo para estudio. Siga siempre a sus docentes, los protocolos del centro y referencias de fármacos actualizadas."
  />
);

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${body.variable} ${pixel.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: initScript }} />
      </head>
      <body className="min-h-full font-sans lg:grid lg:grid-cols-[17rem_1fr]">
        {/* Phone / tablet: compact top bar */}
        <header className="sticky top-0 z-20 flex items-center gap-3 bg-header px-4 py-2.5 lg:hidden">
          <Brand size={32} />
          <div className="ml-auto flex items-center gap-1">
            <LangToggle />
            <ThemeToggle />
          </div>
        </header>

        {/* Desktop: the "device" sidebar */}
        <aside className="sticky top-0 hidden h-screen flex-col bg-header px-4 py-6 lg:flex">
          <div className="px-2">
            <Brand size={40} />
            <div className="mt-4">
              <DexLights />
            </div>
          </div>
          <nav className="mt-8" aria-label="Categorías">
            <CategoryNav counts={counts} areaCounts={areaCounts} />
          </nav>
          <div className="mt-auto space-y-4 px-2">
            <div className="flex items-center gap-1">
              <LangToggle />
              <ThemeToggle />
            </div>
            <p className="text-xs leading-relaxed text-ceil/80">{disclaimer}</p>
          </div>
        </aside>

        <div className="min-w-0">
          <main className="px-4 py-6 sm:px-8 lg:px-12 lg:py-10">{children}</main>
          <footer className="px-4 pb-8 text-xs text-muted sm:px-8 lg:hidden">{disclaimer}</footer>
        </div>
      </body>
    </html>
  );
}
