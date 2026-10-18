"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

const HeroScene = dynamic(() => import("./hero-scene"), {
  ssr: false,
  loading: () => <Fallback />,
});

function Fallback() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="size-64 rounded-full bg-[radial-gradient(circle_at_35%_30%,oklch(0.78_0.15_295),oklch(0.5_0.22_285)_55%,transparent_70%)] opacity-80 blur-sm" />
    </div>
  );
}

/** Loads three.js only on the client, only when the hero is on screen, and only if WebGL exists. */
export function HeroVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;
  const [visible, setVisible] = useState(false);
  const [webgl] = useState(() => {
    if (typeof document === "undefined") return true;
    try {
      return !!document.createElement("canvas").getContext("webgl2");
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative h-[380px] w-full sm:h-[460px] lg:h-[560px]">
      {webgl ? <HeroScene reduced={reduced} paused={!visible} /> : <Fallback />}
    </div>
  );
}
