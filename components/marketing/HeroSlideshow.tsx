"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

// Order is deliberate and fixed.
const SLIDES = [
  { src: "/marketing/hero-lift.jpg", label: "Lifting" },
  { src: "/marketing/hero-run.jpg", label: "Running" },
  { src: "/marketing/hero-female.jpg", label: "Training" },
  { src: "/marketing/hero-track.jpg", label: "Track" },
];

const HOLD_MS = 3500;
const FADE_MS = 1000;

export function HeroSlideshow() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Someone who has asked their system for less motion gets the first frame
    // and nothing else. A crossfade behind the headline is decoration, not
    // information, so there is nothing to lose by holding still.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;

    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, HOLD_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0" aria-hidden>
      {SLIDES.map((slide, i) => (
        <Image
          key={slide.src}
          src={slide.src}
          alt=""
          fill
          // The hero is full-bleed, so the browser always needs the widest
          // candidate — no point letting it guess from a layout width.
          sizes="100vw"
          // Only the first frame blocks paint. The rest are ordinary loads that
          // land well before their turn comes round.
          priority={i === 0}
          className="object-cover transition-opacity ease-in-out"
          style={{
            opacity: i === index ? 1 : 0,
            transitionDuration: `${FADE_MS}ms`,
          }}
        />
      ))}
    </div>
  );
}
