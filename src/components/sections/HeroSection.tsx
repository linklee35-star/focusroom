"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import Link from "next/link";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassCard } from "@/components/ui/GlassCard";

gsap.registerPlugin(useGSAP);

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (!sectionRef.current) return;

    const root = sectionRef.current;
    const chars = root.querySelectorAll<HTMLSpanElement>(".hero-char");
    const cta = root.querySelector<HTMLElement>(".hero-cta");
    const cards = root.querySelector<HTMLElement>(".hero-cards");

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    // Title chars staggered reveal with blur
    tl.fromTo(chars, {
      autoAlpha: 0,
      y: 32,
      filter: "blur(6px)",
    }, {
      autoAlpha: 1,
      y: 0,
      filter: "blur(0px)",
      duration: 0.55,
      stagger: { each: 0.04, from: "start" },
    }, 0.15);

    // CTA buttons
    tl.fromTo(cta, {
      autoAlpha: 0,
      y: 16,
    }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.5,
    }, 1.2);

    // Scene cards
    tl.fromTo(cards, {
      autoAlpha: 0,
      y: 30,
    }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.65,
    }, 1.5);

    return () => { tl.kill(); };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative z-10 flex flex-col items-center justify-end min-h-[100dvh] px-6 pb-16 text-center"
    >
      {/* Title area — overlaid on image upper portion */}
      <div className="absolute inset-x-0 top-0 flex flex-col items-center justify-center pt-24 pb-12 pointer-events-none select-none">
        <h1
          className="hero-title-blend
                     text-5xl sm:text-6xl md:text-7xl lg:text-8xl
                     font-light tracking-tighter leading-[1.05]"
        >
          {"Focus Better.".split("").map((char, i) => (
            <span key={i} className="hero-char inline-block">
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
          <br />
          <span className="hero-subtitle-line font-extralight inline-block opacity-70">
            Study Deeper.
          </span>
        </h1>
      </div>

      {/* CTA + Cards */}
      <div className="w-full max-w-2xl flex flex-col items-center gap-12">
        {/* CTA Buttons */}
        <div className="hero-cta flex flex-col sm:flex-row gap-4">
          <Link href="/room/rain-library">
            <GlassButton variant="primary" size="lg">
              Start Studying
            </GlassButton>
          </Link>
          <a href="#scenes">
            <GlassButton variant="secondary" size="lg">
              Explore Rooms
            </GlassButton>
          </a>
        </div>

        {/* Scene Cards */}
        <div
          id="scenes"
          className="hero-cards grid grid-cols-1 md:grid-cols-2 gap-5 w-full"
        >
          <Link href="/room/rain-library" className="block">
            <GlassCard variant="dark" className="p-5 h-full cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">
                  🌧️
                </div>
                <h3 className="text-lg font-medium text-white tracking-tight">
                  Library
                </h3>
              </div>
              <div className="flex gap-2 mt-3">
                {["Night", "Rain", "Library"].map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/[0.08] text-white/40 font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </GlassCard>
          </Link>

          <Link href="/room/snow-cabin" className="block">
            <GlassCard variant="dark" className="p-5 h-full cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">
                  🏔️
                </div>
                <h3 className="text-lg font-medium text-white tracking-tight">
                  Snow
                </h3>
              </div>
              <div className="flex gap-2 mt-3">
                {["Snow", "Cabin", "Fireplace"].map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/[0.08] text-white/40 font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </GlassCard>
          </Link>

          <Link href="/room/ocean-morning" className="block">
            <GlassCard variant="dark" className="p-5 h-full cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">
                  🌅
                </div>
                <h3 className="text-lg font-medium text-white tracking-tight">
                  Ocean
                </h3>
              </div>
              <div className="flex gap-2 mt-3">
                {["Ocean", "Sunrise", "Beach"].map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/[0.08] text-white/40 font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </GlassCard>
          </Link>

          <Link href="/room/night-cafe" className="block">
            <GlassCard variant="dark" className="p-5 h-full cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">
                  ☕
                </div>
                <h3 className="text-lg font-medium text-white tracking-tight">
                  Cafe
                </h3>
              </div>
              <div className="flex gap-2 mt-3">
                {["Cafe", "Night", "City"].map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/[0.08] text-white/40 font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </GlassCard>
          </Link>
        </div>
      </div>
    </section>
  );
}
