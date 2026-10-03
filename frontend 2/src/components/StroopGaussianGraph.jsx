import React, { useEffect, useRef } from 'react';

// Gaussian curve resolution
const SAMPLES = 40;

// Smooth cubic bezier spline generator (Catmull-Rom to Cubic Bezier conversion)
function pointsToSmoothPath(points) {
  if (!points || points.length === 0) return '';
  const n = points.length;
  if (n === 1) return `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;

  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;

  for (let i = 0; i < n - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : { x: 2 * points[0].x - points[1].x, y: 2 * points[0].y - points[1].y };
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < n - 2 ? points[i + 2] : { x: 2 * points[n - 1].x - points[n - 2].x, y: 2 * points[n - 1].y - points[n - 2].y };

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  return d;
}

// Compute points for a Gaussian bell curve anchored to baseline Y=130
function computeGaussianPoints(xStart, xEnd, amp, mean, sigma) {
  const points = [];
  const dx = (xEnd - xStart) / (SAMPLES - 1);
  for (let i = 0; i < SAMPLES; i++) {
    const x = xStart + i * dx;
    // Pure continuous Gaussian function: y = baseline - amp * exp( - (x - mean)^2 / (2 * sigma^2) )
    const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(sigma, 2));
    let y = 130 - amp * Math.exp(exponent);
    // Pin outer boundary endpoints flush to baseline 130
    if (i === 0 || i === SAMPLES - 1) {
      y = 130;
    }
    points.push({ x, y });
  }
  return points;
}

// Particle configurations for calm, continuous real-time trial ingestion (~3x slower)
const CONG_PARTICLES = [
  { progress: 0.05, speed: 0.0011 },
  { progress: 0.25, speed: 0.0014 },
  { progress: 0.45, speed: 0.0010 },
  { progress: 0.65, speed: 0.0013 },
  { progress: 0.85, speed: 0.0012 },
];

const INCONG_PARTICLES = [
  { progress: 0.10, speed: 0.0010 },
  { progress: 0.30, speed: 0.0013 },
  { progress: 0.50, speed: 0.0011 },
  { progress: 0.70, speed: 0.0014 },
  { progress: 0.90, speed: 0.0012 },
];

export default function StroopGaussianGraph() {
  // SVG element references for direct 60fps GPU-composited updates
  const congPathRef = useRef(null);
  const congFillRef = useRef(null);
  const incongPathRef = useRef(null);
  const incongFillRef = useRef(null);

  const scanLineRef = useRef(null);
  const scanGlowRef = useRef(null);
  const scanHeadRef = useRef(null);
  const scanPulseRef = useRef(null);

  const congParticleRefs = useRef([]);
  const incongParticleRefs = useRef([]);

  // Time & progress refs
  const timeRef = useRef(0);
  const scanProgressRef = useRef(0);
  const congParticlesRef = useRef(CONG_PARTICLES.map((p) => ({ ...p })));
  const incongParticlesRef = useRef(INCONG_PARTICLES.map((p) => ({ ...p })));

  // Initial curve coordinates for SSR / immediate static paint
  const initCongPts = computeGaussianPoints(50, 310, 105, 170, 28);
  const initIncongPts = computeGaussianPoints(140, 430, 90, 280, 36);
  const initCongD = pointsToSmoothPath(initCongPts);
  const initIncongD = pointsToSmoothPath(initIncongPts);
  const initCongFill = `${initCongD} L 310,130 L 50,130 Z`;
  const initIncongFill = `${initIncongD} L 430,130 L 140,130 Z`;

  useEffect(() => {
    let animId;

    const renderFrame = () => {
      // 1. Advance continuous time slowly (~3x slower than before)
      timeRef.current += 0.006;
      const t = timeRef.current;

      // 2. Gentle, continuous harmonic sine modulation for Congruent distribution
      const congAmp = 105 + Math.sin(t * 0.7) * 2.8 + Math.cos(t * 0.4) * 1.2;
      const congMean = 170 + Math.cos(t * 0.5) * 2.0;
      const congSigma = 28 + Math.sin(t * 0.35) * 0.7;

      // 3. Gentle, continuous harmonic sine modulation for Incongruent distribution
      const incongAmp = 90 + Math.sin(t * 0.6 + 1.2) * 2.4 + Math.cos(t * 0.35) * 1.0;
      const incongMean = 280 + Math.sin(t * 0.45 + 0.8) * 2.0;
      const incongSigma = 36 + Math.cos(t * 0.3) * 0.8;

      // 4. Compute updated smooth cubic bezier paths without clearing or abruptly resetting
      const congPts = computeGaussianPoints(50, 310, congAmp, congMean, congSigma);
      const incongPts = computeGaussianPoints(140, 430, incongAmp, incongMean, incongSigma);

      const congD = pointsToSmoothPath(congPts);
      const incongD = pointsToSmoothPath(incongPts);

      if (congPathRef.current) congPathRef.current.setAttribute('d', congD);
      if (congFillRef.current) congFillRef.current.setAttribute('d', `${congD} L 310,130 L 50,130 Z`);
      if (incongPathRef.current) incongPathRef.current.setAttribute('d', incongD);
      if (incongFillRef.current) incongFillRef.current.setAttribute('d', `${incongD} L 430,130 L 140,130 Z`);

      // 5. Continuous slow vertical scanning line sweep across 200ms (x=50) to 600ms (x=450)
      scanProgressRef.current = (scanProgressRef.current + 0.0012) % 1;
      const scanX = (50 + scanProgressRef.current * 400).toFixed(1);

      if (scanLineRef.current) {
        scanLineRef.current.setAttribute('x1', scanX);
        scanLineRef.current.setAttribute('x2', scanX);
      }
      if (scanGlowRef.current) {
        scanGlowRef.current.setAttribute('x1', scanX);
        scanGlowRef.current.setAttribute('x2', scanX);
      }
      if (scanHeadRef.current) {
        scanHeadRef.current.setAttribute('cx', scanX);
      }
      if (scanPulseRef.current) {
        // Smooth mathematical pulse without CSS scale transform glitches
        const pulseR = (4.0 + Math.sin(t * 2.5) * 1.5).toFixed(1);
        const pulseOpacity = (0.35 + Math.sin(t * 2.5) * 0.25).toFixed(2);
        scanPulseRef.current.setAttribute('cx', scanX);
        scanPulseRef.current.setAttribute('r', pulseR);
        scanPulseRef.current.setAttribute('opacity', pulseOpacity);
      }

      // 6. Animate Congruent trial ingestion particles sliding smoothly along curve
      congParticlesRef.current.forEach((particle, idx) => {
        particle.progress = (particle.progress + particle.speed) % 1;
        const px = 50 + particle.progress * 260;
        const exponent = -Math.pow(px - congMean, 2) / (2 * Math.pow(congSigma, 2));
        const py = 130 - congAmp * Math.exp(exponent);
        const opacity = Math.sin(particle.progress * Math.PI) * 0.85;

        const el = congParticleRefs.current[idx];
        if (el) {
          el.setAttribute('cx', px.toFixed(1));
          el.setAttribute('cy', py.toFixed(1));
          el.setAttribute('opacity', opacity.toFixed(2));
        }
      });

      // 7. Animate Incongruent trial ingestion particles sliding smoothly along curve
      incongParticlesRef.current.forEach((particle, idx) => {
        particle.progress = (particle.progress + particle.speed) % 1;
        const px = 140 + particle.progress * 290;
        const exponent = -Math.pow(px - incongMean, 2) / (2 * Math.pow(incongSigma, 2));
        const py = 130 - incongAmp * Math.exp(exponent);
        const opacity = Math.sin(particle.progress * Math.PI) * 0.85;

        const el = incongParticleRefs.current[idx];
        if (el) {
          el.setAttribute('cx', px.toFixed(1));
          el.setAttribute('cy', py.toFixed(1));
          el.setAttribute('opacity', opacity.toFixed(2));
        }
      });

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="bg-slate-950 rounded-2xl sm:rounded-3xl p-5 border border-slate-800 relative overflow-hidden will-change-transform transform-gpu select-none shadow-2xl">
      {/* Header & Legends */}
      <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-3 flex-wrap gap-2">
        <span className="font-semibold tracking-wide">REACTION TIME DISTRIBUTION (GAUSSIAN FIT)</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-1 bg-sky-400 rounded"></span> Congruent
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-1 bg-emerald-400 rounded"></span> Incongruent
          </span>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="h-44 w-full relative">
        <svg className="w-full h-full" viewBox="0 0 500 160" preserveAspectRatio="none">
          <defs>
            {/* Soft area gradients under the bell curves */}
            <linearGradient id="stroopCongGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="stroopIncongGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.0" />
            </linearGradient>

            {/* Glowing scan beam */}
            <linearGradient id="stroopScanBeam" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.0" />
              <stop offset="35%" stopColor="#38bdf8" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.9" />
            </linearGradient>

            {/* Glow filter for scanner and particles */}
            <filter id="stroopGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Fixed static baseline & grid lines - completely untouched by JS animation */}
          <line
            x1="50"
            y1="130"
            x2="450"
            y2="130"
            stroke="#334155"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1="50"
            y1="130"
            x2="450"
            y2="130"
            stroke="#475569"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.6"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1="150"
            y1="20"
            x2="150"
            y2="130"
            stroke="#1e293b"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1="280"
            y1="20"
            x2="280"
            y2="130"
            stroke="#1e293b"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />

          {/* Congruent Bell Curve Fill & Stroke (Sky) */}
          <path
            ref={congFillRef}
            d={initCongFill}
            fill="url(#stroopCongGrad)"
            vectorEffect="non-scaling-stroke"
          />
          <path
            ref={congPathRef}
            d={initCongD}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* Incongruent Bell Curve Fill & Stroke (Emerald) */}
          <path
            ref={incongFillRef}
            d={initIncongFill}
            fill="url(#stroopIncongGrad)"
            vectorEffect="non-scaling-stroke"
          />
          <path
            ref={incongPathRef}
            d={initIncongD}
            fill="none"
            stroke="#34d399"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* Congruent Trial Ingestion Particle Dots (Sky) */}
          {CONG_PARTICLES.map((_, i) => (
            <circle
              key={`cong-p-${i}`}
              ref={(el) => (congParticleRefs.current[i] = el)}
              r={3}
              className="fill-sky-300"
              filter="url(#stroopGlow)"
              cx={170}
              cy={25}
              opacity={0}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Incongruent Trial Ingestion Particle Dots (Emerald) */}
          {INCONG_PARTICLES.map((_, i) => (
            <circle
              key={`incong-p-${i}`}
              ref={(el) => (incongParticleRefs.current[i] = el)}
              r={3}
              className="fill-emerald-300"
              filter="url(#stroopGlow)"
              cx={280}
              cy={40}
              opacity={0}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Continuous Vertical Scanning Line / Pulse Beam */}
          <line
            ref={scanGlowRef}
            x1="50"
            y1="16"
            x2="50"
            y2="130"
            stroke="#38bdf8"
            strokeWidth="3.5"
            opacity="0.3"
            filter="url(#stroopGlow)"
            vectorEffect="non-scaling-stroke"
          />
          <line
            ref={scanLineRef}
            x1="50"
            y1="16"
            x2="50"
            y2="130"
            stroke="url(#stroopScanBeam)"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            vectorEffect="non-scaling-stroke"
          />
          {/* Scanner Leading Indicator Head */}
          <circle
            ref={scanPulseRef}
            cx="50"
            cy="130"
            r={5}
            className="fill-sky-400"
            opacity={0.5}
            vectorEffect="non-scaling-stroke"
          />
          <circle
            ref={scanHeadRef}
            cx="50"
            cy="130"
            r={3}
            className="fill-emerald-400"
            filter="url(#stroopGlow)"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      {/* Latency Axis Labels (200ms - 600ms) */}
      <div className="flex justify-between text-[11px] font-mono text-slate-500 mt-2 px-1">
        <span>200ms</span>
        <span>300ms</span>
        <span>400ms</span>
        <span>500ms</span>
        <span>600ms</span>
      </div>
    </div>
  );
}
