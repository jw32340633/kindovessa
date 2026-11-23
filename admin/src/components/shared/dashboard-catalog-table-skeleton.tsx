import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

export default function DashboardCatalogTableSkeleton({
  rows,
  label,
}: {
  rows: number;
  label: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className="mt-2 overflow-hidden rounded-xl border bg-card md:mt-3"
    >
      <div className="flex flex-wrap gap-3 border-b p-4 sm:p-5">
        <Skeleton className="h-11 w-72 max-w-full" />
        <Skeleton className="h-11 w-40" />
      </div>
      <div className="overflow-hidden">
        <Skeleton className="h-12 w-full rounded-none" />
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="flex h-20 items-center gap-4 border-b border-border px-4"
          >
            <Skeleton className="size-12 shrink-0" />
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="hidden h-5 w-24 sm:block" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
      <div className="flex min-h-[73px] items-center justify-between gap-4 border-t border-border px-5 py-4">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner aria-hidden="true" />
          {label}
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  );
}
