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
    const subtitleLine = root.querySelector<HTMLElement>(".hero-subtitle-line");
    const subtitle = root.querySelector<HTMLElement>(".hero-subtitle");
    const cta = root.querySelector<HTMLElement>(".hero-cta");
    const cards = root.querySelector<HTMLElement>(".hero-cards");

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    // Title chars staggered reveal with slight blur in -> clear
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

    // Subtitle line
    tl.fromTo(subtitleLine, {
      autoAlpha: 0,
      y: 16,
    }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.55,
    }, 1.0);

    // Subtitle paragraph
    tl.fromTo(subtitle, {
      autoAlpha: 0,
      y: 12,
    }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.5,
    }, 1.2);

    // CTA buttons
    tl.fromTo(cta, {
      autoAlpha: 0,
      y: 16,
    }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.5,
    }, 1.4);

    // Scene cards
    tl.fromTo(cards, {
      autoAlpha: 0,
      y: 30,
    }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.65,
    }, 1.6);

    return () => { tl.kill(); };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative z-10 flex flex-col items-center justify-center min-h-[100dvh] px-6 py-20 text-center"
    >
      {/* Title */}
      <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-light tracking-tighter text-white leading-[1.05] mb-6 pointer-events-none select-none drop-shadow-sm">
        {"Focus Better.".split("").map((char, i) => (
          <span key={i} className="hero-char inline-block">
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
        <br />
        <span className="hero-subtitle-line text-white/60 font-extralight inline-block">
          Study Deeper.
        </span>
      </h1>

      {/* Subtitle */}
      <p className="hero-subtitle text-base sm:text-lg text-white/50 max-w-md mx-auto mb-12 font-light tracking-wide leading-relaxed">
        Build your perfect study environment and stay focused.
      </p>

      {/* CTA Buttons */}
      <div className="hero-cta flex flex-col sm:flex-row gap-4 mb-24">
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
        className="hero-cards grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-2xl"
      >
        <Link href="/room/rain-library" className="block">
          <GlassCard variant="dark" className="p-6 h-full cursor-pointer">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">
                  🌧️
                </div>
                <h3 className="text-lg font-medium text-white tracking-tight">
                  Library
                </h3>
              </div>
              <p className="text-sm text-white/50 font-light leading-relaxed">
                Night rain, warm light, quiet shelves
              </p>
              <div className="flex gap-2 mt-1">
                {["Night", "Rain", "Library"].map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/[0.08] text-white/40 font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </GlassCard>
        </Link>

        <Link href="/room/snow-cabin" className="block">
          <GlassCard variant="dark" className="p-6 h-full cursor-pointer">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">
                  🏔️
                </div>
                <h3 className="text-lg font-medium text-white tracking-tight">
                  Snow
                </h3>
              </div>
              <p className="text-sm text-white/50 font-light leading-relaxed">
                Alpine retreat, crackling fire, winter calm
              </p>
              <div className="flex gap-2 mt-1">
                {["Snow", "Cabin", "Fireplace"].map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/[0.08] text-white/40 font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </GlassCard>
        </Link>

        <Link href="/room/ocean-morning" className="block">
          <GlassCard variant="dark" className="p-6 h-full cursor-pointer">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">
                  🌅
                </div>
                <h3 className="text-lg font-medium text-white tracking-tight">
                  Ocean
                </h3>
              </div>
              <p className="text-sm text-white/50 font-light leading-relaxed">
                Gentle waves, golden sunrise, endless horizon
              </p>
              <div className="flex gap-2 mt-1">
                {["Ocean", "Sunrise", "Beach"].map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/[0.08] text-white/40 font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </GlassCard>
        </Link>

        <Link href="/room/night-cafe" className="block">
          <GlassCard variant="dark" className="p-6 h-full cursor-pointer">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">
                  ☕
                </div>
                <h3 className="text-lg font-medium text-white tracking-tight">
                  Cafe
                </h3>
              </div>
              <p className="text-sm text-white/50 font-light leading-relaxed">
                City lights, rain-streaked windows, late night calm
              </p>
              <div className="flex gap-2 mt-1">
                {["Cafe", "Night", "City"].map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/[0.08] text-white/40 font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </GlassCard>
        </Link>
      </div>
    </section>
  );
}
