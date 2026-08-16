"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import Link from "next/link";
import { GlassButton } from "@/components/ui/GlassButton";

gsap.registerPlugin(useGSAP);

export default function NotFound() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;

    const root = containerRef.current;
    const code = root.querySelector<HTMLElement>(".nf-code");
    const title = root.querySelector<HTMLElement>(".nf-title");
    const desc = root.querySelector<HTMLElement>(".nf-desc");
    const btn = root.querySelector<HTMLElement>(".nf-btn");

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.fromTo(code, {
      autoAlpha: 0,
      scale: 0.8,
      filter: "blur(10px)",
    }, {
      autoAlpha: 1,
      scale: 1,
      filter: "blur(0px)",
      duration: 0.7,
    }, 0);

    tl.fromTo(title, {
      autoAlpha: 0,
      y: 12,
    }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.45,
    }, 0.4);

    tl.fromTo(desc, {
      autoAlpha: 0,
      y: 8,
    }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.4,
    }, 0.6);

    tl.fromTo(btn, {
      autoAlpha: 0,
      y: 12,
    }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.4,
    }, 0.8);

    return () => { tl.kill(); };
  }, []);

  return (
    <main className="relative min-h-[100dvh] overflow-hidden flex items-center justify-center">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/assets/images/grassland-bg.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40" />

      {/* Ambient light */}
      <div className="absolute inset-0 z-[1] pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-amber-400/8 rounded-full blur-[120px]" />
      </div>

      {/* Content */}
      <div ref={containerRef} className="relative z-10 text-center px-6">
        <div className="flex flex-col items-center gap-6">
          <span className="nf-code text-[120px] sm:text-[160px] font-extralight leading-none tracking-tighter text-white/90 select-none">
            404
          </span>
          <h1 className="nf-title text-xl sm:text-2xl font-light text-white/70 tracking-wide">
            Room not found
          </h1>
          <p className="nf-desc text-sm text-white/50 font-light max-w-sm mx-auto leading-relaxed">
            This focus space doesn&apos;t exist yet. Let&apos;s find you a better one.
          </p>
          <div className="nf-btn mt-2">
            <Link href="/">
              <GlassButton variant="primary" size="lg">
                Go Home
              </GlassButton>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
