"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { setFilters } from "@/lib/category";

// Fired when the logo is clicked, so the search page clears its search box too.
export const HOME_EVENT = "mynursedex:home";

// The logo: back to the search page with everything reset, in one click. The filters are reset
// here directly (not just by navigating to "/"), because a Next.js navigation doesn't notify the
// sidebar and chips that the URL's ?c= / ?a= changed.
export default function HomeLink(props: Omit<ComponentProps<typeof Link>, "href">) {
  return (
    <Link
      {...props}
      href="/"
      onClick={() => {
        setFilters({ category: "all", area: "all" });
        window.dispatchEvent(new Event(HOME_EVENT));
      }}
    />
  );
}
