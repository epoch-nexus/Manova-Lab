import React, { useEffect, useRef } from 'react';

// Live simulation parameters
const NUM_POINTS = 50;
const WIDTH = 600;
const BASELINE_EEG = 40;
const BASELINE_GAZE = 45;
const DX = WIDTH / (NUM_POINTS - 1);

// Linear interpolation helper
const lerp = (current, target, factor = 0.05) => current + (target - current) * factor;

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

// Generate organic wave coordinates from phase t, frequencies, harmonics, and interpolated noise
function generateWavePoints(t, base, a1, f1, a2, f2, a3, f3, noiseArr) {
  const points = [];
  for (let i = 0; i < NUM_POINTS; i++) {
    const x = i * DX;
    const noise = noiseArr ? noiseArr[i] : 0;
    const y =
      base +
      a1 * Math.sin(x * f1 + t) +
      a2 * Math.sin(x * f2 + t * 1.5) +
      a3 * Math.sin(x * f3 - t * 0.8) +
      noise;
    points.push({ x, y });
  }
  return points;
}

export default function PipelineGraph({ trialCount = 1, measuredLatency = 218.4 }) {
  // DOM element refs for direct high-performance GPU updates without React re-render churn
  const eegPathRef = useRef(null);
  const gazePathRef = useRef(null);
  const tipRef = useRef(null);

  // Phase variable t and noise state buffers
  const tRef = useRef(0);
  const noiseTickRef = useRef(0);
  const erpTickRef = useRef(0);

  const eegCurrentNoise = useRef(new Float32Array(NUM_POINTS));
  const eegTargetNoise = useRef(new Float32Array(NUM_POINTS));
  const gazeCurrentNoise = useRef(new Float32Array(NUM_POINTS));
  const gazeTargetNoise = useRef(new Float32Array(NUM_POINTS));

  // Compute initial static paths for SSR & immediate initial render
  const initialEegPts = generateWavePoints(0, BASELINE_EEG, 5.2, 0.022, 3.1, 0.045, 1.6, 0.078, null);
  const initialGazePts = generateWavePoints(0, BASELINE_GAZE, 4.8, 0.015, 2.4, 0.032, 1.2, 0.055, null);
  const initialEegD = pointsToSmoothPath(initialEegPts);
  const initialGazeD = pointsToSmoothPath(initialGazePts);
  const initialTipY = initialEegPts[NUM_POINTS - 1].y;

  useEffect(() => {
    let animId;

    const updateFrame = () => {
      // 1. Shift continuous phase variable t smoothly inside requestAnimationFrame
      tRef.current += 0.018;
      const t = tRef.current;

      const eegNoise = eegCurrentNoise.current;
      const eegTarget = eegTargetNoise.current;
      const gazeNoise = gazeCurrentNoise.current;
      const gazeTarget = gazeTargetNoise.current;

      // 2. Smoothly interpolate target random spikes and noise with lerp(current, target, 0.05)
      for (let i = 0; i < NUM_POINTS; i++) {
        eegNoise[i] = lerp(eegNoise[i], eegTarget[i], 0.05);
        gazeNoise[i] = lerp(gazeNoise[i], gazeTarget[i], 0.05);
      }

      // 3. Periodic subtle organic target noise generation
      noiseTickRef.current += 1;
      if (noiseTickRef.current % 30 === 0) {
        for (let i = 0; i < NUM_POINTS; i++) {
          eegTarget[i] = (Math.random() - 0.5) * 3.5;
          gazeTarget[i] = (Math.random() - 0.5) * 2.5;
        }
      }

      // 4. Stimulus onset ERP wave packet (smooth N200 deflection and P300 rebound)
      erpTickRef.current += 1;
      if (erpTickRef.current > 160) {
        erpTickRef.current = 0;
        const center = Math.floor(NUM_POINTS * 0.72);
        for (let offset = -5; offset <= 5; offset++) {
          const idx = center + offset;
          if (idx >= 0 && idx < NUM_POINTS) {
            const gaussian = Math.exp(-(offset * offset) / 5);
            const deflection = (offset < 0 ? -14 : 12) * gaussian;
            eegTarget[idx] += deflection;
          }
        }
      }

      // 5. Generate smooth organic multi-frequency waves
      const eegPts = generateWavePoints(t, BASELINE_EEG, 5.2, 0.022, 3.1, 0.045, 1.6, 0.078, eegNoise);
      const gazePts = generateWavePoints(t * 0.85, BASELINE_GAZE, 4.8, 0.015, 2.4, 0.032, 1.2, 0.055, gazeNoise);

      // 6. Build cubic bezier SVG path strings (C commands)
      const eegD = pointsToSmoothPath(eegPts);
      const gazeD = pointsToSmoothPath(gazePts);

      // 7. Directly update SVG DOM attributes for stutter-free 60fps rendering
      if (eegPathRef.current) {
        eegPathRef.current.setAttribute('d', eegD);
      }
      if (gazePathRef.current) {
        gazePathRef.current.setAttribute('d', gazeD);
      }
      if (tipRef.current) {
        const tipY = eegPts[NUM_POINTS - 1].y;
        tipRef.current.setAttribute('transform', `translate(${WIDTH}, ${tipY.toFixed(1)})`);
      }

      animId = requestAnimationFrame(updateFrame);
    };

    animId = requestAnimationFrame(updateFrame);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="bg-slate-900 rounded-[28px] sm:rounded-[32px] p-6 text-white font-mono text-xs border border-slate-800/90 relative shadow-2xl">
      {/* Channel Header & Bus Status */}
      <div className="flex flex-wrap items-center justify-between mb-4 text-slate-400 gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <span className="px-3.5 py-1.5 rounded-[18px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold tracking-wide flex items-center gap-1.5 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            CHANNEL 01 [FRONTAL_N200]
          </span>
          <span className="text-slate-300 font-bold text-[11px]">1000 Hz</span>
          <span className="text-slate-600">|</span>
          <span className="px-3.5 py-1.5 rounded-[18px] bg-sky-500/10 border border-sky-500/20 text-sky-400 font-semibold tracking-wide flex items-center gap-1.5 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
            CHANNEL 02 [GAZE_X_COORD]
          </span>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-[18px] bg-slate-800/80 border border-slate-700/80 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-slate-200 uppercase tracking-wider text-[11px] font-semibold">
            RAW TELEMETRY BUS
          </span>
        </div>
      </div>

      {/* Graph Visual Area with Softer ~3x Rounded Corners */}
      <div className="bg-slate-950/85 rounded-[24px] p-5 border border-slate-800/80 shadow-inner relative overflow-hidden">
        {/* Ambient Grid overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="w-full h-full grid grid-rows-4 grid-cols-6 divide-y divide-x divide-slate-800">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} />
            ))}
          </div>
        </div>

        <div className="h-28 w-full flex items-center justify-center relative">
          <svg
            className="w-full h-24 fill-none overflow-visible"
            preserveAspectRatio="none"
            viewBox="0 0 600 80"
          >
            <defs>
              <filter id="glow-emerald" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Channel 02: Gaze X (Sky Blue Dashed Line with non-scaling stroke) */}
            <path
              ref={gazePathRef}
              d={initialGazeD}
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              opacity="0.45"
              vectorEffect="non-scaling-stroke"
            />

            {/* Channel 01: Frontal N200 EEG (Emerald Solid Line with cubic bezier smoothness and non-scaling stroke) */}
            <path
              ref={eegPathRef}
              d={initialEegD}
              stroke="#34d399"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />

            {/* Smooth Gliding Glowing Pulsing Dot at Leading Tip */}
            <g
              ref={tipRef}
              transform={`translate(${WIDTH}, ${initialTipY.toFixed(1)})`}
            >
              <circle
                cx={0}
                cy={0}
                r={8}
                className="fill-emerald-400 animate-ping"
                opacity="0.65"
              />
              <circle
                cx={0}
                cy={0}
                r={4.5}
                className="fill-emerald-300"
                filter="url(#glow-emerald)"
              />
              <circle
                cx={0}
                cy={0}
                r={2}
                className="fill-white"
              />
            </g>
          </svg>
        </div>
      </div>

      {/* Bottom Telemetry Metrics Strip with Matching Softer Curvature */}
      <div className="mt-4 bg-slate-950/40 rounded-[22px] px-5 py-3 border border-slate-800/60 flex flex-wrap items-center justify-between text-slate-400 gap-3">
        <div className="flex items-center gap-3 sm:gap-5 flex-wrap text-xs">
          <span className="text-emerald-400 font-bold flex items-center gap-1.5">
            <span className="text-[10px]">▲</span> STIMULUS ONSET #{410 + trialCount}
          </span>
          <span>
            Response: <strong className="text-white font-mono">{measuredLatency}ms</strong>
          </span>
          <span className="text-emerald-300 font-medium">Accuracy: 100% (Hit)</span>
        </div>
        <div className="text-slate-400 text-[11px] font-mono">
          PTP TIMESTAMP: 1714289012.839210s
        </div>
      </div>
    </div>
  );
}
