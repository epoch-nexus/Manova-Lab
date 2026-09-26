import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function BuilderPage() {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState('visual');
  const [stimulusText, setStimulusText] = useState('RED');
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans text-on-surface">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-lg shadow-2xl font-mono text-xs uppercase tracking-wider flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 left-0 right-0 z-40 bg-surface-container-lowest/90 backdrop-blur-md shadow-xs border-b border-surface-container">
        <div className="h-16 w-full max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container shadow-sm group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[19px]">biotech</span>
              </div>
              <div className="flex items-baseline tracking-tight font-bold text-lg">
                <span className="text-on-surface">MANOVA</span>
                <span className="text-primary-container ml-1">Labs</span>
              </div>
            </Link>

            <div className="hidden xl:block h-5 w-[1px] bg-surface-container-highest"></div>

            <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold uppercase tracking-wider">
              <Link to="/dashboard" className="px-3 py-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded transition-colors">
                My Experiments
              </Link>
              <Link to="/builder" className="px-3 py-1.5 bg-surface-container-high text-on-surface rounded">
                Protocol Builder
              </Link>
              <Link to="/science" className="px-3 py-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded transition-colors">
                Telemetry &amp; Streams
              </Link>
              <Link to="/science" className="px-3 py-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded transition-colors">
                Documentation
              </Link>
              <Link to="/results" className="px-3 py-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded transition-colors">
                IRB Compliance
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-surface-container-low border border-surface-container rounded font-mono text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-on-surface uppercase tracking-wider">NODE #884-PX ONLINE</span>
            </div>

            <div className="hidden md:flex flex-col text-right font-mono">
              <span className="text-xs text-on-surface font-semibold leading-none">dr.arun@stanford.edu</span>
              <span className="text-[10px] text-emerald-600 tracking-wider uppercase font-semibold leading-none mt-1">PI PRIVILEGE</span>
            </div>

            <Link to="/auth" className="hidden sm:flex items-center gap-1 px-3 py-1 bg-surface-container-low hover:bg-surface-container-high font-mono text-xs text-on-surface rounded transition-colors uppercase tracking-wider">
              <span className="material-symbols-outlined text-[16px]">logout</span> Log Out
            </Link>

            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      {/* Protocol Banner & Controls */}
      <section className="w-full bg-surface-container-lowest border-b border-surface-container px-4 sm:px-8 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-on-surface-variant font-mono text-xs uppercase tracking-wider">
              <Link to="/dashboard" className="hover:text-primary transition-colors">My Experiments</Link>
              <span>/</span>
              <span className="text-on-surface">EXP-882-STRP</span>
              <span>/</span>
              <span className="text-primary font-bold">Protocol Builder (Node Graph)</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="font-heading font-bold text-lg text-on-surface">
                Stroop Color-Word Interference &amp; Cognitive Control Paradigm
              </h1>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono text-[10px] uppercase font-bold">
                v2.4-STABLE
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
            <div className="flex items-center bg-surface-container p-0.5 rounded-lg border border-surface-container">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-lowest text-on-surface font-bold rounded shadow-xs">
                <span className="material-symbols-outlined text-[16px] text-primary">account_tree</span>
                <span>React Flow Engine</span>
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>
                <span>Legacy Form</span>
              </button>
            </div>

            <div className="h-6 w-[1px] bg-surface-container-high hidden sm:block"></div>

            <button
              onClick={() => navigate('/runner')}
              className="flex items-center gap-1 px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface uppercase tracking-wider rounded border border-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] text-emerald-600">play_arrow</span>
              <span>Run Sandbox</span>
            </button>

            <button
              onClick={() => showToast('Schema Validated: 0 Errors in 7 Nodes')}
              className="flex items-center gap-1 px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface uppercase tracking-wider rounded border border-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">verified</span>
              <span>Validate Schema</span>
            </button>

            <button
              onClick={() => {
                showToast('Protocol compiled & published to edge!');
                setTimeout(() => navigate('/dashboard'), 800);
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-emerald-700 text-white uppercase tracking-wider font-bold rounded shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
              <span>Compile &amp; Publish</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Canvas + Toolbars Area */}
      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden relative">
        {/* Left Palette */}
        <aside className="w-full xl:w-72 bg-surface-container-lowest p-4 flex flex-col gap-4 shrink-0 border-r border-surface-container z-20">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-xs text-on-surface uppercase tracking-wider font-bold">Node Palette</span>
              <span className="px-1.5 py-0.5 bg-surface-container font-mono text-[10px] text-on-surface-variant rounded">/ (HOTKEY)</span>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Search nodes (e.g. Stimulus)..."
                className="w-full bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/70 text-xs pl-8 pr-3 py-2 rounded-lg border border-surface-container focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-[16px] text-on-surface-variant">search</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[380px] xl:max-h-[580px] pr-1">
            <div className="p-3 bg-surface-container-low hover:bg-surface-container rounded-xl border border-surface-container transition-all cursor-grab group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-on-surface">
                  <span className="material-symbols-outlined text-[16px] text-primary">assignment</span>
                  <span>Instruction</span>
                </div>
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-mono rounded uppercase">Consent</span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-snug">Briefing, Markdown, IRB consent forms, &amp; confirmation keydowns.</p>
            </div>

            <div className="p-3 bg-surface-container-low hover:bg-surface-container rounded-xl border border-surface-container transition-all cursor-grab group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-on-surface">
                  <span className="material-symbols-outlined text-[16px] text-primary">visibility</span>
                  <span>Stimulus</span>
                </div>
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-mono rounded uppercase">Visual/Audio</span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-snug">Fixation cross, SVG targets, audio cues, Gabor grating, &amp; ISI duration.</p>
            </div>

            <div className="p-3 bg-surface-container-low hover:bg-surface-container rounded-xl border border-surface-container transition-all cursor-grab group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-on-surface">
                  <span className="material-symbols-outlined text-[16px] text-primary">keyboard</span>
                  <span>Response</span>
                </div>
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-mono rounded uppercase">Key/RT</span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-snug">Direct keyboard capture, millisecond precision, timeout windowing.</p>
            </div>

            <div className="p-3 bg-surface-container-low hover:bg-surface-container rounded-xl border border-surface-container transition-all cursor-grab group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-on-surface">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600">alt_route</span>
                  <span>Branch Route</span>
                </div>
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-mono rounded uppercase">Condition</span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-snug">Conditional routing (RT &lt; 200ms anticipation warnings, error retries).</p>
            </div>

            <div className="p-3 bg-surface-container-low hover:bg-surface-container rounded-xl border border-surface-container transition-all cursor-grab group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-on-surface">
                  <span className="material-symbols-outlined text-[16px] text-primary">sync</span>
                  <span>Block Iterator</span>
                </div>
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-mono rounded uppercase">Counterbalance</span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-snug">Trial looping, Latin Square matrix balancing, random permutations.</p>
            </div>
          </div>

          <div className="mt-auto p-3 bg-surface-container rounded-xl border border-surface-container font-mono text-xs">
            <div className="flex items-center justify-between mb-1 uppercase font-bold text-on-surface">
              <span>Graph Diagnostics</span>
              <span className="text-emerald-700 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 0 ERRORS
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] text-on-surface-variant">
              <div>Nodes: <strong className="text-on-surface">7</strong></div>
              <div>Edges: <strong className="text-on-surface">8</strong></div>
              <div className="col-span-2">Schema: <strong className="text-on-surface">BIDS-EXP-SPEC-1.8.2</strong></div>
            </div>
          </div>
        </aside>

        {/* Center Node Graph Canvas */}
        <main className="flex-1 relative bg-slate-50 overflow-x-auto overflow-y-auto min-h-[720px] select-none">
          {/* Subtle Grid dots */}
          <div className="absolute inset-0 pointer-events-none opacity-40" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

          {/* SVG Connections */}
          <svg className="absolute inset-0 w-[1480px] h-[820px] pointer-events-none z-10">
            <defs>
              <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <path d="M 280 180 C 330 180, 340 180, 390 180" fill="none" stroke="#94a3b8" strokeDasharray="4 2" strokeWidth="2"></path>
            <circle cx="390" cy="180" fill="#059669" r="3"></circle>

            <path d="M 640 180 C 690 180, 700 180, 750 180" fill="none" stroke="#10b981" strokeWidth="2.5"></path>
            <circle cx="750" cy="180" fill="#10b981" r="3"></circle>

            <circle r="4" fill="#10b981" filter="url(#emeraldGlow)">
              <animateMotion dur="1.8s" repeatCount="indefinite" path="M 640 180 C 690 180, 700 180, 750 180" />
            </circle>

            <path d="M 1020 180 C 1070 180, 1080 180, 1120 180" fill="none" stroke="#10b981" strokeWidth="2"></path>
            <circle cx="1120" cy="180" fill="#10b981" r="3"></circle>

            <path d="M 1250 255 C 1250 330, 950 340, 950 400" fill="none" stroke="#94a3b8" strokeWidth="2"></path>

            <path d="M 830 505 C 750 505, 680 505, 590 505" fill="none" stroke="#10b981" strokeWidth="2"></path>
            <text x="695" y="495" fill="#059669" className="font-mono text-[10px] font-semibold">on_correct (Next)</text>

            <path d="M 1070 470 C 1140 470, 1160 450, 1220 450" fill="none" stroke="#64748b" strokeDasharray="3 3" strokeWidth="1.5"></path>
            <text x="1110" y="445" fill="#64748b" className="font-mono text-[10px]">timeout &gt; 1200ms</text>

            <path d="M 1070 520 C 1140 520, 1160 560, 1220 560" fill="none" stroke="#ef4444" strokeDasharray="3 3" strokeWidth="1.5"></path>
            <text x="1110" y="575" fill="#ef4444" className="font-mono text-[10px]">RT &lt; 150ms</text>

            <path d="M 330 505 C 260 505, 230 505, 170 505" fill="none" stroke="#059669" strokeWidth="2"></path>
            <circle cx="170" cy="505" fill="#059669" r="3"></circle>
          </svg>

          {/* Node Cards on Canvas */}
          <div className="relative w-[1480px] h-[820px] p-6">
            {/* Node 1: Instruction */}
            <div className="absolute left-10 top-24 w-60 bg-white rounded-xl shadow-md border border-slate-200 p-3 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between pb-1 mb-2 bg-slate-50 -mx-3 -mt-3 px-3 pt-2 rounded-t-xl border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-mono text-[11px] text-slate-800 uppercase font-bold">INSTRUCTION_01</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">INIT</span>
              </div>
              <div className="font-heading font-bold text-xs text-slate-900 mb-1">Participant Brief &amp; Consent</div>
              <p className="text-[11px] text-slate-500 leading-tight mb-2">Identify ink color of target words using keys [D], [F], [J], [K]. Ignore semantic text meaning.</p>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded">
                <span>Out: on_continue</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              </div>
            </div>

            {/* Node 2: Fixation */}
            <div className="absolute left-[390px] top-24 w-64 bg-white rounded-xl shadow-md border border-slate-200 p-3 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between pb-1 mb-2 bg-slate-50 -mx-3 -mt-3 px-3 pt-2 rounded-t-xl border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-mono text-[11px] text-slate-800 uppercase font-bold">STIMULUS_FIXATION</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">500ms</span>
              </div>
              <div className="font-heading font-bold text-xs text-slate-900 mb-1">Central Fixation Cross (+)</div>
              <div className="flex items-center justify-center h-12 bg-slate-50 rounded-lg mb-2 border border-slate-100">
                <span className="text-xl font-light text-slate-700 select-none">+</span>
              </div>
              <div className="text-[11px] text-slate-500 space-y-0.5 font-mono">
                <div>Jitter: <span className="text-slate-800">±50ms uniform distribution</span></div>
                <div>Sync: <span className="text-emerald-600 font-bold">Hardware rAF lock</span></div>
              </div>
            </div>

            {/* Node 3: Target Stimulus (Selected) */}
            <div className="absolute left-[750px] top-14 w-[270px] bg-white rounded-xl ring-2 ring-emerald-500 shadow-xl p-3 border border-emerald-300">
              <div className="flex items-center justify-between pb-1 mb-2 bg-emerald-50 -mx-3 -mt-3 px-3 pt-2 rounded-t-xl border-b border-emerald-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-mono text-[11px] text-slate-800 uppercase font-bold">STIMULUS_TARGET</span>
                </div>
                <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[9px] font-mono uppercase font-bold">SELECTED</span>
              </div>

              <div className="font-heading font-bold text-xs text-slate-900 mb-1">Stroop Word Stimulus</div>
              <div className="flex flex-col items-center justify-center h-16 bg-slate-50 rounded-lg mb-2 border border-slate-100 relative">
                <span className="text-2xl font-extrabold font-heading tracking-wider text-emerald-600">{stimulusText}</span>
                <span className="text-[9px] font-mono text-slate-400 absolute bottom-1 right-2">#10b981 INCONGRUENT</span>
              </div>

              <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-slate-600 mb-2">
                <div>Semantic: <strong className="text-slate-900">"{stimulusText}"</strong></div>
                <div>Ink: <strong className="text-emerald-600">EMERALD</strong></div>
                <div>Texture: <strong className="text-slate-900">GPU VSYNC</strong></div>
                <div>Duration: <strong className="text-slate-900">1000ms</strong></div>
              </div>
              <div className="flex items-center justify-between pt-1 bg-slate-50 px-2 py-1 rounded text-[10px] font-mono">
                <span className="text-slate-500">BIDS Tag: stroop_incongruent_trial</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              </div>
            </div>

            {/* Node 4: Response Capture */}
            <div className="absolute left-[1120px] top-24 w-64 bg-white rounded-xl shadow-md border border-slate-200 p-3 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between pb-1 mb-2 bg-slate-50 -mx-3 -mt-3 px-3 pt-2 rounded-t-xl border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-mono text-[11px] text-slate-800 uppercase font-bold">RESPONSE_CAPTURE</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">EVENT</span>
              </div>
              <div className="font-heading font-bold text-xs text-slate-900 mb-1">Raw Keydown Dispatch</div>
              <div className="flex gap-1.5 mb-2 font-mono text-xs">
                <span className="px-2 py-1 bg-slate-100 text-slate-900 font-bold rounded">D</span>
                <span className="px-2 py-1 bg-slate-100 text-slate-900 font-bold rounded">F</span>
                <span className="px-2 py-1 bg-slate-100 text-slate-900 font-bold rounded">J</span>
                <span className="px-2 py-1 bg-slate-100 text-slate-900 font-bold rounded">K</span>
              </div>
              <div className="text-[11px] text-slate-500 space-y-0.5 font-mono">
                <div>Timeout: <span className="text-slate-900 font-semibold">1200ms limit</span></div>
                <div>Precision: <span className="text-emerald-600 font-bold">performance.now() microtask</span></div>
              </div>
            </div>

            {/* Node 5: Branch Evaluator */}
            <div className="absolute left-[830px] top-[400px] w-64 bg-white rounded-xl shadow-md border border-slate-200 p-3 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between pb-1 mb-2 bg-slate-50 -mx-3 -mt-3 px-3 pt-2 rounded-t-xl border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-mono text-[11px] text-slate-800 uppercase font-bold">BRANCH_EVALUATOR</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">ROUTER</span>
              </div>
              <div className="font-heading font-bold text-xs text-slate-900 mb-1">Cognitive Evaluation &amp; Contingency</div>
              <p className="font-mono text-[10px] bg-slate-100 p-1 rounded mb-2 text-slate-800">switch(trial.correctness)</p>
              <div className="space-y-1 text-[10px] font-mono">
                <div className="flex items-center justify-between px-2 py-1 bg-emerald-50 text-emerald-800 rounded">
                  <span>● Correct Response</span>
                  <span className="font-bold">→ Iterate</span>
                </div>
                <div className="flex items-center justify-between px-2 py-1 bg-slate-100 text-slate-700 rounded">
                  <span>▲ Timeout (&gt;1200ms)</span>
                  <span>→ Warning</span>
                </div>
                <div className="flex items-center justify-between px-2 py-1 bg-rose-50 text-rose-700 rounded">
                  <span>■ Anticipation (&lt;150ms)</span>
                  <span>→ Flag</span>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Right Inspector */}
        <aside className="w-full xl:w-96 bg-surface-container-lowest p-4 flex flex-col gap-4 shrink-0 border-l border-surface-container z-20 overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-surface-container">
            <div>
              <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider block">SELECTED NODE INSPECTOR</span>
              <h2 className="font-heading font-bold text-sm text-on-surface">STIMULUS_TARGET</h2>
            </div>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-mono text-[10px] uppercase font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> VALID
            </span>
          </div>

          <div className="flex bg-surface-container p-0.5 rounded-lg font-mono text-xs">
            <button
              onClick={() => setSelectedTab('visual')}
              className={`flex-1 py-1.5 text-center rounded transition-all ${selectedTab === 'visual' ? 'bg-surface-container-lowest text-on-surface font-bold shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Visual
            </button>
            <button
              onClick={() => setSelectedTab('bids')}
              className={`flex-1 py-1.5 text-center rounded transition-all ${selectedTab === 'bids' ? 'bg-surface-container-lowest text-on-surface font-bold shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              BIDS Schema
            </button>
            <button
              onClick={() => setSelectedTab('timing')}
              className={`flex-1 py-1.5 text-center rounded transition-all ${selectedTab === 'timing' ? 'bg-surface-container-lowest text-on-surface font-bold shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Timing
            </button>
          </div>

          <div className="flex flex-col gap-3 text-xs">
            <div>
              <label className="font-mono text-[11px] text-on-surface-variant uppercase font-medium block mb-1">Stimulus Text Literal</label>
              <input
                type="text"
                value={stimulusText}
                onChange={(e) => setStimulusText(e.target.value)}
                className="w-full bg-surface-container-low text-on-surface font-mono font-bold px-3 py-2 rounded-lg border border-surface-container focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono">
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase block mb-1">Ink Color</label>
                <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-lg border border-surface-container">
                  <span className="w-3.5 h-3.5 rounded bg-emerald-500 shadow-xs"></span>
                  <span className="text-on-surface font-bold">#10b981</span>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase block mb-1">Congruency</label>
                <div className="bg-surface-container-low px-3 py-1.5 rounded-lg border border-surface-container text-rose-600 font-bold">
                  Incongruent
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono">
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase block mb-1">Dwell (ms)</label>
                <input
                  type="number"
                  defaultValue={1000}
                  className="w-full bg-surface-container-low text-on-surface px-3 py-1.5 rounded-lg border border-surface-container focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-on-surface-variant uppercase block mb-1">ISI (ms)</label>
                <input
                  type="number"
                  defaultValue={350}
                  className="w-full bg-surface-container-low text-on-surface px-3 py-1.5 rounded-lg border border-surface-container focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-2">
              <div className="flex items-center justify-between pb-1 font-mono text-[11px] text-on-surface uppercase font-bold">
                <span>Declarative BIDS Mapping</span>
                <button
                  type="button"
                  onClick={() => showToast('BIDS JSON specification copied')}
                  className="text-primary hover:underline flex items-center gap-0.5 text-[10px]"
                >
                  <span className="material-symbols-outlined text-[12px]">content_copy</span> Copy
                </button>
              </div>
              <div className="bg-slate-950 text-emerald-400 p-3 rounded-xl font-mono text-[11px] leading-relaxed border border-slate-800">
                <pre>{`{
  "node_id": "stim_target_03",
  "type": "stimulus.visual_text",
  "params": {
    "text": "${stimulusText}",
    "ink": "#10b981",
    "congruent": false
  }
}`}</pre>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="w-full bg-surface-container-low border-t border-surface-container py-3 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono text-on-surface-variant">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-on-surface uppercase font-semibold">SYNC LATENCY: 0.12ms UTC</span>
            <span>|</span>
            <span>BIDS SCHEMA v1.8.2 ACTIVE</span>
          </div>
          <div>© 2025 Manova Labs Inc. Precision Research Framework.</div>
        </div>
      </footer>
    </div>
  );
}
