import { SCENES } from "@/lib/constants";
import type { SceneSlug } from "@/types";
import { RoomPage } from "./RoomPage";

export function generateStaticParams() {
  return (Object.keys(SCENES) as SceneSlug[]).map((slug) => ({ slug }));
}

export default function Page() {
  return <RoomPage />;
}
