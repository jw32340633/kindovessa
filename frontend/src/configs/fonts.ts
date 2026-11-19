import { Manrope, DM_Sans } from "next/font/google";

export const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal"],
  display: "swap",
  preload: true,
  fallback: ["Arial", "sans-serif"],
});

export const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal"],
  display: "swap",
  preload: true,
  fallback: ["Arial", "sans-serif"],
});
