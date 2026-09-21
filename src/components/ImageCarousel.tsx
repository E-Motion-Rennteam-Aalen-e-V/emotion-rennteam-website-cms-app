"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const CAROUSEL_IMAGES: { src: string; alt: string }[] = [
  { src: "/uploads/em-fahrzeug-detail.jpg", alt: "E-Motion Fahrzeug Detailansicht" },
  { src: "/uploads/ert-14-26-nightrun-rear.jpg", alt: "ERT-14-26 Heckansicht beim Nightrun" },
  { src: "/uploads/em-fahrzeug-buehne.jpg", alt: "E-Motion Fahrzeug auf der Präsentationsbühne" },
  { src: "/uploads/ert-12-24-track.jpg", alt: "ERT-12-24 auf der Rennstrecke" },
  { src: "/uploads/em-fahrzeug-heckfluegel.jpg", alt: "Heckflügel des E-Motion Fahrzeugs" },
  { src: "/uploads/ert-14-26-frontwing-detail.jpg", alt: "Frontflügel-Detail des ERT-14-26" },
  { src: "/uploads/ert-14-26-nightrun-cone.jpg", alt: "ERT-14-26 beim Nightrun mit Pylone" },
  { src: "/uploads/ert-14-26-sponsor-detail.jpg", alt: "Sponsoren-Logos am ERT-14-26" },
  { src: "/uploads/ert-14-26-nightrun-street.jpg", alt: "ERT-14-26 beim Nightrun auf der Straße" },
];

export default function ImageCarousel() {
  const [current, setCurrent] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const [autoPlay, setAutoPlay] = useState(!prefersReducedMotion);

  useEffect(() => {
    if (!autoPlay) return;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [autoPlay]);

  const next = () => {
    setCurrent((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    setAutoPlay(false);
  };

  const prev = () => {
    setCurrent((prev) => (prev - 1 + CAROUSEL_IMAGES.length) % CAROUSEL_IMAGES.length);
    setAutoPlay(false);
  };

  return (
    <div
      className="relative w-full h-full bg-gradient-to-br from-surface to-surface/50"
      onMouseEnter={() => setAutoPlay(false)}
      onMouseLeave={() => setAutoPlay(true)}
    >
      {/* Images Container */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Image
            src={CAROUSEL_IMAGES[current].src}
            alt={CAROUSEL_IMAGES[current].alt}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
            priority
          />
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      <div className="absolute inset-0 flex items-center justify-between px-4">
        <motion.button
          onClick={prev}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          aria-label="Vorheriges Bild"
        >
          ←
        </motion.button>

        <motion.button
          onClick={next}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          aria-label="Nächstes Bild"
        >
          →
        </motion.button>
      </div>

      {/* Indicator Dots */}
      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {CAROUSEL_IMAGES.map((_, i) => (
          <motion.button
            key={i}
            onClick={() => {
              setCurrent(i);
              setAutoPlay(false);
            }}
            className={`h-2 rounded-full transition-all ${
              i === current
                ? "w-6 bg-white"
                : "w-2 bg-white/50 hover:bg-white/75"
            }`}
            whileHover={{ scale: 1.2 }}
            aria-label={`Gehe zu Bild ${i + 1}`}
          />
        ))}
      </div>

      {/* Counter */}
      <div className="absolute top-4 right-4 z-10 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
        {current + 1}/{CAROUSEL_IMAGES.length}
      </div>
    </div>
  );
}
