import type { Metadata, Viewport } from "next";
import { ClientProviders } from "@/components/providers/ClientProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Focus Room — Immersive Study Space",
    template: "%s | Focus Room",
  },
  description:
    "Build your perfect study environment and stay focused. Immersive virtual study spaces with ambient sounds and pomodoro timer.",
  keywords: [
    "study room",
    "focus timer",
    "pomodoro",
    "virtual library",
    "study with me",
    "focus space",
  ],
  authors: [{ name: "Focus Room" }],
  openGraph: {
    title: "Focus Room — Immersive Study Space",
    description: "Build your perfect study environment and stay focused.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Focus Room — Immersive Study Space",
    description: "Build your perfect study environment and stay focused.",
  },
};

export const viewport: Viewport = {
  themeColor: "#fafafa",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-800">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
