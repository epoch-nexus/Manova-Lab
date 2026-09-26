import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function ResultsPage() {
  const [toastMessage, setToastMessage] = useState(null);
  const [selectedCohort, setSelectedCohort] = useState('Undergrad Normal [A1]');
  const [dateRange, setDateRange] = useState('Last 30 Days');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleExportCsv = async () => {
    try {
      showToast("Fetching real CSV from backend...");
      const blob = await api.results.exportCsv('mock-id');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'results.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Downloaded EXP-882-STRP_results_full.csv");
    } catch (e) {
      console.warn('Real API failed, falling back to mock data', e);
      // Simulated CSV download fallback
      const csvContent = "data:text/csv;charset=utf-8," + 
        "session_id,trial_index,condition,stimulus,ink_color,response_key,rt_ms,accuracy,ptp_timestamp\n" +
        "SUB-882-01,1,congruent,RED,RED,D,312.4,1,1714289012.839210\n" +
        "SUB-882-01,2,incongruent,GREEN,RED,D,384.2,1,1714289014.281940\n" +
        "SUB-882-01,3,congruent,BLUE,BLUE,F,298.1,1,1714289015.682910\n";
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "EXP-882-STRP_results_full.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Downloaded Mock EXP-882-STRP_results_full.csv");
    }
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
              <Link to="/results" className="px-3 py-1.5 bg-surface-container-high text-on-surface rounded">
                Results &amp; Analytics
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

      {/* Breadcrumb sub-header */}
      <section className="w-full bg-surface-container-low border-b border-surface-container px-4 sm:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/dashboard" className="text-on-surface-variant hover:text-primary transition-colors uppercase tracking-wider">
              My Experiments
            </Link>
            <span>/</span>
            <span className="text-primary font-bold uppercase tracking-wider">EXP-882-STRP Results</span>
            <span className="text-surface-container-highest">•</span>
            <span className="text-on-surface font-sans font-medium text-xs">Stroop Interference &amp; Executive Inhibition Matrix</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 bg-surface-container-lowest text-on-surface uppercase tracking-wider font-semibold rounded border border-surface-container">
              IRB Protocol #STAN-2024-899
            </span>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 rounded font-semibold uppercase tracking-wider border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>144Hz Sync Locked</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Analytics Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 flex flex-col gap-8">
        {/* Title & Toolbar */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-wider font-bold">
              <span className="material-symbols-outlined text-[18px]">analytics</span>
              <span>Results Export</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-heading text-on-surface tracking-tight">
              Results &amp; Cognitive Telemetry Dashboard
            </h1>
            <p className="text-sm text-on-surface-variant max-w-2xl leading-relaxed">
              Export reaction-time distributions and participant-level records.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5 font-mono text-xs">
            <div className="flex items-center gap-1.5 bg-surface-container-lowest px-3 py-2 rounded-lg border border-surface-container shadow-xs text-on-surface">
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">calendar_today</span>
              <span>Date: <strong>{dateRange}</strong></span>
            </div>

            <div className="flex items-center gap-1.5 bg-surface-container-lowest px-3 py-2 rounded-lg border border-surface-container shadow-xs text-on-surface">
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">group_work</span>
              <span>Cohort: <strong>{selectedCohort}</strong></span>
            </div>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 bg-primary hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg shadow-emerald-700/20 uppercase tracking-wider font-bold transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Export Results (CSV)</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stat 1 */}
          <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2">
              <span className="font-mono text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Cohort Enrolled</span>
              <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-3xl font-extrabold text-on-surface">840</span>
                <span className="font-mono text-xs text-on-surface-variant uppercase font-semibold">Subjects</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 font-mono text-xs text-on-surface-variant">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>812 completed • 28 in-flight</span>
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-surface-container flex items-center justify-between font-mono text-xs">
              <span className="text-on-surface-variant">Retention</span>
              <span className="text-emerald-700 font-bold">96.7%</span>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2">
              <span className="font-mono text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Telemetry Samples</span>
              <span className="material-symbols-outlined text-primary text-[20px]">multiline_chart</span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-3xl font-extrabold text-on-surface">40,320</span>
                <span className="font-mono text-xs text-on-surface-variant uppercase font-semibold">Trials</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 font-mono text-xs text-on-surface-variant">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>100% Fidelity (0 dropped frames)</span>
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-surface-container flex items-center justify-between font-mono text-xs">
              <span className="text-on-surface-variant">Sampling Clock</span>
              <span className="text-emerald-700 font-bold">1,000 Hz Sub-ms</span>
            </div>
          </div>

          {/* Stat 3 */}
          <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2">
              <span className="font-mono text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Mean RT</span>
              <span className="material-symbols-outlined text-primary text-[20px]">timer</span>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-3xl font-extrabold text-on-surface">342.1</span>
                <span className="font-mono text-sm text-primary font-bold">ms</span>
                <span className="text-xs text-on-surface-variant ml-1 font-mono">±18.4ms SD</span>
              </div>
              <div className="flex items-center gap-2 mt-2 font-mono text-xs text-on-surface-variant">
                <span>Cong: <strong className="text-on-surface">312.4ms</strong></span>
                <span>|</span>
                <span>Incong: <strong className="text-on-surface">371.8ms</strong></span>
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-surface-container flex items-center justify-between font-mono text-xs">
              <span className="text-on-surface-variant">Inhibition Cost</span>
              <span className="text-emerald-700 font-bold">+59.4 ms Delta</span>
            </div>
          </div>

          {/* Stat 4 */}
          <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2">
              <span className="font-mono text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Detection Accuracy</span>
              <span className="material-symbols-outlined text-primary text-[20px]">verified</span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-3xl font-extrabold text-on-surface">96.4%</span>
                <span className="font-mono text-xs text-emerald-700 font-bold">d' = 3.42</span>
              </div>
              <div className="flex items-center gap-2 mt-2 font-mono text-xs text-on-surface-variant">
                <span>Cong: <strong className="text-on-surface">98.8%</strong></span>
                <span>|</span>
                <span>Incong: <strong className="text-on-surface">94.0%</strong></span>
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-surface-container flex items-center justify-between font-mono text-xs">
              <span className="text-on-surface-variant">Criterion Beta</span>
              <span className="text-emerald-700 font-bold">0.08 Neutral Bias</span>
            </div>
          </div>
        </div>

        {/* Reaction Time Distribution Gaussian Curve */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container shadow-xs flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-surface-container gap-3">
            <div>
              <span className="font-mono text-xs uppercase text-on-surface-variant font-semibold">RT DENSITY DISTRIBUTIONS</span>
              <h2 className="font-heading font-bold text-lg text-on-surface">
                Congruent vs. Incongruent Response Latencies
              </h2>
            </div>
            <div className="flex items-center gap-4 font-mono text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded bg-emerald-500"></span>
                <span>Congruent (μ = 312ms)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded bg-slate-500"></span>
                <span>Incongruent (μ = 371ms)</span>
              </div>
            </div>
          </div>

          <div className="w-full h-64 bg-slate-950 rounded-xl p-4 relative border border-slate-800">
            <svg className="w-full h-full" viewBox="0 0 1000 240" preserveAspectRatio="none">
              <defs>
                <linearGradient id="congruentGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="incongruentGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#64748b" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#64748b" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="60" y1="200" x2="940" y2="200" stroke="#334155" strokeWidth="1" />
              <line x1="60" y1="130" x2="940" y2="130" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="60" y1="60" x2="940" y2="60" stroke="#1e293b" strokeDasharray="3 3" />

              {/* Congruent Curve */}
              <path
                d="M 120 200 C 200 200, 260 190, 310 110 C 340 50, 355 20, 360 18 C 365 20, 385 60, 415 120 C 455 180, 520 200, 600 200 Z"
                fill="url(#congruentGrad)"
              />
              <path
                d="M 120 200 C 200 200, 260 190, 310 110 C 340 50, 355 20, 360 18 C 365 20, 385 60, 415 120 C 455 180, 520 200, 600 200"
                stroke="#10B981"
                strokeWidth="2.5"
                fill="none"
              />

              {/* Incongruent Curve */}
              <path
                d="M 180 200 C 260 200, 340 190, 400 130 C 440 70, 455 45, 460 42 C 470 45, 500 80, 540 140 C 600 190, 700 200, 800 200 Z"
                fill="url(#incongruentGrad)"
              />
              <path
                d="M 180 200 C 260 200, 340 190, 400 130 C 440 70, 455 45, 460 42 C 470 45, 500 80, 540 140 C 600 190, 700 200, 800 200"
                stroke="#94a3b8"
                strokeWidth="2.5"
                fill="none"
              />
            </svg>
          </div>
          <div className="flex justify-between text-xs font-mono text-on-surface-variant px-2">
            <span>150ms</span>
            <span>250ms</span>
            <span>350ms (Mean Congruent)</span>
            <span>450ms (Mean Incongruent)</span>
            <span>550ms</span>
            <span>650ms</span>
          </div>
        </div>

        {/* Participant Ledger Table */}
        <div className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-xs overflow-hidden">
          <div className="p-4 bg-surface-container-low border-b border-surface-container flex items-center justify-between">
            <span className="font-mono text-xs uppercase text-on-surface font-bold tracking-wider">
              Participant Session Ledger (Sample 6 of 840)
            </span>
            <span className="font-mono text-xs text-on-surface-variant">Live PTP Verified</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-surface-container text-on-surface-variant uppercase text-[11px] border-b border-surface-container">
                <tr>
                  <th className="p-3 pl-5">Session Hash</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Trials Done</th>
                  <th className="p-3">Mean Cong RT</th>
                  <th className="p-3">Mean Incong RT</th>
                  <th className="p-3">Delta</th>
                  <th className="p-3">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container text-on-surface">
                <tr className="hover:bg-surface-container-low transition-colors">
                  <td className="p-3 pl-5 font-bold text-primary">#SUB-9402a</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold">COMPLETED</span></td>
                  <td className="p-3">48 / 48</td>
                  <td className="p-3">308.2 ms</td>
                  <td className="p-3">364.5 ms</td>
                  <td className="p-3 text-emerald-600 font-bold">+56.3 ms</td>
                  <td className="p-3 font-bold">98%</td>
                </tr>
                <tr className="hover:bg-surface-container-low transition-colors">
                  <td className="p-3 pl-5 font-bold text-primary">#SUB-8192b</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold">COMPLETED</span></td>
                  <td className="p-3">48 / 48</td>
                  <td className="p-3">324.0 ms</td>
                  <td className="p-3">389.1 ms</td>
                  <td className="p-3 text-emerald-600 font-bold">+65.1 ms</td>
                  <td className="p-3 font-bold">95.8%</td>
                </tr>
                <tr className="hover:bg-surface-container-low transition-colors">
                  <td className="p-3 pl-5 font-bold text-primary">#SUB-1049c</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold">COMPLETED</span></td>
                  <td className="p-3">48 / 48</td>
                  <td className="p-3">295.4 ms</td>
                  <td className="p-3">348.0 ms</td>
                  <td className="p-3 text-emerald-600 font-bold">+52.6 ms</td>
                  <td className="p-3 font-bold">100%</td>
                </tr>
                <tr className="hover:bg-surface-container-low transition-colors">
                  <td className="p-3 pl-5 font-bold text-primary">#SUB-5592d</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold">IN-FLIGHT</span></td>
                  <td className="p-3">34 / 48</td>
                  <td className="p-3">315.8 ms</td>
                  <td className="p-3">378.2 ms</td>
                  <td className="p-3 text-emerald-600 font-bold">+62.4 ms</td>
                  <td className="p-3 font-bold">94.1%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <footer className="w-full bg-surface-container-low border-t border-surface-container py-3 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono text-on-surface-variant">
          <div>© 2025 Manova Labs Inc.</div>
        </div>
      </footer>
    </div>
  );
}
