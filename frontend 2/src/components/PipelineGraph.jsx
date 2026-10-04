import React, { useEffect, useRef } from 'react';

// ── Coordinate space: viewBox 0 0 1000 200, baseline centred at y=100 ──
const BASELINE = 100;
const TILE_W   = 1000;
const DOT_X    = 980;   // 20px inside the right edge so r=9 halo stays within the card

// 12 varied spike clusters across 1000 px  (rescaled from original 600-wide)
const EKG_VERTICES = [
  { x: 0,    y: 100 },

  // Cluster 1 – single sharp peak
  { x: 37,   y: 100 },
  { x: 53,   y: 20  },
  { x: 67,   y: 165 },
  { x: 80,   y: 100 },

  // Cluster 2 – micro-deflect upward
  { x: 103,  y: 100 },
  { x: 113,  y: 75  },
  { x: 123,  y: 100 },

  // Cluster 3 – double burst
  { x: 150,  y: 100 },
  { x: 167,  y: 15  },
  { x: 183,  y: 170 },
  { x: 200,  y: 50  },
  { x: 213,  y: 140 },
  { x: 227,  y: 100 },

  // Cluster 4 – tall single peak
  { x: 253,  y: 100 },
  { x: 270,  y: 10  },
  { x: 287,  y: 175 },
  { x: 300,  y: 100 },

  // Cluster 5 – micro-deflect downward
  { x: 327,  y: 100 },
  { x: 337,  y: 130 },
  { x: 347,  y: 100 },

  // Cluster 6 – double burst (asymmetric)
  { x: 370,  y: 100 },
  { x: 387,  y: 25  },
  { x: 403,  y: 160 },
  { x: 420,  y: 40  },
  { x: 433,  y: 145 },
  { x: 447,  y: 100 },

  // Cluster 7 – medium single peak
  { x: 470,  y: 100 },
  { x: 487,  y: 30  },
  { x: 500,  y: 158 },
  { x: 513,  y: 100 },

  // Cluster 8 – micro-deflect upward
  { x: 537,  y: 100 },
  { x: 547,  y: 70  },
  { x: 557,  y: 100 },

  // Cluster 9 – wide single peak
  { x: 580,  y: 100 },
  { x: 600,  y: 15  },
  { x: 623,  y: 170 },
  { x: 643,  y: 100 },

  // Cluster 10 – double burst (tight)
  { x: 667,  y: 100 },
  { x: 680,  y: 20  },
  { x: 693,  y: 165 },
  { x: 707,  y: 35  },
  { x: 717,  y: 150 },
  { x: 730,  y: 100 },

  // Cluster 11 – micro-deflect downward
  { x: 753,  y: 100 },
  { x: 763,  y: 135 },
  { x: 773,  y: 100 },

  // Cluster 12 – sharp closing peak
  { x: 797,  y: 100 },
  { x: 813,  y: 13  },
  { x: 830,  y: 173 },
  { x: 847,  y: 100 },

  // flat run to tile boundary
  { x: 1000, y: 100 },
];

// Build an SVG polyline path string from vertex array with an optional X offset
function buildPath(verts, xOffset = 0) {
  return verts
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x + xOffset} ${v.y}`)
    .join(' ');
}

// Two-tile continuous stream: tile at x=0 and tile at x=TILE_W
const TILE_0 = buildPath(EKG_VERTICES, 0);
const TILE_1 = buildPath(EKG_VERTICES, TILE_W).replace(/^M/, 'L');
const CONTINUOUS_STREAM_PATH = `${TILE_0} ${TILE_1}`;

// ── Piecewise-linear Y evaluator (mathematical fallback) ─────────────────────
// Returns the waveform Y at the screen's right edge given the current offset.
function getEkgY(offset) {
  const normU = ((offset % TILE_W) + TILE_W) % TILE_W;
  for (let i = 0; i < EKG_VERTICES.length - 1; i++) {
    const v1 = EKG_VERTICES[i];
    const v2 = EKG_VERTICES[i + 1];
    if (normU >= v1.x && normU <= v2.x) {
      if (v2.x === v1.x) return v1.y;
      const t = (normU - v1.x) / (v2.x - v1.x);
      return v1.y + t * (v2.y - v1.y);
    }
  }
  return BASELINE;
}

export default function PipelineGraph({ trialCount = 1, measuredLatency = 218.4 }) {
  const trackRef = useRef(null);
  const dotRef   = useRef(null);
  const pathRef  = useRef(null);

  useEffect(() => {
    let animId;
    // ~63 px/s keeps the same visual scroll speed as the old 600-wide tile at 38 px/s
    const speed = 63;

    const updateFrame = () => {
      const time   = performance.now() * 0.001;
      const offset = (time * speed) % TILE_W;

      // 1. Scroll waveform track leftward
      if (trackRef.current) {
        trackRef.current.style.transform = `translate3d(-${offset.toFixed(2)}px, 0, 0)`;
      }

      // 2. Derive dot Y directly from the piecewise-linear waveform math.
      //    This is evaluated at the exact same SVG X coordinate the dot sits at
      //    (DOT_X + offset in path-local coords), with zero smoothing or lag.
      if (dotRef.current) {
        // Primary: exact piecewise-linear evaluation — zero lag, no DOM dependency
        let tipY = getEkgY(DOT_X + offset);
        if (isNaN(tipY) || tipY == null) tipY = BASELINE;

        // Cross-check with DOM path when available (confirms math, catches rounding)
        if (pathRef.current) {
          try {
            const targetX  = DOT_X + offset;
            const totalLen = pathRef.current.getTotalLength();
            let lo = 0, hi = totalLen;
            for (let i = 0; i < 20; i++) {
              const mid = (lo + hi) * 0.5;
              const pt  = pathRef.current.getPointAtLength(mid);
              if (pt.x < targetX) lo = mid; else hi = mid;
            }
            const found = pathRef.current.getPointAtLength((lo + hi) * 0.5);
            if (!isNaN(found.y) && found.y != null) tipY = found.y;
          } catch (_) { /* keep math result */ }
        }

        // Direct style write — no CSS transition, no lerp, no easing
        dotRef.current.style.top = `${((tipY / 200) * 100).toFixed(2)}%`;
      }

      animId = requestAnimationFrame(updateFrame);
    };

    animId = requestAnimationFrame(updateFrame);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="bg-slate-900 rounded-[28px] sm:rounded-[32px] p-6 text-white font-mono text-xs border border-slate-800/90 relative shadow-2xl will-change-transform transform-gpu">
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

      {/* Graph Visual Area — overflow:visible so dot + halo are never clipped */}
      <div className="bg-slate-950/85 rounded-[24px] p-5 sm:p-6 border border-slate-800/80 shadow-inner relative overflow-hidden">
        {/* Ambient Grid overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="w-full h-full grid grid-rows-4 grid-cols-6 divide-y divide-x divide-slate-800">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} />
            ))}
          </div>
        </div>

        {/* SVG canvas — overflow:visible + clear viewBox */}
        <div className="h-32 sm:h-34 w-full flex items-center justify-center relative">
          <svg
            className="w-full h-full fill-none"
            style={{ overflow: 'visible' }}
            preserveAspectRatio="none"
            viewBox="0 0 1000 200"
          >
            {/* Static dotted baseline reference */}
            <line
              x1="0" y1={BASELINE}
              x2={TILE_W} y2={BASELINE}
              stroke="#64748b"
              strokeWidth="1.2"
              strokeDasharray="4 4"
              opacity="0.45"
              vectorEffect="non-scaling-stroke"
            />

            {/* Animated two-tile waveform track */}
            <g ref={trackRef} className="will-change-transform">
              <path
                ref={pathRef}
                d={CONTINUOUS_STREAM_PATH}
                stroke="#34d399"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="miter"
                strokeMiterlimit="10"
                fill="none"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          </svg>

          {/* Trailing dot — positioned at left: DOT_X/1000 so X aligns
              exactly with the SVG coordinate used for Y lookup.
              No CSS transition — moves frame-perfect with the waveform. */}
          <div
            ref={dotRef}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
            style={{ left: `${(DOT_X / 1000) * 100}%`, top: '50%' }}
          >
            <div className="relative flex items-center justify-center w-5 h-5">
              <div className="absolute inset-0 rounded-full bg-emerald-400/35 animate-ping" />
              <div className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-emerald-200 shadow-[0_0_8px_#34d399]" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Telemetry Metrics Strip */}
      <div className="mt-4 bg-slate-950/40 rounded-[22px] px-5 py-3 border border-slate-800/60 flex flex-wrap items-center justify-between text-slate-400 gap-3">
        <div className="flex items-center gap-2.5 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-emerald-400 font-semibold uppercase tracking-wider text-[11px]">
            TELEMETRY STREAM ACTIVE
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 text-[11px] font-mono">0.00% PACKET LOSS</span>
        </div>
        <div className="text-slate-400 text-[11px] font-mono">
          PTP TIMESTAMP: 1714289012.839210s
        </div>
      </div>
    </div>
  );
}
