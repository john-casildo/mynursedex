import type { NextConfig } from "next";

// Entries are read from data/ at runtime by the API routes (src/lib/concepts.ts), and that
// directory isn't found by automatic file tracing. data/raw/ (ETL source cache) is left out.
const ENTRY_FILES = [
  "./data/pharmacology/*.json",
  "./data/conditions/*.json",
  "./data/labs/*.json",
  "./data/fundamentals/*.json",
  "./data/abbreviations/*.json",
];

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/ask": ENTRY_FILES,
    "/api/request": ENTRY_FILES,
  },
};

export default nextConfig;
