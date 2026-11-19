"use client";

import { useState, useSyncExternalStore } from "react";
import Marquee from "react-fast-marquee";

import { headlineData } from "@/data/components.layouts-data";

import { X } from "lucide-react";

const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const getReducedMotion = () => window.matchMedia(motionQuery).matches;
const getServerReducedMotion = () => false;

export default function Headline() {
  const [isVisible, setIsVisible] = useState(true);
  const reducedMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    getReducedMotion,
    getServerReducedMotion,
  );

  if (!isVisible) return null;

  const announcements = headlineData.map(({ text, icon: Icon }) => (
    <span
      key={text}
      className="inline-flex items-center gap-2.5 px-6 py-3 text-sm leading-5 font-semibold tracking-wide uppercase md:gap-3 md:px-10 lg:px-14"
    >
      <Icon
        className="size-4 shrink-0 md:size-5"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <span>{text}</span>
    </span>
  ));

  return (
    <aside
      aria-label="Store announcements"
      className="flex min-h-11 w-full items-start bg-black text-accent-foreground md:min-h-12 md:items-center"
    >
      <ul className="sr-only">
        {headlineData.map(({ text }) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
      <div aria-hidden="true" className="min-w-0 flex-1 overflow-hidden">
        {reducedMotion ? (
          <div className="flex flex-wrap justify-center text-center">
            {announcements}
          </div>
        ) : (
          <Marquee
            autoFill
            gradient={false}
            speed={35}
            pauseOnHover
            pauseOnClick
            className="min-h-11 motion-reduce:[&_.rfm-marquee]:paused md:min-h-12"
          >
            {announcements}
          </Marquee>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss store announcements"
        onClick={() => setIsVisible(false)}
        className="flex min-h-11 w-11 shrink-0 items-center justify-center bg-black text-white transition-colors hover:bg-white/10 active:bg-white/15 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset focus-visible:ring-offset-0 motion-reduce:transition-none md:min-h-12 md:w-12"
      >
        <X className="size-5" strokeWidth={1.5} aria-hidden="true" />
      </button>
    </aside>
  );
}
