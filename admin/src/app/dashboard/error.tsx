"use client";

import { Button } from "@/components/ui/button";
export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <div
      role="alert"
      className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center"
    >
      <h1 className="text-xl font-semibold">Unable to load your dashboard</h1>
      <p>Please check your connection and try again.</p>
      <Button
        type="button"
        onClick={reset}
        className="h-11 rounded-none px-5"
        style={{
          boxShadow:
            "rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px",
        }}
      >
        Try again
      </Button>
    </div>
  );
}
