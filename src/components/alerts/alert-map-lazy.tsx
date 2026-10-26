"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "./alert-map";

// MapLibre touches `window` as soon as it is imported, so it is loaded in the browser only.
const AlertMap = dynamic(() => import("./alert-map"), {
  ssr: false,
  loading: () => <div className="h-[320px] w-full animate-pulse rounded-[14px] bg-fog md:h-[380px]" />,
});

export function AlertMapLazy({ points }: { points: MapPoint[] }) {
  return <AlertMap points={points} />;
}
