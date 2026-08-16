import { HeroSection } from "@/components/sections/HeroSection";

export default function HomePage() {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden">
      {/* Layer 1: blurred scaled fill background (no black edges) */}
      <img
        src="/assets/images/home-bg.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover scale-110 blur-3xl brightness-[0.7] z-0"
        aria-hidden
      />

      {/* Layer 2: clear original image, fully contained */}
      <img
        src="/assets/images/home-bg.jpg"
        alt="Cactus bird"
        className="relative z-10 w-full h-full object-contain max-h-[100dvh]"
      />

      {/* Layer 3: glass edge gradients to smooth edge transitions */}
      <div className="absolute inset-y-0 left-0 w-20 z-20 bg-gradient-to-r from-black/10 to-transparent backdrop-blur-[2px] pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-20 z-20 bg-gradient-to-l from-black/10 to-transparent backdrop-blur-[2px] pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-20 z-20 bg-gradient-to-b from-black/10 to-transparent backdrop-blur-[2px] pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-20 z-20 bg-gradient-to-t from-black/10 to-transparent backdrop-blur-[2px] pointer-events-none" />

      {/* Layer 4: subtle dark overlay for text readability */}
      <div className="absolute inset-0 z-30 bg-black/10 pointer-events-none" />

      {/* Content */}
      <HeroSection />
    </main>
  );
}
