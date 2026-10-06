import Search from "@/components/Search";
import { entries, toSearchItem } from "@/lib/concepts";

export default function Home() {
  return (
    <Search items={entries.map(toSearchItem)} />
  );
}
