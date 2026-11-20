export { metadata } from "@/configs/metadata";
export { viewport } from "@/configs/viewport";
import { inter, geistMono } from "@/configs/fonts";

import { TooltipProvider } from "@/components/ui/tooltip";
import ToastProvider from "@/providers/toast-provider";

import { cn } from "@/lib/utils";

import "@/styles/globals.css";
import "@/styles/includes.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn("h-full antialiased", inter.variable, geistMono.variable)}
    >
      <body
        suppressHydrationWarning
        className="min-h-full w-full flex flex-col"
      >
        <TooltipProvider>{children}</TooltipProvider>
        <ToastProvider />
      </body>
    </html>
  );
}
