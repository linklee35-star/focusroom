"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import type { ReactNode } from "react";

gsap.registerPlugin(useGSAP);

interface GlassButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  "aria-label"?: string;
}

const variantStyles = {
  primary:
    "bg-zinc-900 text-white hover:bg-black shadow-sm",
  secondary:
    "bg-white/30 backdrop-blur-md backdrop-saturate-150 text-zinc-800 border border-white/50 hover:bg-white/40 hover:border-white/70 shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_4px_16px_rgba(0,0,0,0.06)]",
  ghost:
    "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100",
  outline:
    "bg-transparent text-zinc-700 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300",
} as const;

const sizeStyles = {
  sm: "px-4 py-2 text-sm rounded-xl",
  md: "px-6 py-3 text-sm rounded-xl",
  lg: "px-8 py-3.5 text-base rounded-2xl",
} as const;

export function GlassButton({
  children,
  variant = "primary",
  size = "md",
  className = "",
  onClick,
  disabled = false,
  type = "button",
  ...rest
}: GlassButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);

  // GSAP hover and tap animations
  useGSAP(() => {
    if (!btnRef.current || disabled) return;

    const btn = btnRef.current;

    const hoverIn = gsap.to(btn, {
      scale: 1.03,
      duration: 0.2,
      ease: "power2.out",
      paused: true,
    });

    const hoverOut = gsap.to(btn, {
      scale: 1,
      duration: 0.25,
      ease: "power2.out",
      paused: true,
    });

    const pressIn = gsap.to(btn, {
      scale: 0.96,
      duration: 0.1,
      ease: "power2.in",
      paused: true,
    });

    const pressOut = gsap.to(btn, {
      scale: 1,
      duration: 0.2,
      ease: "back.out(1.4)",
      paused: true,
    });

    const onEnter = () => {
      hoverOut.kill();
      pressOut.kill();
      hoverIn.restart();
    };
    const onLeave = () => {
      hoverIn.kill();
      pressIn.kill();
      hoverOut.restart();
    };
    const onDown = () => {
      hoverIn.kill();
      pressIn.restart();
    };
    const onUp = () => {
      pressIn.kill();
      pressOut.restart();
    };

    btn.addEventListener("mouseenter", onEnter);
    btn.addEventListener("mouseleave", onLeave);
    btn.addEventListener("mousedown", onDown);
    btn.addEventListener("mouseup", onUp);
    btn.addEventListener("touchstart", onDown, { passive: true });
    btn.addEventListener("touchend", onUp);

    return () => {
      btn.removeEventListener("mouseenter", onEnter);
      btn.removeEventListener("mouseleave", onLeave);
      btn.removeEventListener("mousedown", onDown);
      btn.removeEventListener("mouseup", onUp);
      btn.removeEventListener("touchstart", onDown);
      btn.removeEventListener("touchend", onUp);
      hoverIn.kill();
      hoverOut.kill();
      pressIn.kill();
      pressOut.kill();
    };
  }, [disabled]);

  return (
    <button
      ref={btnRef}
      className={`
        inline-flex items-center justify-center gap-2 font-medium
        transition-colors cursor-pointer
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      type={type}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}
