"use client";

import { useEffect, useRef, useState } from "react";
import { getImageProps } from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
} from "framer-motion";

import { HeroSectionData } from "@/data/views.home-page-data";

type HeroSlideData = (typeof HeroSectionData)[number];

function HeroImage({
  image,
  priority = false,
}: {
  image: HeroSlideData["image"];
  priority?: boolean;
}) {
  const common = {
    alt: "",
    fill: true,
    sizes: "100vw",
    loading: "eager" as const,
    fetchPriority: priority ? ("high" as const) : ("low" as const),
    className: "object-cover object-top md:object-top-right",
  };
  const { props: desktop } = getImageProps({ ...common, src: image.desktop });
  const { props: tablet } = getImageProps({ ...common, src: image.tablet });
  const { props: mobile } = getImageProps({ ...common, src: image.mobile });

  return (
    <picture>
      <source
        media="(min-width: 1024px)"
        srcSet={desktop.srcSet}
        sizes="100vw"
      />
      <source media="(min-width: 768px)" srcSet={tablet.srcSet} sizes="100vw" />
      <img {...mobile} alt="" />
    </picture>
  );
}

function HeroSlide({
  slide,
  reducedMotion,
}: {
  slide: HeroSlideData;
  reducedMotion: boolean;
}) {
  const isPresent = useIsPresent();

  return (
    <motion.div
      initial={{ x: reducedMotion ? 0 : "100%" }}
      animate={{ x: 0 }}
      exit={{ x: reducedMotion ? 0 : "-100%" }}
      transition={{
        duration: reducedMotion ? 0 : 0.8,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`inset-0 [grid-area:1/1] min-w-0 min-h-[inherit] ${isPresent ? "relative" : "absolute"}`}
      aria-hidden={!isPresent || undefined}
      inert={!isPresent}
    >
      <HeroImage image={slide.image} priority />
      <div
        aria-hidden="true"
        className="hero-shade pointer-events-none absolute inset-0"
      />
      <div className="page-layout relative flex min-h-[inherit] items-end pt-[clamp(13rem,32svh,16rem)] pb-[calc(6rem+env(safe-area-inset-bottom,0px))] text-white md:items-center md:pt-10 md:pb-30 lg:pt-12 lg:pb-32">
        <div className="w-full md:w-[56%] md:max-w-[32rem] lg:w-[54%] lg:max-w-[43rem]">
          <p className="mb-3 flex items-center gap-3 text-xs font-semibold tracking-[0.14em] text-white/90 uppercase md:mb-5 md:text-sm">
            <span
              aria-hidden="true"
              className="h-0.5 w-7 shrink-0 bg-white/75"
            />
            {slide.category}
          </p>
          <h1 className="font-heading text-[clamp(2rem,8vw,2.375rem)] leading-[1.08] font-medium tracking-[-0.035em] text-white md:text-[clamp(2.5rem,4.5vw,3.25rem)] lg:text-[clamp(3.5rem,4.3vw,4.25rem)]">
            {slide.heading}
          </h1>
          <p className="mt-4 max-w-[38ch] text-[0.9375rem] leading-relaxed text-white/90 md:mt-5 md:text-base lg:text-lg">
            {slide.description}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-4 md:mt-7">
            <Link
              href={slide.cta.href}
              className="group inline-flex min-h-13 max-w-full items-center justify-between gap-4 rounded-full bg-background py-2 pl-5 pr-2 text-base font-semibold text-heading shadow-sm transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white md:pl-6 motion-reduce:transition-none"
            >
              <span>{slide.cta.label}</span>
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
              >
                <ArrowRight size={18} />
              </span>
            </Link>
            <Link
              href={slide.secondaryCta.href}
              className="hidden min-h-11 items-center border-b-2 border-white/60 text-base font-semibold text-white transition-colors hover:border-white hover:text-background focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white md:inline-flex motion-reduce:transition-none"
            >
              {slide.secondaryCta.label}
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function HeroSection() {
  const [activeSlide, setActiveSlide] = useState(0);
  const reducedMotion = Boolean(useReducedMotion());
  const categoryNav = useRef<HTMLElement>(null);
  const slide = HeroSectionData[activeSlide];
  const nextSlide = (activeSlide + 1) % HeroSectionData.length;
  const changeSlide = (direction: number) => {
    setActiveSlide(
      (current) =>
        (current + direction + HeroSectionData.length) % HeroSectionData.length,
    );
  };

  useEffect(() => {
    const nav = categoryNav.current;
    const selected = nav?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!nav || !selected) return;
    const left = selected.offsetLeft - nav.offsetLeft;
    if (
      left < nav.scrollLeft ||
      left + selected.offsetWidth > nav.scrollLeft + nav.clientWidth
    ) {
      nav.scrollTo({
        left: Math.max(0, left - 8),
        behavior: reducedMotion ? "instant" : "smooth",
      });
    }
  }, [activeSlide, reducedMotion]);

  return (
    <section
      aria-label="Shop everyday essentials"
      aria-roledescription="carousel"
      className="hero-carousel relative isolate grid min-h-[clamp(31.25rem,78svh,40.625rem)] w-full overflow-hidden bg-[#241C16] md:min-h-[clamp(32.5rem,72svh,40rem)] lg:min-h-[clamp(37.5rem,72svh,45rem)]"
    >
      <AnimatePresence initial={false}>
        <HeroSlide key={slide.id} slide={slide} reducedMotion={reducedMotion} />
      </AnimatePresence>

      {!reducedMotion && (
        <>
          <div
            className="pointer-events-none absolute inset-0 -z-10 opacity-0"
            aria-hidden="true"
          >
            <HeroImage image={HeroSectionData[nextSlide].image} />
          </div>
          <span
            key={activeSlide}
            aria-hidden="true"
            className="hero-progress pointer-events-none invisible absolute left-0 top-0 h-px w-full"
            onAnimationEnd={() => changeSlide(1)}
          />
        </>
      )}

      <div className="page-layout absolute inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-10 md:bottom-4">
        <nav
          ref={categoryNav}
          aria-label="Hero collections"
          className="hidden gap-2 overflow-x-auto overscroll-x-contain scroll-px-2 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex lg:max-w-256"
        >
          {HeroSectionData.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Show ${item.category}`}
              aria-current={index === activeSlide ? "true" : undefined}
              onClick={() => setActiveSlide(index)}
              className="group flex min-h-16 min-w-36 shrink-0 flex-col justify-center gap-3 rounded-lg border border-transparent px-3 py-3 text-left text-sm font-medium whitespace-nowrap text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white aria-current:bg-white/15 aria-current:font-semibold aria-current:text-white lg:flex-1 motion-reduce:transition-none"
            >
              <span
                className="relative block h-1 w-full overflow-hidden rounded-full bg-white/25"
                aria-hidden="true"
              >
                {index === activeSlide && (
                  <span
                    key={activeSlide}
                    className={`${reducedMotion ? "" : "hero-progress"} absolute inset-0 origin-left bg-white`}
                  />
                )}
              </span>
              <span>{item.category}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center justify-between gap-4 border-t border-white/25 pt-2 text-white md:hidden">
          <p className="text-sm font-medium tabular-nums">
            <span className="sr-only">Slide </span>
            {String(activeSlide + 1).padStart(2, "0")}{" "}
            <span className="mx-1 text-white/55" aria-hidden="true">
              /
            </span>
            <span className="sr-only"> of </span>
            <span className="text-white/70">
              {String(HeroSectionData.length).padStart(2, "0")}
            </span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Previous collection"
              onClick={() => changeSlide(-1)}
              className="flex size-11 items-center justify-center rounded-full border border-white/45 transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
            >
              <ArrowLeft size={19} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Next collection"
              onClick={() => changeSlide(1)}
              className="flex size-11 items-center justify-center rounded-full border border-white/45 transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
            >
              <ArrowRight size={19} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
