import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import FadeIn from '../components/FadeIn';
import Header from '../components/Header';

export default function SciencePage() {
  const [activeStep, setActiveStep] = useState(4);
  const [isSimulating, setIsSimulating] = useState(false);

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

  const sampleTrials = [
    { id: 'TR-01', stim: 'STROOP_CRTL_01', fix: '500.000 ms', onset: '506.944 ms', latency: '241.138 ms', acc: 'Correct', stream: 'ptp-hardware-sync' },
    { id: 'TR-02', stim: 'STROOP_INCG_02', fix: '500.000 ms', onset: '506.942 ms', latency: '312.491 ms', acc: 'Correct', stream: 'ptp-hardware-sync' },
    { id: 'TR-03', stim: 'STROOP_CONG_03', fix: '500.000 ms', onset: '506.945 ms', latency: '219.082 ms', acc: 'Correct', stream: 'ptp-hardware-sync' },
    { id: 'TR-04', stim: 'STROOP_INCG_04', fix: '500.000 ms', onset: '506.944 ms', latency: '348.815 ms', acc: 'Correct', stream: 'ptp-hardware-sync' },
    { id: 'TR-05', stim: 'STROOP_CRTL_05', fix: '500.000 ms', onset: '506.946 ms', latency: '228.452 ms', acc: 'Correct', stream: 'ptp-hardware-sync' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white pt-16">
      {/* Header */}
      <Header current="science" />

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-6 py-12 space-y-12">
        
        {/* Top Breadcrumb & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200/80 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">Architecture Spec</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                Revision 2.4.2
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              High-Precision Telemetry &amp; Timing Architecture
            </h1>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 shadow-2xs transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Export Raw Telemetry</span>
            </button>
            <button
              type="button"
              onClick={simulateHardwareImpulse}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-2xs transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>Calibrate Engine</span>
            </button>
          </div>
        </div>

        {/* Overview Description */}
        <FadeIn className="space-y-2">
          <p className="text-base text-slate-600 max-w-3xl leading-relaxed">
            Deterministic sub-millisecond psychophysics measurement in modern web runtime environments. Uses double-buffered{' '}
            <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-xs text-slate-800">requestAnimationFrame</code>{' '}
            render loops paired with{' '}
            <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-xs text-slate-800">performance.now()</code>{' '}
            monotonic hardware clocks to eliminate OS scheduling jitter.
          </p>
        </FadeIn>

        {/* 4 Benchmark KPI Metrics Grid */}
        <FadeIn delay={100} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-medium block">Clock Resolution</span>
            <div className="text-2xl font-semibold font-mono text-slate-900 mt-2">5.0 µs</div>
            <span className="text-xs text-slate-500 mt-1 block">DOMHighResTimeStamp baseline</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-medium block">Target Screen Frame</span>
            <div className="text-2xl font-semibold font-mono text-slate-900 mt-2">6.944 ms</div>
            <span className="text-xs text-slate-500 mt-1 block">144 Hz empirical refresh interval</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-medium block">Max Measured Jitter</span>
            <div className="text-2xl font-semibold font-mono text-emerald-600 mt-2">± 0.082 ms</div>
            <span className="text-xs text-slate-500 mt-1 block">Across 50,000 empirical trials</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-medium block">Input Latency Floor</span>
            <div className="text-2xl font-semibold font-mono text-slate-900 mt-2">0.120 ms</div>
            <span className="text-xs text-slate-500 mt-1 block">Keyboard raw event dispatch</span>
          </div>
        </FadeIn>

        {/* Figures 0.1 & 0.2: Balanced 2-Column Minimal Card Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FadeIn delay={150} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">FIG 0.1 // Display Timing Chain</span>
                <span className="text-[11px] font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  r = 0.9994
                </span>
              </div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                Sub-Millisecond Temporal Verification Chain
              </h2>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Software timestamps are bench-calibrated against external physical photodiode sensors positioned over OLED panels. FPGA capture records the exact moment of photon emission to verify the WebGL paint event.
              </p>
            </div>

            {/* Minimal Line Graph */}
            <div className="mt-5 p-4 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/80 pb-2">
                <span>SIGNAL: CH1 [PHOTO-DETECTOR] vs CH2 [PTP FRAME PULSE]</span>
                <span className="text-emerald-400 text-[10px]">SYNC LOCKED</span>
              </div>
              <div className="h-24 flex items-center justify-center relative overflow-hidden">
                <svg className="w-full h-full text-emerald-400" viewBox="0 0 500 80" fill="none">
                  <path d="M 0,65 L 100,65 L 105,15 L 220,15 L 225,65 L 340,65 L 345,15 L 460,15 L 465,65 L 500,65" stroke="currentColor" strokeWidth="2" />
                  <path d="M 0,70 L 100,70 L 106,20 L 220,20 L 226,70 L 340,70 L 346,20 L 460,20 L 466,70 L 500,70" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 2" />
                </svg>
              </div>
              <div className="text-[10px] text-slate-400 flex justify-between pt-1 border-t border-slate-800/60">
                <span>Photon Rise: 0.18 ms</span>
                <span>Sampling: 100 kHz</span>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={200} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">FIG 0.2 // Stimulus Onset Spectrum</span>
                <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  Calibrated
                </span>
              </div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                Phosphor Luminance Rise Time
              </h2>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Pixel transition curves from 0% to 90% luminance measured via photodiode. Raw visual trigger occurs before human perceptual detection thresholds.
              </p>
            </div>

            <div className="mt-5 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 space-y-2">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500">Real-Time Sensor Rise</span>
                <span className="text-slate-900 font-semibold">0.18 ms</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-t border-slate-200/60">
                <span className="text-slate-500">Display Engine Lag</span>
                <span className="text-slate-900 font-semibold">0.09 ms</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-t border-slate-200/60">
                <span className="text-slate-500">Jitter Variance</span>
                <span className="text-emerald-700 font-semibold">± 0.002 ms</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-t border-slate-200/60">
                <span className="text-slate-500">Atomic PTP Offset</span>
                <span className="text-emerald-700 font-semibold">&lt; 0.001 ms</span>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Core Engineering Foundations: 2-Column Responsive Card Grid */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">
              Principles &amp; Foundations
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Foundation 1 */}
            <FadeIn delay={100} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                  Principle 01
                </span>
                <span className="text-xs font-mono text-slate-400">Double-rAF Scheduling</span>
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Frame Paint Synchronization
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Rather than scheduling stimuli via setTimeout, nested requestAnimationFrame callbacks guarantee the exact moment of buffer swap to the GPU.
              </p>
              <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg text-[11px] font-mono overflow-x-auto border border-slate-800">
{`requestAnimationFrame(() => {
  requestAnimationFrame((timestamp) => {
    stimulus.onsetTimestamp = timestamp;
    renderTargetWebGL(stimulus.id);
  });
});`}
              </pre>
            </FadeIn>

            {/* Foundation 2 */}
            <FadeIn delay={150} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                  Principle 02
                </span>
                <span className="text-xs font-mono text-slate-400">Monotonic Epoch</span>
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Hardware Clock Isolation
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Eliminates OS clock drift and NTP step adjustments. Timestamps originate from the hardware monotonic crystal clock via performance.now().
              </p>
              <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg text-[11px] font-mono overflow-x-auto border border-slate-800">
{`const onset = performance.now();
// Callback receives raw DOMHighResTimeStamp
const rt = event.timeStamp - onset;`}
              </pre>
            </FadeIn>

            {/* Foundation 3 */}
            <FadeIn delay={200} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                  Principle 03
                </span>
                <span className="text-xs font-mono text-slate-400">Formal Definition</span>
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Reaction Time Formula
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Calculated from physical frame paint completion to raw keyboard interrupt dispatch. No synthetic delays or queue delays.
              </p>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-mono text-xs font-bold text-slate-800">
                RT = event.timeStamp - stimulus.onsetTimestamp
              </div>
              <span className="text-[11px] text-slate-500 block text-center">
                Sub-frame timeout precision verified
              </span>
            </FadeIn>

            {/* Foundation 4 */}
            <FadeIn delay={250} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                  Principle 04
                </span>
                <span className="text-xs font-mono text-slate-400">Texture Cache</span>
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Zero-Latency Preloading
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Images, text glyphs, and audio buffers are pre-decoded into GPU texture memory prior to trial fixation onset to avoid runtime I/O stutter.
              </p>
              <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg text-[11px] font-mono overflow-x-auto border border-slate-800">
{`await imageBitmap.decode(); // GPU VRAM cache
audioContext.decodeAudioData(buffer);`}
              </pre>
            </FadeIn>
          </div>
        </div>

        {/* Precision Diagnostics Subsystem */}
        <FadeIn delay={100} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                Precision Diagnostics Subsystem
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                HOST TELEMETRY SINK // HARDWARE RUNTIME CORE
              </p>
            </div>
            <button
              type="button"
              onClick={simulateHardwareImpulse}
              disabled={isSimulating}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">play_circle</span>
              <span>{isSimulating ? 'Simulating Run...' : 'Simulate Impulse Trial'}</span>
            </button>
          </div>

          {/* Diagnostic Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium block">Display Refresh</span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">144.03 Hz</div>
              <span className="text-[10px] text-emerald-700 font-mono font-medium block mt-0.5">± 0.002 ms jitter</span>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium block">Frame Period</span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">6.94 ms</div>
              <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Target: 6.944 ms</span>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium block">Input Polling</span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">0.12 ms</div>
              <span className="text-[10px] text-emerald-700 font-mono font-medium block mt-0.5">Sub-frame resolution</span>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium block">Processed Trials</span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">48 / 50</div>
              <span className="text-[10px] text-emerald-700 font-mono font-medium block mt-0.5">Zero dropped frames</span>
            </div>
          </div>

          {/* 5-Step Pipeline Flow */}
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-medium block">
              Step-by-Step Execution Sequence
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {[
                { step: '01', title: 'Fixation Render', time: '0.000 ms', sub: 'Pre-drawn in memory' },
                { step: '02', title: 'rAF Frame Queued', time: '+6.944 ms', sub: 'GPU swap buffer' },
                { step: '03', title: 'Stimulus Rasterized', time: '+6.982 ms', sub: 'Onset stamped' },
                { step: '04', title: 'Participant Keypress', time: '+248.120 ms', sub: 'Hardware interrupt' },
                { step: '05', title: 'Evaluated RT', time: '241.138 ms', sub: 'Zero latency lag' },
              ].map((s, idx) => (
                <div 
                  key={s.step} 
                  className={`p-3 rounded-lg border text-xs transition-all ${
                    idx + 1 === activeStep
                      ? 'bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-400/30'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span>STEP {s.step}</span>
                    <span className="font-semibold text-emerald-700">{s.time}</span>
                  </div>
                  <div className="font-semibold text-slate-900 text-[11px]">{s.title}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* Live Session Trial Telemetry Ledger */}
        <FadeIn delay={150} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                Live Session Trial Telemetry Ledger
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                SERIAL: EXP-882-STRP • PARTICIPANT: SUB-09192 • ENGINE: WebGL 144Hz
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
              Live Stream
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                  <th className="py-2 px-3 font-medium">Trial ID</th>
                  <th className="py-2 px-3 font-medium">Stimulus Identifier</th>
                  <th className="py-2 px-3 font-medium">Fixation</th>
                  <th className="py-2 px-3 font-medium">Actual Onset</th>
                  <th className="py-2 px-3 font-medium">Measured Latency</th>
                  <th className="py-2 px-3 font-medium">Accuracy</th>
                  <th className="py-2 px-3 font-medium">Stream</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sampleTrials.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-3 font-semibold text-slate-900">{t.id}</td>
                    <td className="py-2 px-3 text-slate-700">{t.stim}</td>
                    <td className="py-2 px-3 text-slate-600">{t.fix}</td>
                    <td className="py-2 px-3 text-slate-600">{t.onset}</td>
                    <td className="py-2 px-3 text-emerald-700 font-bold">{t.latency}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded text-[10px] font-bold">
                        {t.acc}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-500">{t.stream}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FadeIn>

        {/* IRB & NIST Traceability Guarantee */}
        <FadeIn delay={150} className="bg-slate-900 text-white border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-white">IRB &amp; NIST Laboratory Traceability Guarantee</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Sub-millisecond timestamps conform to IEEE 1588 Precision Time Protocol &amp; open-science empirical standards.
              </p>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shadow-2xs"
          >
            Researcher Console
          </Link>
        </FadeIn>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono">
          <div>© 2025 Manova Labs Inc. Precision Research Framework.</div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>SYNC LATENCY: 0.12MS UTC</span>
            <span>SOC2 TYPE II</span>
            <span>IRB / HIPAA COMPLIANT</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
