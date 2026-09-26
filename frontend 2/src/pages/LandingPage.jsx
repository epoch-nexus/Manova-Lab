import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const STROOP_TRIALS = [
  { text: 'GREEN', colorName: 'Red', fontColorClass: 'text-rose-500', targetKey: 'RED' },
  { text: 'BLUE', colorName: 'Green', fontColorClass: 'text-emerald-500', targetKey: 'GREEN' },
  { text: 'RED', colorName: 'Blue', fontColorClass: 'text-sky-500', targetKey: 'BLUE' },
  { text: 'YELLOW', colorName: 'Red', fontColorClass: 'text-rose-500', targetKey: 'RED' },
  { text: 'RED', colorName: 'Green', fontColorClass: 'text-emerald-500', targetKey: 'GREEN' },
];

export default function LandingPage() {
  // Live Stroop sandbox state
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialCount, setTrialCount] = useState(1);
  const [measuredLatency, setMeasuredLatency] = useState(218.4);
  const [lastAccuracy, setLastAccuracy] = useState('Hit (Correct)');
  const [isHit, setIsHit] = useState(true);
  const startTimeRef = useRef(performance.now());

  useEffect(() => {
    startTimeRef.current = performance.now();
  }, [trialIndex]);

  const handleColorChoice = (chosenColor) => {
    const elapsed = Math.round((performance.now() - startTimeRef.current) * 100) / 100;
    const currentTrial = STROOP_TRIALS[trialIndex % STROOP_TRIALS.length];
    const correct = chosenColor === currentTrial.targetKey;

    setMeasuredLatency(elapsed > 0 ? elapsed : 210.5);
    setIsHit(correct);
    setLastAccuracy(correct ? 'Hit (Correct)' : 'False Alarm (Incongruent Error)');
    setTrialCount(prev => prev + 1);
    setTrialIndex(prev => prev + 1);
  };

  const currentStimulus = STROOP_TRIALS[trialIndex % STROOP_TRIALS.length];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Navigation Header */}
      <header className="w-full bg-white/85 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50 transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-900">
                Manova <span className="text-emerald-600">Labs</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
              <a className="hover:text-emerald-600 transition-colors whitespace-nowrap" href="#product">Product</a>
              <a className="hover:text-emerald-600 transition-colors whitespace-nowrap" href="#features">Features</a>
              <a className="hover:text-emerald-600 transition-colors whitespace-nowrap" href="#how-it-works">How It Works</a>
              <Link to="/science" className="hover:text-emerald-600 transition-colors whitespace-nowrap flex items-center gap-1">
                <span>Architecture</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">Spec</span>
              </Link>
              <a className="hover:text-emerald-600 transition-colors whitespace-nowrap" href="#analytics">Analytics</a>
              <a className="hover:text-emerald-600 transition-colors whitespace-nowrap" href="#demo">Demo</a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/auth" className="hidden sm:inline-flex text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg transition-colors">
              Login
            </Link>
            <Link to="/dashboard" className="hidden sm:inline-flex text-sm font-medium text-slate-700 hover:text-emerald-600 border border-slate-200 bg-white hover:border-emerald-200 px-3.5 py-1.5 rounded-lg transition-colors shadow-2xs">
              Dashboard
            </Link>
            <Link to="/builder" className="text-sm font-semibold px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm hover:shadow-emerald-200 flex items-center gap-1.5 whitespace-nowrap">
              <span>Create Experiment</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow relative overflow-hidden">
        {/* Glow ambient background elements */}
        <div className="absolute inset-0 pointer-events-none select-none -z-10 overflow-hidden">
          <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[1300px] h-[680px] cloud-gradient rounded-full blur-3xl opacity-90"></div>
          <div className="absolute top-[28rem] right-[-12rem] w-[600px] h-[600px] bg-emerald-100/40 rounded-full blur-[120px]"></div>
          <div className="absolute top-[80rem] left-[-10rem] w-[700px] h-[700px] bg-emerald-200/25 rounded-full blur-[140px]"></div>
        </div>

        <section className="pt-16 pb-16 sm:pt-24 sm:pb-20 text-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-6 shadow-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Computational Cognitive Telemetry Engine 3.0
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.12] font-heading">
              Sub-millisecond accuracy.<br/>
              <span className="text-emerald-600">Zero lines of code.</span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
              High-throughput neural intelligence and real-time streaming pipelines for behavioral, cognitive, and sensory research without infrastructure overhead.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link to="/builder" className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md hover:shadow-lg hover:shadow-emerald-600/20 transition-all text-base">
                <span>Create Experiment</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </Link>
              <a href="#demo" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold border border-slate-200 shadow-xs transition-all text-base hover:border-slate-300">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>Try Interactive Demo</span>
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
                <span>Accurate Telemetry</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
                <span>IRB &amp; HIPAA Compliant</span>
              </div>
            </div>

            {/* Hero Live Telemetry Terminal Card */}
            <div className="mt-14 max-w-5xl mx-auto rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-xl shadow-2xl p-4 sm:p-6 text-left relative overflow-hidden" id="product">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <span className="inline-block w-3 h-3 rounded-full bg-rose-400"></span>
                  <span className="inline-block w-3 h-3 rounded-full bg-amber-400"></span>
                  <span className="inline-block w-3 h-3 rounded-full bg-emerald-400"></span>
                  <span className="ml-2 font-mono text-xs text-slate-500 font-medium">pipeline://neuro-stream.manova.internal:443 • LIVE</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                    PTP CLOCK SYNCED 0.18ms
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4 mb-5">
                <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider font-mono">Active Paradigm</p>
                  <p className="text-base font-bold text-slate-900 mt-1 font-heading">Rapid Visual ERP</p>
                  <span className="text-xs text-emerald-700 font-mono">1,200 trials queued</span>
                </div>
                <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider font-mono">Median Latency</p>
                  <p className="text-base font-bold text-emerald-700 mt-1 font-mono">0.24ms ±0.03</p>
                  <span className="text-xs text-slate-500">Hardware clock lock</span>
                </div>
                <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider font-mono">Ingest Rate</p>
                  <p className="text-base font-bold text-slate-900 mt-1 font-mono">14,800 events/s</p>
                  <span className="text-xs text-emerald-700 font-mono">0 packet drops</span>
                </div>
                <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider font-mono">Synchronized Nodes</p>
                  <p className="text-base font-bold text-slate-900 mt-1 font-heading">EEG + Eye + Keys</p>
                  <span className="text-xs text-emerald-700">3 Modal Ingestors</span>
                </div>
              </div>

              <div className="bg-slate-900 rounded-xl p-4 text-white font-mono text-xs border border-slate-800 relative">
                <div className="flex items-center justify-between mb-3 text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-semibold">CHANNEL 01 [FRONTAL_N200]</span>
                    <span>1000 Hz</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-sky-400">CHANNEL 02 [GAZE_X_COORD]</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-slate-300">RAW TELEMETRY BUS</span>
                  </div>
                </div>

                <div className="h-28 w-full flex items-end justify-between gap-1 overflow-hidden pt-4 pb-2 border-b border-slate-800">
                  <div className="w-full h-full flex items-center justify-between">
                    <svg className="w-full h-24 stroke-emerald-400 fill-none" preserveAspectRatio="none" viewBox="0 0 600 80">
                      <path d="M0,40 L30,40 L45,15 L60,65 L75,35 L90,40 L160,40 L180,10 L200,70 L215,25 L230,40 L330,40 L350,5 L370,75 L385,30 L400,40 L490,40 L510,18 L530,62 L545,38 L600,40" strokeWidth="2"></path>
                      <path d="M0,45 L40,45 L80,50 L120,40 L160,48 L200,38 L240,46 L280,43 L320,49 L360,37 L400,45 L440,43 L480,48 L520,39 L560,45 L600,45" opacity="0.35" stroke="#38bdf8" strokeDasharray="3 3" strokeWidth="1.5"></path>
                    </svg>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-slate-400">
                  <div className="flex items-center gap-4">
                    <span className="text-emerald-400">▲ STIMULUS ONSET #{410 + trialCount}</span>
                    <span>Response: <strong className="text-white">{measuredLatency}ms</strong></span>
                    <span className="text-emerald-300">Accuracy: 100% (Hit)</span>
                  </div>
                  <div className="text-slate-500">PTP TIMESTAMP: 1714289012.839210s</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6 Platform Capabilities Cards */}
        <section className="py-20 bg-white border-y border-slate-200/80 px-4 sm:px-6 lg:px-8" id="features">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/80 font-mono">
                Platform Capabilities
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3 tracking-tight font-heading">
                Precision Infrastructure for Modern Cognitive Science
              </h2>
              <p className="text-slate-600 mt-4 text-base sm:text-lg">
                Deploy complex behavioral assays, multi-modal sensor telemetry, and low-latency feedback loops in a secure, compliant cloud runtime.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Card 1 */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-7 hover:border-emerald-300 hover:shadow-card transition-all group">
                <div className="w-12 h-12 rounded-xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center mb-5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 font-heading">Sub-millisecond Synchronization</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Hardware-disciplined PTP clocks align stimulus presentation, millisecond keystrokes, eye-tracking saccades, and auxiliary EEG streams effortlessly.
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-7 hover:border-emerald-300 hover:shadow-card transition-all group">
                <div className="w-12 h-12 rounded-xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center mb-5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z"></path>
                    <path d="M10 10l4 4m0-4l-4 4"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 font-heading">Zero-Code Experiment Builder</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Visually assemble complex psychometric blocks, randomized block designs, adaptive staircases, and rapid sensory stimulus without writing boilerplate code.
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-7 hover:border-emerald-300 hover:shadow-card transition-all group">
                <div className="w-12 h-12 rounded-xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center mb-5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    <line x1="19" x2="19" y1="5" y2="19"></line>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 font-heading">Deterministic Replay &amp; Lossless Streams</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Every session event is cryptographically indexed and immutable. Replay any participant session tick-by-tick with microsecond fidelity.
                </p>
              </div>

              {/* Card 4 */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-7 hover:border-emerald-300 hover:shadow-card transition-all group">
                <div className="w-12 h-12 rounded-xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center mb-5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" x2="15.42" y1="13.51" y2="17.49"></line>
                    <line x1="15.41" x2="8.59" y1="6.51" y2="10.49"></line>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 font-heading">Dynamic Participant Routing</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Automate cohort counter-balancing, pre-screening criteria, and instant web dispatch without third-party redirects or lost tokens.
                </p>
              </div>

              {/* Card 5 */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-7 hover:border-emerald-300 hover:shadow-card transition-all group">
                <div className="w-12 h-12 rounded-xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center mb-5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect height="16" rx="2" width="16" x="4" y="4"></rect>
                    <rect height="4" width="4" x="9" y="9"></rect>
                    <line x1="9" x2="9" y1="1" y2="4"></line>
                    <line x1="15" x2="15" y1="1" y2="4"></line>
                    <line x1="9" x2="9" y1="20" y2="23"></line>
                    <line x1="15" x2="15" y1="20" y2="23"></line>
                    <line x1="20" x2="23" y1="9" y2="9"></line>
                    <line x1="20" x2="23" y1="14" y2="14"></line>
                    <line x1="1" x2="4" y1="9" y2="9"></line>
                    <line x1="1" x2="4" y1="14" y2="14"></line>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 font-heading">Edge Telemetry Nodes</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Deploy sensors to dedicated edge hardware nodes or execute cross-platform WebAssembly runtimes within the participant's browser without software installation.
                </p>
              </div>

              {/* Card 6 */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-7 hover:border-emerald-300 hover:shadow-card transition-all group">
                <div className="w-12 h-12 rounded-xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center mb-5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 font-heading">IRB-Grade Audit &amp; Compliance</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  End-to-end data encryption, anonymization pipelines, audit trail generation, and one-click export formatted for institutional institutional review boards.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4-Step Workflow Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50" id="how-it-works">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-mono">
                Streamlined Pipeline
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3 tracking-tight font-heading">
                From Paradigm Design to Raw Telemetry in Minutes
              </h2>
              <p className="text-slate-600 mt-4 text-base sm:text-lg">
                No custom C++ drivers, no complex WebSockets scaling. A pure zero-code workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Step 1 */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative group hover:border-emerald-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-emerald-500 text-white font-mono text-sm font-bold flex items-center justify-center mb-4">
                    01
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 font-heading">Design Experiment</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Pick a pre-configured paradigm (Stroop, N-Back, Flanker) or configure millisecond visual stimuli and logic in our visual builder.
                  </p>
                </div>
                <Link to="/builder" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                  <span>Visual Builder Docs</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"></path></svg>
                </Link>
              </div>

              {/* Step 2 */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative group hover:border-emerald-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-slate-900 text-white font-mono text-sm font-bold flex items-center justify-center mb-4">
                    02
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 font-heading">Deploy &amp; Invite</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Generate one-click participant links or integrate directly into Prolific and MTurk with automated quota handling.
                  </p>
                </div>
                <Link to="/dashboard" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                  <span>Deployment Guides</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"></path></svg>
                </Link>
              </div>

              {/* Step 3 */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative group hover:border-emerald-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-slate-900 text-white font-mono text-sm font-bold flex items-center justify-center mb-4">
                    03
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 font-heading">Stream &amp; Monitor</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Session events are streamed live with hardware clock PTP timestamps. Inspect loss rates and frame stability instantly.
                  </p>
                </div>
                <Link to="/science" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                  <span>Telemetry Streams</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"></path></svg>
                </Link>
              </div>

              {/* Step 4 */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative group hover:border-emerald-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-slate-900 text-white font-mono text-sm font-bold flex items-center justify-center mb-4">
                    04
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 font-heading">Analyze &amp; Export</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Export raw data into Parquet, CSV, or BIDS formats. Run instant ANOVA, RT distribution fits, or drift-diffusion models.
                  </p>
                </div>
                <Link to="/results" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                  <span>Analytics &amp; Modeling</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"></path></svg>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Engineered for Both Sides of the Glass */}
        <section className="py-20 bg-white border-y border-slate-200/80 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-mono">
                System Architecture
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3 tracking-tight font-heading">
                Engineered for Both Sides of the Glass
              </h2>
              <p className="text-slate-600 mt-4 text-base sm:text-lg">
                Powerful institutional controls for researchers, lightweight zero-friction interfaces for participants.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Researcher Suite */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px]">science</span>
                    </div>
                    <span className="font-mono text-xs uppercase text-slate-500 font-semibold">FOR RESEARCH LABS</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3 font-heading">Researcher Protocol Suite</h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6">
                    Full orchestration platform for creating, managing, and analyzing large-scale cognitive paradigms with zero infrastructure overhead.
                  </p>
                  <ul className="space-y-2.5 text-xs text-slate-700 font-medium mb-8">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Zero-code visual protocol &amp; condition builder</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Real-time telemetry stream inspection and latency audit</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Comprehensive CSV, JSON, and Parquet data exports</span>
                    </li>
                  </ul>
                </div>
                <Link to="/dashboard" className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl text-center transition-colors">
                  Launch Researcher Console →
                </Link>
              </div>

              {/* Participant Portal */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px]">play_circle</span>
                    </div>
                    <span className="font-mono text-xs uppercase text-slate-500 font-semibold">FOR PARTICIPANTS</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3 font-heading">Participant Session Portal</h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6">
                    Distraction-free, browser-native runner engineered to capture millisecond reaction times without requiring plugins or downloads.
                  </p>
                  <ul className="space-y-2.5 text-xs text-slate-700 font-medium mb-8">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Instant zero-setup execution on any modern web browser</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Hardware-disciplined timestamping for sub-millisecond precision</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Anonymous, secure token routing preserving complete privacy</span>
                    </li>
                  </ul>
                </div>
                <Link to="/runner" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl text-center shadow-md hover:shadow-emerald-600/20 transition-all">
                  Join as Participant →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Real-Time Institutional Analytics with Gaussian Stroop Curve */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50" id="analytics">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-mono">
                Live Telemetry
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3 tracking-tight font-heading">
                Institutional-Grade Analysis in Real Time
              </h2>
              <p className="text-slate-600 mt-4 text-base sm:text-lg">
                Eliminate hours of manual data cleaning. Export directly to scientific standard formats.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                <div>
                  <span className="font-mono text-xs uppercase text-slate-500 font-semibold">EXP-882 • COLOR-WORD STROOP</span>
                  <h3 className="text-xl font-bold text-slate-900 font-heading">Stroop Interference &amp; Executive Inhibition Matrix</h3>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-semibold">N = 840</span>
                  <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> STREAM ACTIVE
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-b border-slate-100 text-center sm:text-left">
                <div>
                  <span className="font-mono text-xs text-slate-500 uppercase">MEAN CONGRUENT RT</span>
                  <p className="text-2xl font-extrabold font-mono text-slate-900 mt-1">342.1 ms</p>
                  <span className="text-[11px] text-emerald-700 font-mono">σ = 28.4 ms</span>
                </div>
                <div>
                  <span className="font-mono text-xs text-slate-500 uppercase">MEAN INCONGRUENT RT</span>
                  <p className="text-2xl font-extrabold font-mono text-slate-900 mt-1">429.6 ms</p>
                  <span className="text-[11px] text-amber-700 font-mono">Effect Size: d = 0.84</span>
                </div>
                <div>
                  <span className="font-mono text-xs text-slate-500 uppercase">STROOP EFFECT</span>
                  <p className="text-2xl font-extrabold font-mono text-emerald-600 mt-1">+87.5 ms</p>
                  <span className="text-[11px] text-slate-500 font-mono">p &lt; 0.001 (Significant)</span>
                </div>
                <div>
                  <span className="font-mono text-xs text-slate-500 uppercase">TELEMETRY JITTER</span>
                  <p className="text-2xl font-extrabold font-mono text-slate-900 mt-1">0.11 ms</p>
                  <span className="text-[11px] text-emerald-700 font-mono">Hardware Calibrated</span>
                </div>
              </div>

              {/* Gaussian curves visualization */}
              <div className="pt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                <div className="lg:col-span-2 bg-slate-950 rounded-xl p-5 border border-slate-800 relative">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-3">
                    <span>REACTION TIME DISTRIBUTION (GAUSSIAN FIT)</span>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-1 bg-sky-400 rounded"></span> Congruent</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-1 bg-emerald-400 rounded"></span> Incongruent</span>
                    </div>
                  </div>

                  <div className="h-44 w-full">
                    <svg className="w-full h-full" viewBox="0 0 500 160" preserveAspectRatio="none">
                      {/* Grid lines */}
                      <line x1="50" y1="130" x2="450" y2="130" stroke="#334155" strokeWidth="1"></line>
                      <line x1="150" y1="20" x2="150" y2="130" stroke="#1e293b" strokeDasharray="3 3"></line>
                      <line x1="280" y1="20" x2="280" y2="130" stroke="#1e293b" strokeDasharray="3 3"></line>
                      
                      {/* Congruent Bell Curve (Sky) */}
                      <path
                        d="M 50,130 C 100,130 130,25 170,25 C 210,25 240,130 300,130"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2.5"
                      />
                      {/* Incongruent Bell Curve (Emerald) */}
                      <path
                        d="M 160,130 C 210,130 240,40 280,40 C 320,40 360,130 420,130"
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="2.5"
                      />
                    </svg>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-500 mt-1">
                    <span>200ms</span>
                    <span>300ms</span>
                    <span>400ms</span>
                    <span>500ms</span>
                    <span>600ms</span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-xs font-mono flex flex-col justify-between h-full">
                  <div>
                    <span className="text-slate-500 uppercase tracking-wider font-semibold block mb-3">Live Ingestion Telemetry</span>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total Valid Trials:</span>
                        <span className="font-bold text-slate-900">40,320</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Discarded Jitter:</span>
                        <span className="font-bold text-emerald-600">0.02%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">PTP Drift:</span>
                        <span className="font-bold text-slate-900">±0.04 ms</span>
                      </div>
                    </div>
                  </div>
                  <Link to="/results" className="w-full py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-center font-bold text-xs transition-colors">
                    View Full Analysis Suite →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Live Client-Side Sandbox: Interactive Stroop Reaction Time Tester */}
        <section className="py-20 bg-slate-900 text-white px-4 sm:px-6 lg:px-8 relative overflow-hidden" id="demo">
          <div className="absolute -top-32 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-3 py-1 rounded-full">
              LIVE CLIENT-SIDE SANDBOX
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-4 font-heading tracking-tight">
              Test the Latency Engine Live
            </h2>
            <p className="text-slate-300 mt-3 text-base sm:text-lg max-w-xl mx-auto">
              Simulated Stroop Decision Trial. Click the matching color of the font (not the text).
            </p>

            <div className="mt-10 bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl text-left max-w-2xl mx-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-8">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="font-mono text-xs text-slate-400 font-semibold">
                    TRIAL #{String(trialCount).padStart(2, '0')} ACTIVE • HIGH-RESOLUTION TIMER
                  </span>
                </div>
                <span className="font-mono text-xs text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  SAMPLING: 1000 Hz
                </span>
              </div>

              {/* Target Stimulus Display */}
              <div className="text-center py-8 bg-slate-900/60 rounded-xl border border-slate-800 mb-8 select-none">
                <span className="text-xs uppercase font-mono text-slate-500 tracking-widest block mb-2">TARGET STIMULUS</span>
                <span className={`text-5xl font-extrabold font-heading tracking-wider ${currentStimulus.fontColorClass}`}>
                  {currentStimulus.text}
                </span>
                <p className="text-xs text-slate-400 mt-3 font-mono">
                  Prompt: Select the font color ({currentStimulus.colorName})
                </p>
              </div>

              {/* Choice Action Buttons */}
              <div className="grid grid-cols-3 gap-3 font-mono text-sm">
                <button
                  type="button"
                  onClick={() => handleColorChoice('BLUE')}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold border border-slate-700 active:scale-95 transition-all text-center"
                >
                  BLUE
                </button>
                <button
                  type="button"
                  onClick={() => handleColorChoice('RED')}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold border border-slate-700 active:scale-95 transition-all text-center"
                >
                  RED
                </button>
                <button
                  type="button"
                  onClick={() => handleColorChoice('GREEN')}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold border border-slate-700 active:scale-95 transition-all text-center"
                >
                  GREEN
                </button>
              </div>

              {/* Feedback Latency Readout */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                <div>
                  Measured Reaction Time: <span className="text-emerald-400 font-bold">{measuredLatency} ms</span>
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${isHit ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}`}>
                    {lastAccuracy}
                  </span>
                </div>
                <div>Browser Precision: <span className="text-slate-300">DOMHighResTimeStamp</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* Ready to Accelerate CTA */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white relative">
          <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-b from-emerald-50/70 to-slate-50 border border-emerald-200/80 p-8 sm:p-14 text-center shadow-card relative overflow-hidden">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-300/25 rounded-full blur-3xl pointer-events-none"></div>
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight font-heading">
                Ready to accelerate your cognitive research?
              </h2>
              <p className="mt-4 text-base sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Join leading neuroscientists, behavioral labs, and research institutions running synchronized experiments at scale.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link to="/builder" className="inline-flex items-center gap-2 px-7 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base shadow-md hover:shadow-lg hover:shadow-emerald-600/20 transition-all">
                  <span>Create Experiment</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
                </Link>
                <Link to="/science" className="inline-flex items-center gap-2 px-7 py-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-base border border-slate-300 shadow-xs transition-all">
                  Inspect Architecture
                </Link>
              </div>
              <p className="mt-4 text-xs text-slate-500 font-medium font-mono">
                Instant deployment • No credit card required • Institutional volume licenses available
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white pt-16 pb-12 text-slate-600 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-slate-100">
            <div className="col-span-2">
              <Link to="/" className="flex items-center gap-2.5 group mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                </div>
                <span className="font-bold text-lg tracking-tight text-slate-900">
                  Manova <span className="text-emerald-600">Labs</span>
                </span>
              </Link>
              <p className="text-slate-500 text-sm max-w-sm mb-5 leading-relaxed">
                High-throughput cognitive telemetry, synchronized sensory paradigms, and zero-code experiment orchestration for research institutions worldwide.
              </p>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-mono font-medium border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                All Systems Operational • Sub-ms Engine Synced
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 font-heading">Product</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><Link to="/builder" className="hover:text-emerald-600 transition-colors">Experiment Builder</Link></li>
                <li><Link to="/science" className="hover:text-emerald-600 transition-colors">PTP Synchronizer</Link></li>
                <li><Link to="/runner" className="hover:text-emerald-600 transition-colors">Deterministic Replay</Link></li>
                <li><Link to="/dashboard" className="hover:text-emerald-600 transition-colors">Edge Nodes</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 font-heading">Solutions</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><Link to="/science" className="hover:text-emerald-600 transition-colors">EEG &amp; ERP Research</Link></li>
                <li><Link to="/science" className="hover:text-emerald-600 transition-colors">Eye Tracking &amp; Gaze</Link></li>
                <li><Link to="/dashboard" className="hover:text-emerald-600 transition-colors">Cognitive Psychology</Link></li>
                <li><Link to="/results" className="hover:text-emerald-600 transition-colors">BIDS Pipeline Exporter</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 font-heading">Institutional</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><Link to="/science" className="hover:text-emerald-600 transition-colors">IRB Documentation</Link></li>
                <li><Link to="/science" className="hover:text-emerald-600 transition-colors">HIPAA Compliance</Link></li>
                <li><Link to="/auth" className="hover:text-emerald-600 transition-colors">Security Console</Link></li>
                <li><Link to="/auth" className="hover:text-emerald-600 transition-colors">Researcher Portal</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
            <div>
              © 2025 Manova Labs, Inc. Computational Telemetry &amp; Precision Biosystems. All rights reserved.
            </div>
            <div className="flex items-center gap-6">
              <span className="hover:text-emerald-600 cursor-pointer">Privacy Policy</span>
              <span className="hover:text-emerald-600 cursor-pointer">Terms of Service</span>
              <span className="hover:text-emerald-600 cursor-pointer">Security Protocol</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
