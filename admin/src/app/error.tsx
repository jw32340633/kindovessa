"use client";
import { Button } from '@/components/ui/button';
export default function AppError({ reset }: { reset: () => void }) {
  return <main role="alert" className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center"><h1 className="text-xl font-semibold">Unable to connect</h1><p>Please try again in a moment.</p><Button onClick={reset}>Try again</Button></main>;
}
