"use client";
import { Button } from '@/components/ui/button';
export default function DashboardError({ reset }: { reset: () => void }) {
  return <div role="alert" className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center"><h1 className="text-xl font-semibold">Unable to load your dashboard</h1><p>Please check your connection and try again.</p><Button onClick={reset}>Try again</Button></div>;
}
