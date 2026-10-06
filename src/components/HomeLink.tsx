"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

// Fired when the logo is clicked, so the search page clears its search box too.
// Going to "/" already drops the filters (they live in the URL), but not the search box's state.
export const HOME_EVENT = "mynursedex:home";

export default function HomeLink(props: Omit<ComponentProps<typeof Link>, "href">) {
  return <Link {...props} href="/" onClick={() => window.dispatchEvent(new Event(HOME_EVENT))} />;
}
