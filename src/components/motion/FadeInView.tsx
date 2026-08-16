"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

const easeOut = [0.16, 1, 0.3, 1] as const;

interface FadeInViewProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "none";
}

export function FadeInView({
  children,
  className = "",
  delay = 0,
  duration = 0.6,
  direction = "up",
}: FadeInViewProps) {
  const yOffset = direction === "up" ? 24 : direction === "down" ? -24 : 0;

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: yOffset },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration, delay, ease: easeOut },
        },
      }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
    >
      {children}
    </motion.div>
  );
}
