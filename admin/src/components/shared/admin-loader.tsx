import { Spinner } from '@/components/ui/spinner';

export default function AdminLoader() {
  return (
    <div role="status" aria-label="Loading admin" className="fixed inset-0 z-40 flex min-h-svh w-full items-center justify-center bg-background">
      <Spinner className="size-10 text-primary" strokeWidth={3} aria-hidden="true" />
      <span className="sr-only">Loading admin...</span>
    </div>
  );
}
