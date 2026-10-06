import type { ReactNode } from "react";

// Renders both languages; CSS in globals.css hides the one that doesn't match <html lang>.
// This keeps pages static and avoids a flash of the wrong language on load.
export default function L({ en, es }: { en: ReactNode; es: ReactNode }) {
  return (
    <>
      <span className="lang-en" lang="en">
        {en}
      </span>
      <span className="lang-es" lang="es">
        {es}
      </span>
    </>
  );
}
