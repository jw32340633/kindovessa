export { metadata } from "@/configs/metadata";
export { viewport } from "@/configs/viewport";
import { dmSans, manrope } from "@/configs/fonts";

import ToastProvider from "@/providers/toast-provider";

import { cn } from "@/lib/utils";

import "@/styles/globals.css";
import "@/styles/includes.css";
import "@/styles/animations.css";
import "@/styles/responsive.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn("h-full antialiased", dmSans.variable, manrope.variable)}
    >
      <body
        suppressHydrationWarning
        className="min-h-full w-full flex flex-col"
      >
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
