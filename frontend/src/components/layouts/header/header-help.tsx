import Link from "next/link";
import { CircleHelp } from "lucide-react";

export default function HeaderHelp() {
  return (
    <Link
      href="/help"
      aria-label="Help"
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full px-2 text-heading transition-colors hover:bg-muted md:px-3"
    >
      <CircleHelp size={23} strokeWidth={1.5} aria-hidden="true" />
      <span className="hidden text-base font-medium md:inline">Help</span>
    </Link>
  );
}
