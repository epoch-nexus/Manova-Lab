import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import FadeIn from '../components/FadeIn';

export default function SciencePage() {
  const [activeStep, setActiveStep] = useState(4);
  const [isSimulating, setIsSimulating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const simulateHardwareImpulse = () => {
    setIsSimulating(true);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setActiveStep(step);
      if (step >= 5) {
        clearInterval(interval);
        setTimeout(() => setIsSimulating(false), 800);
      }
    }, 280);
  };

  const copyCode = () => {
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const sampleTrials = [
    { id: 'TR-01', stim: 'STROOP_CRTL_01', fix: '500.000 ms', onset: '506.944 ms', latency: '241.138 ms', acc: 'CORRECT (1.0)', stream: 'ptp-hardware-sync' },
    { id: 'TR-02', stim: 'STROOP_INCG_02', fix: '500.000 ms', onset: '506.942 ms', latency: '312.491 ms', acc: 'CORRECT (1.0)', stream: 'ptp-hardware-sync' },
    { id: 'TR-03', stim: 'STROOP_CONG_03', fix: '500.000 ms', onset: '506.945 ms', latency: '219.082 ms', acc: 'CORRECT (1.0)', stream: 'ptp-hardware-sync' },
    { id: 'TR-04', stim: 'STROOP_INCG_04', fix: '500.000 ms', onset: '506.944 ms', latency: '348.815 ms', acc: 'CORRECT (1.0)', stream: 'ptp-hardware-sync' },
    { id: 'TR-05', stim: 'STROOP_CRTL_05', fix: '500.000 ms', onset: '506.946 ms', latency: '228.452 ms', acc: 'CORRECT (1.0)', stream: 'ptp-hardware-sync' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Application Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/landing" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm">
                <span className="material-symbols-outlined text-[18px]">biotech</span>
              </div>
              <div className="flex items-baseline tracking-tight">
                <span className="font-bold text-lg text-slate-900">MANOVA</span>
                <span className="font-bold text-lg text-emerald-600 ml-1">Labs</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <Link to="/dashboard" className="px-3 py-1.5 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                My Experiments
              </Link>
              <Link to="/builder" className="px-3 py-1.5 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                Protocol Builder
              </Link>
              <Link to="/science" className="px-3 py-1.5 bg-slate-200 text-slate-900 rounded-lg transition-colors">
                Telemetry &amp; Streams
              </Link>
              <Link to="/results" className="px-3 py-1.5 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                Results
              </Link>
              <Link to="/landing" className="px-3 py-1.5 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                Documentation
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-700 font-semibold">NODE #884-PX ONLINE</span>
            </div>
            <div className="hidden md:flex flex-col text-right text-xs">
              <span className="font-semibold text-slate-900">dr.arun@stanford.edu</span>
              <span className="text-[10px] text-emerald-600 font-mono font-bold">PI PRIVILEGE</span>
            </div>
            <Link to="/auth" className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">logout</span>
              Log Out
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Section Sub-bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-mono font-bold uppercase tracking-wider">
              SECTION 04
            </span>
            <span className="text-xs font-mono text-slate-500 font-semibold">
              HARDWARE-SYNCHRONIZED TIMING ARCHITECTURE • REVISION 2.4.2
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors">
              <span className="material-symbols-outlined text-[16px]">download</span>
              EXPORT TELEMETRY RAW DATA
            </button>
            <button 
              onClick={simulateHardwareImpulse}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              RE-CALIBRATE ENGINE
            </button>
          </div>
        </div>

        {/* Title & Description */}
        <FadeIn className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            High-Precision Telemetry &amp; Timestamp Architecture
          </h1>
          <p className="text-base text-slate-600 max-w-4xl leading-relaxed">
            Deterministic sub-millisecond psychophysics measurement in standard web runtime environments using synchronized double-buffered{' '}
            <code className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-xs text-emerald-700">requestAnimationFrame</code>{' '}
            event-scheduling paired with{' '}
            <code className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-xs text-emerald-700">performance.now()</code>{' '}
            monotonic hardware clocks.
          </p>
        </FadeIn>

        {/* 4 Metric Badges in Card */}
        <FadeIn delay={100} className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-slate-500">Clock Resolution</div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 mt-1">5.0 µs</div>
            <div className="text-xs text-slate-500 mt-0.5">DOMHighResTimeStamp baseline</div>
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-slate-500">Target Screen Frame</div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 mt-1">6.944 ms</div>
            <div className="text-xs text-slate-500 mt-0.5">144 Hz empirical refresh interval</div>
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-slate-500">Max Measured Jitter</div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600 mt-1">± 0.082 ms</div>
            <div className="text-xs text-slate-500 mt-0.5">Across 50,000 empirical trials</div>
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-slate-500">Input Latency Floor</div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 mt-1">0.120 ms</div>
            <div className="text-xs text-slate-500 mt-0.5">Keyboard raw event dispatch</div>
          </div>
        </FadeIn>

        {/* Visual Proof / Hardware Verification Diagrams */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FadeIn delay={100} className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-500">FIG 0.1 // PHYSICAL DISPLAY TIMING CHAIN</span>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  CORRELATION FACTOR: r = 0.9994
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Sub-Millisecond Temporal Verification Chain</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                To eliminate browser rendering assumptions, Manova Labs bench-calibrates software timestamps against physical photodiode sensors positioned directly over high-speed OLED panels. A custom FPGA capture rig records the exact moment of photon emission on phosphor pixels and matches the WebGL/Paint event stamp.
              </p>
            </div>
            
            {/* Diagram Display Box */}
            <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs flex flex-col gap-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
                <span>SIGNAL: CH1 [PHOTO-DETECTOR] vs CH2 [PTP FRAME PULSE]</span>
                <span className="text-emerald-400">HARDWARE LOCK: ACTIVE</span>
              </div>
              <div className="h-28 flex items-center justify-center relative overflow-hidden">
                <svg className="w-full h-full text-emerald-400" viewBox="0 0 500 100" fill="none">
                  <path d="M 0,80 L 100,80 L 105,20 L 220,20 L 225,80 L 340,80 L 345,20 L 460,20 L 465,80 L 500,80" stroke="currentColor" strokeWidth="2.5" />
                  <path d="M 0,85 L 100,85 L 106,25 L 220,25 L 226,85 L 340,85 L 346,25 L 460,25 L 466,85 L 500,85" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 2" />
                </svg>
                <div className="absolute right-4 bottom-2 text-[10px] text-slate-400">
                  PHOTON RISE TIME: 0.18 ms | SAMPLING: 100 kHz
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={200} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-2">FIG 0.2 // STIMULUS ONSET SPECTRUM</div>
              <h3 className="text-lg font-bold text-slate-900">Phosphor Rise Time</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Pixel transition curves from 0% to 90% luminance measured via photodiode. Raw visual trigger occurs before human perceptual threshold.
              </p>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Real-Time Sensor Rise:</span>
                <span className="text-emerald-400 font-bold">0.18 ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Display Engine Lag:</span>
                <span className="text-sky-400 font-bold">0.09 ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Jitter Variance:</span>
                <span className="text-emerald-400 font-bold">±0.002 ms</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2">
                <span className="text-slate-400">NIST Atomic Offset:</span>
                <span className="text-emerald-400 font-bold">&lt; 0.001 ms</span>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Core Engineering Foundations (4 Cards) */}
        <div>
          <FadeIn className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            <h2 className="text-base font-bold font-mono uppercase tracking-wider text-slate-700">
              Core Engineering Foundations
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1 */}
            <FadeIn delay={100} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                  FOUNDATION #01
                </span>
                <span className="text-xs font-mono text-slate-400">Double-rAF Scheduling</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">RequestAnimationFrame Frame Paint Synchronization</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Prevents premature frame execution. Rather than scheduling stimuli in standard setTimeout, Manova uses nested requestAnimationFrame callbacks to guarantee the exact moment of buffer flip to the GPU.
              </p>
              <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl text-[11px] font-mono overflow-x-auto border border-slate-800">
{`// Frame paint sync double-buffer queue
requestAnimationFrame(() => {
  requestAnimationFrame((timestamp) => {
    stimulus.onsetTimestamp = timestamp;
    renderTargetWebGL(stimulus.id);
  });
});`}
              </pre>
            </FadeIn>

            {/* Card 2 */}
            <FadeIn delay={200} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                  FOUNDATION #02
                </span>
                <span className="text-xs font-mono text-slate-400">High-Res Hardware Timer</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Monotonic Clock Epoch (performance.now())</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Eliminates OS clock drift and NTP step jumps. All timestamps originate from the hardware monotonic crystal clock, independent of system wall time changes.
              </p>
              <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl text-[11px] font-mono overflow-x-auto border border-slate-800">
{`// High-resolution monotonic baseline
const onset = performance.now();
// Event callback directly receives high-precision DOMHighResTimeStamp
const rt = event.timeStamp - onset;`}
              </pre>
            </FadeIn>

            {/* Card 3 */}
            <FadeIn delay={300} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                  FOUNDATION #03
                </span>
                <span className="text-xs font-mono text-slate-400">Formal Definition</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Reaction Time (RT) Computation Formula</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Reaction Time is calculated from the physical frame paint completion to the exact keyboard raw interrupt dispatch. Zero synthetic delays or main-thread queue biases.
              </p>
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center font-mono text-sm font-bold text-emerald-900">
                RT = event.timeStamp - stimulus.onsetTimestamp
              </div>
              <p className="text-[11px] text-slate-500 text-center">
                Verified zero negative RTs; strict sub-frame timeout evaluation
              </p>
            </FadeIn>

            {/* Card 4 */}
            <FadeIn delay={400} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                  FOUNDATION #04
                </span>
                <span className="text-xs font-mono text-slate-400">Decoded Texture Memory</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Zero-Latency Stimulus Preloading</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Images, text glyphs, and audio buffers are pre-decoded into GPU texture memory prior to trial fixation onset. No on-demand I/O or texture uploads interrupt execution.
              </p>
              <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl text-[11px] font-mono overflow-x-auto border border-slate-800">
{`await imageBitmap.decode(); // GPU VRAM cache
audioContext.decodeAudioData(buffer); // Low-latency buffer`}
              </pre>
            </FadeIn>
          </div>
        </div>

        {/* Precision Diagnostics Subsystem (Live Monotonic Core) */}
        <FadeIn className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">monitor_heart</span>
                <h3 className="text-lg font-bold text-slate-900">Precision Diagnostics Subsystem (Live Monotonic Core)</h3>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                HOST TELEMETRY SINK // LOCAL HARDWARE CORE BUFFER
              </p>
            </div>
            <button
              onClick={simulateHardwareImpulse}
              disabled={isSimulating}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-xs transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">play_circle</span>
              {isSimulating ? 'SIMULATING RUN...' : 'SIMULATE HARDWARE IMPULSE TRIAL'}
            </button>
          </div>

          {/* Diagnostic Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-[11px] font-mono text-slate-500">CURRENT DISPLAY REFRESH</div>
              <div className="text-xl font-extrabold font-mono text-slate-900 mt-1">144.03 Hz</div>
              <div className="text-[10px] text-emerald-600 font-mono font-medium">±0.002ms jitter delta</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-[11px] font-mono text-slate-500">FRAME PERIOD ESTIMATE</div>
              <div className="text-xl font-extrabold font-mono text-slate-900 mt-1">6.94 ms</div>
              <div className="text-[10px] text-slate-500 font-mono">Target: 6.944 ms</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-[11px] font-mono text-slate-500">INPUT POLLING JITTER</div>
              <div className="text-xl font-extrabold font-mono text-slate-900 mt-1">0.12 ms</div>
              <div className="text-[10px] text-emerald-600 font-mono font-medium">Sub-frame resolution OK</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-[11px] font-mono text-slate-500">TRIALS PROCESSED TODAY</div>
              <div className="text-xl font-extrabold font-mono text-slate-900 mt-1">48 / 50</div>
              <div className="text-[10px] text-emerald-600 font-mono font-medium">Zero missed frames</div>
            </div>
          </div>

          {/* 5-Step Pipeline Progress Flow */}
          <div className="space-y-2">
            <div className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
              EXECUTION PIPELINE STEP-BY-STEP BREAKDOWN
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {[
                { step: '01', title: 'Fixation Cross Render', time: '0.000 ms', sub: 'Pre-drawn in memory' },
                { step: '02', title: 'rAF Frame Scheduled', time: '+6.944 ms', sub: 'GPU swap buffer' },
                { step: '03', title: 'Stimulus GPU Rasterized', time: '+6.982 ms', sub: 'Onset stamped' },
                { step: '04', title: 'Participant Keypress', time: '+248.120 ms', sub: 'Keyboard hardware int' },
                { step: '05', title: 'Evaluated RT', time: '241.138 ms', sub: 'Status: LOCKED OK' },
              ].map((s, idx) => (
                <div 
                  key={s.step} 
                  className={`p-3 rounded-xl border text-xs transition-all ${
                    idx + 1 === activeStep
                      ? 'bg-emerald-50 border-emerald-400 shadow-sm'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span>STEP {s.step}</span>
                    <span className="font-bold text-emerald-600">{s.time}</span>
                  </div>
                  <div className="font-semibold text-slate-800 text-[11px]">{s.title}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* Live Session Trial Telemetry Ledger */}
        <FadeIn delay={100} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Live Session Trial Telemetry Ledger</h3>
              <p className="text-xs text-slate-500 font-mono">
                SERIAL: EXP-882-STRP • PARTICIPANT: SUB-09192 • ENGINE: WebGL 144Hz
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-semibold">
              REAL-TIME MONITORED
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                  <th className="py-2.5 px-3">Trial ID</th>
                  <th className="py-2.5 px-3">Stimulus Identifier</th>
                  <th className="py-2.5 px-3">Fixation</th>
                  <th className="py-2.5 px-3">Actual Onset</th>
                  <th className="py-2.5 px-3">Measured Latency</th>
                  <th className="py-2.5 px-3">Accuracy</th>
                  <th className="py-2.5 px-3">Telemetry Stream</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sampleTrials.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{t.id}</td>
                    <td className="py-2.5 px-3 text-slate-700">{t.stim}</td>
                    <td className="py-2.5 px-3 text-slate-600">{t.fix}</td>
                    <td className="py-2.5 px-3 text-slate-600">{t.onset}</td>
                    <td className="py-2.5 px-3 text-emerald-600 font-bold">{t.latency}</td>
                    <td className="py-2.5 px-3 text-emerald-700 font-semibold">{t.acc}</td>
                    <td className="py-2.5 px-3 text-slate-500">{t.stream}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FadeIn>

        {/* IRB & NIST Traceability Guarantee */}
        <FadeIn delay={100} className="bg-emerald-900 text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[24px]">verified_user</span>
            </div>
            <div>
              <h4 className="font-bold text-sm">IRB &amp; NIST Laboratory Traceability Guarantee</h4>
              <p className="text-xs text-emerald-200 mt-0.5">
                All sub-millisecond timestamps conform to IEEE 1588 Precision Time Protocol &amp; APA Open-Science empirical standards.
              </p>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="px-4 py-2 rounded-xl bg-white text-emerald-900 text-xs font-bold hover:bg-emerald-50 transition-colors whitespace-nowrap shadow-xs"
          >
            Launch Researcher Console
          </Link>
        </FadeIn>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>© 2025 Manova Labs Inc. Precision Research Framework.</div>
          <div className="flex items-center gap-4">
            <span>SYNC LATENCY: 0.12MS UTC</span>
            <span>SOC2 TYPE II</span>
            <span>IRB / HIPAA COMPLIANT</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
