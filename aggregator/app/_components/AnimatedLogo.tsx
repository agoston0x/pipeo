"use client";

import { useEffect, useRef } from "react";

/**
 * 36×36 canvas logo. Plays a 10s one-shot animation:
 *   FFT bars → rotating circle (with gap) → FFT bars → dampen → freeze.
 * No perpetual CPU after t > 10.2s.
 *
 * Ported from /Users/mac/Code/Prague/pipeo/pipes-logo-anim.html.
 */
export function AnimatedLogo({ size = 36 }: { size?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const DISPLAY = size;
    const SIZE = 64;
    const DPR = window.devicePixelRatio || 1;
    canvas.width = DISPLAY * DPR;
    canvas.height = DISPLAY * DPR;
    canvas.style.width = DISPLAY + "px";
    canvas.style.height = DISPLAY + "px";
    ctx.scale((DISPLAY * DPR) / SIZE, (DISPLAY * DPR) / SIZE);

    const cx = SIZE / 2, cy = SIZE / 2;
    const R = SIZE * 0.30;
    const PIPE_W = SIZE * 0.115;
    const NUM_BARS = 4;
    const BAR_GAP = SIZE * 0.055;
    const TOTAL_W = NUM_BARS * PIPE_W + (NUM_BARS - 1) * BAR_GAP;
    const BAR_X = (i: number) => cx - TOTAL_W / 2 + PIPE_W / 2 + i * (PIPE_W + BAR_GAP);
    const BAR_BASE_Y = cy + SIZE * 0.30;
    const BAR_MAX_H = SIZE * 0.55;
    const BAR_MIN_H = SIZE * 0.18;

    const ARC_GAP_HALF = (7 * Math.PI) / 180;
    const ARC_SPAN = Math.PI / 2 - 2 * ARC_GAP_HALF;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    function colorAt(frac: number): [number, number, number] {
      const blue: [number, number, number] = [77, 162, 255];
      const pink: [number, number, number] = [254, 139, 194];
      return [
        Math.round(lerp(blue[0], pink[0], frac)),
        Math.round(lerp(blue[1], pink[1], frac)),
        Math.round(lerp(blue[2], pink[2], frac)),
      ];
    }

    function fftAmp(i: number, t: number, damp: number): number {
      const base = [0.55, 0.32, 0.82, 0.50][i];
      const freq = [4.2, 7.1, 5.5, 6.3][i];
      const phase = [0.0, 1.2, 0.5, 2.0][i];
      const mod = 0.30 * Math.sin(t * freq + phase) + 0.12 * Math.sin(t * freq * 1.7 + phase);
      return Math.max(0.05, Math.min(1, base + damp * mod));
    }

    function getState(t: number): { m: number; damp: number; done: boolean } {
      if (t < 2.5) return { m: 0, damp: 1, done: false };
      if (t < 3.6) return { m: easeInOut((t - 2.5) / 1.1), damp: 1, done: false };
      if (t < 5.6) return { m: 1, damp: 1, done: false };
      if (t < 6.7) return { m: easeInOut((6.7 - t) / 1.1), damp: 1, done: false };
      if (t < 9.2) return { m: 0, damp: 1, done: false };
      if (t < 10.2) return { m: 0, damp: 1 - (t - 9.2), done: false };
      return { m: 0, damp: 0, done: true };
    }

    function drawBar(i: number, m: number, t: number, rot: number, damp: number): void {
      const N = 28;
      const points: { x: number; y: number }[] = [];
      const amp = fftAmp(i, t, damp);
      const heightFFT = BAR_MIN_H + amp * (BAR_MAX_H - BAR_MIN_H);
      const ARC_LEN = R * ARC_SPAN;
      const heightMorph = lerp(heightFFT, ARC_LEN, m);
      const angleStart = (-3 * Math.PI) / 4 + ARC_GAP_HALF + i * Math.PI / 2 + rot;
      const angleEnd = angleStart + ARC_SPAN;

      for (let s = 0; s <= N; s++) {
        const u = s / N;
        const barX = BAR_X(i);
        const barY = BAR_BASE_Y - (1 - u) * heightMorph;
        const angle = lerp(angleStart, angleEnd, u);
        const arcX = cx + R * Math.cos(angle);
        const arcY = cy + R * Math.sin(angle);
        points.push({ x: lerp(barX, arcX, m), y: lerp(barY, arcY, m) });
      }

      const c = colorAt(i / (NUM_BARS - 1));
      ctx!.shadowBlur = 6;
      ctx!.shadowColor = `rgba(${c[0]},${c[1]},${c[2]},0.55)`;
      ctx!.strokeStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx!.lineWidth = PIPE_W;
      ctx!.lineCap = "round";
      ctx!.lineJoin = "round";
      ctx!.beginPath();
      ctx!.moveTo(points[0].x, points[0].y);
      for (let p = 1; p < points.length; p++) ctx!.lineTo(points[p].x, points[p].y);
      ctx!.stroke();
      ctx!.shadowBlur = 0;

      ctx!.strokeStyle = "rgba(255,255,255,0.40)";
      ctx!.lineWidth = PIPE_W * 0.22;
      ctx!.beginPath();
      ctx!.moveTo(points[0].x, points[0].y);
      for (let p = 1; p < points.length; p++) ctx!.lineTo(points[p].x, points[p].y);
      ctx!.stroke();
    }

    let startTime: number | null = null;
    let raf = 0;
    let stopped = false;

    function frame(now: number) {
      if (stopped) return;
      if (!startTime) startTime = now;
      const t = (now - startTime) / 1000;
      ctx!.clearRect(0, 0, SIZE, SIZE);
      const state = getState(t);
      const rot = t * 1.6;
      for (let i = 0; i < NUM_BARS; i++) drawBar(i, state.m, t, rot, state.damp);
      if (state.done) { stopped = true; return; }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => { stopped = true; cancelAnimationFrame(raf); };
  }, [size]);

  return <canvas ref={ref} aria-label="PIPEO" />;
}
