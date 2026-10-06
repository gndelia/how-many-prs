"use client";

import { useEffect, useRef } from "react";

const WEIGHTS = [0.3, 0.28, 0.22, 0.12, 0.08];

function pick() {
  let x = Math.random();
  for (let i = 0; i < WEIGHTS.length; i++) if ((x -= WEIGHTS[i]) < 0) return i;
  return WEIGHTS.length - 1;
}

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

export function ContributionHero() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const dark = matchMedia("(prefers-color-scheme: dark)");
    let cols = 0, cell = 14, gap = 4, cur: number[] = [], tgt: number[] = [], pal: number[][] = [], last = 0, raf = 0;

    const color = (v: number) => {
      const i = Math.min(3, Math.floor(v)), t = v - i, a = pal[i], b = pal[i + 1];
      return `rgb(${a.map((c, k) => Math.round(c + (b[k] - c) * t)).join(",")})`;
    };
    const paint = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (let x = 0; x < cols; x++)
        for (let y = 0; y < 7; y++) {
          ctx.fillStyle = color(cur[x * 7 + y]);
          ctx.beginPath();
          ctx.roundRect(x * (cell + gap), y * (cell + gap), cell, cell, 2);
          ctx.fill();
        }
    };
    const layout = () => {
      const w = cv.clientWidth, dpr = devicePixelRatio || 1, narrow = w < 640;
      cell = narrow ? 10 : 14;
      gap = narrow ? 3 : 4;
      cols = Math.floor((w + gap) / (cell + gap));
      const h = 7 * cell + 6 * gap;
      cv.style.height = `${h}px`;
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const styles = getComputedStyle(document.documentElement);
      pal = [0, 1, 2, 3, 4].map((i) => hex(styles.getPropertyValue(`--g${i}`).trim()));
      tgt = Array.from({ length: cols * 7 }, pick);
      cur = tgt.slice();
      paint();
    };
    const frame = (now: number) => {
      if (now - last > 90) {
        last = now;
        for (let k = 0; k < Math.ceil(cols * 7 * 0.03); k++) tgt[Math.floor(Math.random() * tgt.length)] = pick();
      }
      for (let i = 0; i < cur.length; i++) cur[i] += (tgt[i] - cur[i]) * 0.12;
      paint();
      raf = requestAnimationFrame(frame);
    };

    layout();
    if (!reduce.matches) raf = requestAnimationFrame(frame);
    addEventListener("resize", layout);
    dark.addEventListener("change", layout);
    const themeObserver = new MutationObserver(layout);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", layout);
      dark.removeEventListener("change", layout);
      themeObserver.disconnect();
    };
  }, []);

  return <canvas id="hero" ref={ref} aria-hidden="true" />;
}
