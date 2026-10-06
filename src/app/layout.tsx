import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Atkinson_Hyperlegible, Pixelify_Sans, Silkscreen } from "next/font/google";
import AuthorCard from "@/components/AuthorCard";
import CategoryNav from "@/components/CategoryNav";
import HomeLink from "@/components/HomeLink";
import L from "@/components/L";
import LangToggle from "@/components/LangToggle";
import PixelIcon from "@/components/PixelIcon";
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

// Silkscreen is built for tiny pixel sizes; used only on the type badges.
const typeFont = Silkscreen({
  variable: "--font-type",
  weight: "400",
  subsets: ["latin"],
});

const pixel = Pixelify_Sans({
  variable: "--font-pixel",
  subsets: ["latin"],
});

const AUTHOR = { name: "John Casildo", url: "https://github.com/john-casildo" };

export const metadata: Metadata = {
  // Public address, so link previews (opengraph-image) use absolute URLs.
  metadataBase: new URL("https://mynursedex.vercel.app"),
  title: "MyNurseDex",
  description:
    "Consulta rápida de conceptos de enfermería: fármacos, patologías, laboratorios y planes de cuidado NANDA.",
  authors: [{ name: AUTHOR.name, url: AUTHOR.url }],
  creator: AUTHOR.name,
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
    <HomeLink className="nurse-hop flex items-center gap-3 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mask">
      <span className="grid place-items-center rounded-[3px] bg-mist p-1 ring-2 ring-white/80">
        <PixelNurse size={size} className="nurse-sprite" />
      </span>
      <span className="font-pixel text-2xl leading-none text-white">MyNurseDex</span>
    </HomeLink>
  );
}

function DexLights() {
  return (
    <span className="flex gap-1.5" aria-hidden>
      <span className="dex-light h-2 w-2 bg-mask" />
      <span className="dex-light h-2 w-2 bg-ceil" />
      <span className="dex-light h-2 w-2 bg-white" />
    </span>
  );
}

const disclaimer = (
  <L
    en="Study aid only. Always follow your instructors, facility protocols and current drug references."
    es="Solo para estudio. Siga siempre a sus docentes, los protocolos del centro y referencias de fármacos actualizadas."
  />
);

function Credit({ className }: { className: string }) {
  return (
    <p className={className}>
      <L en="Made by " es="Hecho por " />
      <AuthorCard name={AUTHOR.name} />
      <L en=" for his wife " es=" para su esposa " />
      {/* "Mafe" and the pixel heart (the Conditions icon, in rose) never wrap apart */}
      <span className="whitespace-nowrap">
        Mafe
        <span className="heart-beat ml-1 inline-block align-[-2px]" style={{ color: "#E0679A" }} aria-hidden>
          <PixelIcon name="conditions" size={13} />
        </span>
      </span>
    </p>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${body.variable} ${pixel.variable} ${typeFont.variable} h-full antialiased`}
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
            <Credit className="text-xs text-ceil decoration-ceil/50 hover:text-white" />
          </div>
        </aside>

        <div className="min-w-0">
          <main className="px-4 py-6 sm:px-8 lg:px-12 lg:py-10">{children}</main>
          <footer className="space-y-2 px-4 pb-8 text-xs text-muted sm:px-8 lg:hidden">
            <p>{disclaimer}</p>
            <Credit className="decoration-line hover:text-ink" />
          </footer>
        </div>
        {/* Vercel Web Analytics: anonymous page views, no cookies */}
        <Analytics />
      </body>
    </html>
  );
}
