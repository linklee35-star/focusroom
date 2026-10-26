"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import type { ReactNode } from "react";

gsap.registerPlugin(useGSAP);

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  /** "dark" = dark glass for overlay areas, "white" = Apple frosted glass for light theme */
  variant?: "dark" | "white";
}

const variantStyles = {
  dark: {
    bg: "bg-white/[0.08]",
    border: "border-white/[0.18]",
    blur: "backdrop-blur-md backdrop-saturate-150",
  },
  white: {
    bg: "bg-white/30",
    border: "border-white/50",
    blur: "backdrop-blur-md backdrop-saturate-150",
  },
} as const;

export function GlassCard({
  children,
  className = "",
  hover = true,
  variant = "white",
}: GlassCardProps) {
  const styles = variantStyles[variant];
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  // GSAP hover animation
  useGSAP(() => {
    if (!hover || !cardRef.current) return;

    const card = cardRef.current;
    const glow = glowRef.current;

    const enterTl = gsap.timeline({ paused: true });
    enterTl
      .to(card, {
        scale: 1.015,
        y: -2,
        duration: 0.45,
        ease: "power2.out",
      }, 0);

    if (variant === "white") {
      enterTl.to(card, {
        backgroundColor: "rgba(255,255,255,0.42)",
        borderColor: "rgba(255,255,255,0.65)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.1)",
        duration: 0.4,
      }, 0);
    } else {
      enterTl.to(card, {
        backgroundColor: "rgba(255,255,255,0.12)",
        borderColor: "rgba(255,255,255,0.24)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
        duration: 0.4,
      }, 0);
    }

    // Glow effect
    if (glow) {
      enterTl.to(glow, { autoAlpha: 1, duration: 0.35 }, 0);
    }

    const leaveTl = gsap.timeline({ paused: true })
      .to(card, {
        scale: 1,
        y: 0,
        backgroundColor: variant === "white" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)",
        borderColor: variant === "white" ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.18)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        duration: 0.5,
        ease: "power3.out",
      }, 0);

    if (glow) {
      leaveTl.to(glow, { autoAlpha: 0, duration: 0.4 }, 0);
    }

    const onEnter = () => { leaveTl.kill(); enterTl.restart(); };
    const onLeave = () => { enterTl.kill(); leaveTl.restart(); };

    card.addEventListener("mouseenter", onEnter);
    card.addEventListener("mouseleave", onLeave);

    return () => {
      card.removeEventListener("mouseenter", onEnter);
      card.removeEventListener("mouseleave", onLeave);
      enterTl.kill();
      leaveTl.kill();
    };
  }, [hover, variant]);

  return (
    <div
      ref={cardRef}
      className={`
        relative rounded-2xl ${styles.bg} ${styles.border} ${styles.blur} border
        shadow-[0_4px_16px_rgba(0,0,0,0.04)]
        ${className}
      `}
    >
      {/* Hover glow */}
      {hover && (
        <div
          ref={glowRef}
          className="absolute inset-0 rounded-2xl pointer-events-none opacity-0"
          style={{
            background: variant === "white"
              ? "radial-gradient(400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(0,0,0,0.03), transparent 60%)"
              : "radial-gradient(400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.06), transparent 60%)",
          }}
        />
      )}
      {children}
    </div>
  );
}
