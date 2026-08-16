import type { Scene, SceneSlug } from "@/types";

export const SCENES: Record<SceneSlug, Scene> = {
  "rain-library": {
    slug: "rain-library",
    title: "Library",
    description:
      "A quiet library on a rainy night. Warm amber light, distant thunder, and the soft patter of rain against old windows.",
    keywords: ["Night", "Rain", "Library", "Warm Light"],
    gradient: "from-black/30 via-black/20 to-black/50",
    overlayOpacity: "bg-black/40",
    modes: {
      outdoor: "/assets/images/rain-library.jpg",
      indoor: "/assets/images/rain-library-indoor.jpg",
    },
  },
  "snow-cabin": {
    slug: "snow-cabin",
    title: "Snow",
    description:
      "A wooden cabin deep in the mountains. Snow falls silently outside while the fireplace crackles and glows.",
    keywords: ["Snow", "Cabin", "Fireplace", "Winter"],
    gradient: "from-black/20 via-transparent to-black/50",
    overlayOpacity: "bg-black/35",
    modes: {
      outdoor: "/assets/images/snow-cabin.jpg",
      indoor: "/assets/images/snow-cabin-indoor.jpg",
    },
  },
  "ocean-morning": {
    slug: "ocean-morning",
    title: "Ocean",
    description:
      "A quiet beach at sunrise. Gentle waves, soft golden light, and the endless horizon stretching before you.",
    keywords: ["Ocean", "Sunrise", "Beach", "Morning"],
    gradient: "from-black/10 via-transparent to-black/40",
    overlayOpacity: "bg-black/25",
    modes: {
      outdoor: "/assets/images/ocean-morning.jpg",
      indoor: "/assets/images/ocean-morning-indoor.jpg",
    },
  },
  "night-cafe": {
    slug: "night-cafe",
    title: "Cafe",
    description:
      "A cozy late-night cafe. City lights blur through rain-streaked windows. The murmur of distant conversations.",
    keywords: ["Cafe", "Night", "City", "Rain"],
    gradient: "from-black/40 via-black/20 to-black/50",
    overlayOpacity: "bg-black/40",
    modes: {
      outdoor: "/assets/images/night-cafe.jpg",
      indoor: "/assets/images/night-cafe-indoor.jpg",
    },
  },
};

export const FOCUS_DURATION = 25 * 60; // 25 minutes in seconds
export const BREAK_DURATION = 5 * 60; // 5 minutes in seconds
