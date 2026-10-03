import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import FadeIn from '../components/FadeIn';

export default function DashboardPage() {
  const navigate = useNavigate();

  // State
  const [devState, setDevState] = useState('populated'); // 'populated' | 'loading' | 'empty'
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'published' | 'draft' | 'archived'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('modified');
  const [viewMode, setViewMode] = useState('grid'); // 'table' | 'grid'
  const [toastMessage, setToastMessage] = useState(null);

  // Modals state
  const [publishModal, setPublishModal] = useState({ open: false, experiment: null });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [seedModalOpen, setSeedModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Initial Experiments list
  const [experiments, setExperiments] = useState([
    {
      id: 'EXP-882-STRP',
      version: 'v2.4',
      isDraft: false,
      title: 'Stroop Interference & Executive Inhibition Matrix',
      paradigm: 'Visual Color-Word Stroop',
      engine: 'High-frequency 144Hz WebGL',
      status: 'published',
      participants: 840,
      quota: 1000,
      pct: 84,
      meanRt: '342.1 ms',
      jitter: '±0.08 ms',
      activity: 'Active 4 mins ago',
      shareUrl: 'https://manova.app/run/MANOVA-7749-STROOP'
    },
    {
      id: 'EXP-904-ERP',
      version: 'v1.1',
      isDraft: false,
      title: 'Rapid Visual ERP & P300 Neural Synchronization',
      paradigm: 'Event-Related Potential 64-Ch',
      engine: 'LSL Synchronized Stream',
      status: 'published',
      participants: 428,
      quota: 500,
      pct: 85.6,
      meanRt: '289.4 ms',
      jitter: '±0.04 ms',
      activity: 'Active 28 mins ago',
      shareUrl: 'https://manova.app/run/MANOVA-904-ERP'
    },
    {
      id: 'EXP-771-PUPIL',
      version: 'v3.0',
      isDraft: false,
      title: 'Pupillometric Cognitive Load & Task Difficulty Staircase',
      paradigm: 'Dual-Purkinje Eye Tracking',
      engine: 'Pupil diameter 250Hz sampling',
      status: 'published',
      participants: 312,
      quota: 350,
      pct: 89.1,
      meanRt: '412.0 ms',
      jitter: '±0.12 ms',
      activity: 'Active 2 hours ago',
      shareUrl: 'https://manova.app/run/MANOVA-771-PUPIL'
    },
    {
      id: 'EXP-915-NBK',
      version: 'DRAFT',
      isDraft: true,
      title: 'Spatial N-Back Working Memory Protocol (Audio-Visual)',
      paradigm: 'Multi-modal N-Back',
      engine: '48 trials configured | Calibration pending',
      status: 'draft',
      participants: 0,
      quota: 0,
      pct: 0,
      customParticipantText: '0 participants (Awaiting stimuli & IRB)',
      meanRt: 'Uncalibrated',
      jitter: '',
      activity: 'Edited yesterday by Dr. Arun',
      shareUrl: 'https://manova.app/run/MANOVA-915-NBK'
    },
    {
      id: 'EXP-930-GNG',
      version: 'DRAFT',
      isDraft: true,
      title: 'Continuous Performance Test (CPT) - Sustained Attention',
      paradigm: 'Go/No-Go Paradigm',
      engine: '120 trials configured | Validated',
      status: 'draft',
      participants: 0,
      quota: 0,
      pct: 0,
      customParticipantText: '0 participants (Validated)',
      meanRt: 'Simulated: 275ms',
      jitter: '',
      activity: 'Edited 3 days ago',
      shareUrl: 'https://manova.app/run/MANOVA-930-GNG'
    }
  ]);

  useEffect(() => {
    const fetchExperiments = async () => {
      try {
        const res = await api.experiments.list();
        const exps = res.data || res;
        if (Array.isArray(exps)) {
          const mapped = exps.map(exp => ({
            id: exp.id,
            version: 'v' + (exp.version || 1),
            isDraft: exp.status === 'draft',
            title: exp.title || 'Untitled',
            paradigm: 'Behavioral',
            engine: 'Standard Engine',
            status: exp.status || 'draft',
            participants: exp._count?.sessions || 0,
            quota: 100,
            pct: 0,
            meanRt: '-',
            activity: 'Active',
            shareUrl: `http://localhost:3000/run/${exp.id}`
          }));
          setExperiments(mapped);
          setDevState(mapped.length ? 'populated' : 'empty');
        }
      } catch (err) {
        console.error('Failed to fetch experiments', err);
      }
    };
    fetchExperiments();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text);
    showToast('Participant link copied to clipboard!');
  };

  const handlePublish = (exp) => {
    setExperiments(prev => prev.map(item => {
      if (item.id === exp.id) {
        return {
          ...item,
          status: 'published',
          version: 'v1.0',
          isDraft: false,
          customParticipantText: undefined,
          quota: 200,
          pct: 0
        };
      }
      return item;
    }));
    setPublishModal({ open: true, experiment: exp });
    showToast(`Protocol ${exp.id} deployed & token armed`);
  };

  const filteredExperiments = useMemo(() => {
    if (devState === 'empty') return [];

    return experiments.filter(exp => {
      // Category filter
      if (categoryFilter === 'published' && exp.status !== 'published') return false;
      if (categoryFilter === 'draft' && exp.status !== 'draft') return false;
      if (categoryFilter === 'archived') return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = exp.title.toLowerCase().includes(query);
        const matchesId = exp.id.toLowerCase().includes(query);
        const matchesParadigm = exp.paradigm.toLowerCase().includes(query);
        if (!matchesTitle && !matchesId && !matchesParadigm) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'participants') return b.participants - a.participants;
      if (sortBy === 'latency') return parseFloat(a.meanRt) - parseFloat(b.meanRt);
      return 0; // default order
    });
  }, [experiments, devState, categoryFilter, searchQuery, sortBy]);

  const publishedCount = experiments.filter(e => e.status === 'published').length;
  const draftCount = experiments.filter(e => e.status === 'draft').length;

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
      <header className="sticky top-0 left-0 right-0 z-40 bg-surface-container-lowest/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-surface-container">
        <div className="h-16 w-full px-4 sm:px-8 max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
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
              <Link to="/dashboard" className="px-3 py-1.5 bg-surface-container-high text-on-surface rounded">
                My Experiments
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-surface-container-low border border-surface-container rounded">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-mono text-xs text-on-surface uppercase tracking-wider">NODE #884-PX ONLINE</span>
            </div>

            <div className="hidden md:flex flex-col text-right">
              <span className="font-mono text-xs text-on-surface font-semibold leading-none">dr.arun@stanford.edu</span>
              <span className="font-mono text-[10px] text-emerald-600 tracking-wider uppercase font-semibold leading-none mt-1">PI PRIVILEGE</span>
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

      {/* Main Container */}
      <main className="flex-1 w-full bg-surface pb-16">

        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 flex flex-col gap-8">
          {/* Page Title & Main Actions */}
          <FadeIn className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-on-surface tracking-tight font-heading">
                My Experiments
              </h1>
              <p className="text-sm sm:text-base text-on-surface-variant max-w-2xl leading-relaxed">
                Manage cognitive protocols, audit participant data streams, and deploy sub-millisecond psychometric assays across distributed edge nodes.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-5 py-2.5 bg-primary hover:bg-emerald-700 text-on-primary text-xs font-mono uppercase tracking-wider font-bold shadow-md hover:shadow-lg shadow-emerald-700/20 flex items-center gap-2 rounded-lg transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>+ Create Experiment</span>
              </button>
            </div>
          </FadeIn>

          {/* Conditional Views: Loading, Empty, or Populated */}
          {devState === 'loading' ? (
            <FadeIn delay={100} className="w-full bg-surface-container-lowest rounded-xl border border-surface-container p-12 flex flex-col items-center justify-center text-center shadow-xs">
              <span className="w-8 h-8 rounded-full border-3 border-emerald-500 border-t-transparent animate-spin mb-4"></span>
              <h3 className="font-heading font-bold text-lg text-on-surface">Synchronizing Protocol Descriptors</h3>
              <p className="font-mono text-xs text-on-surface-variant mt-1">Polling edge cache from Node #884-PX...</p>
            </FadeIn>
          ) : filteredExperiments.length === 0 ? (
            <FadeIn delay={100} className="w-full bg-surface-container-lowest rounded-xl border border-surface-container p-12 flex flex-col items-center justify-center text-center shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 border border-emerald-100">
                <span className="material-symbols-outlined text-[32px]">science</span>
              </div>
              <span className="font-mono text-xs uppercase tracking-widest text-primary font-bold mb-1">NO ACTIVE PROTOCOLS FOUND</span>
              <h2 className="text-xl font-bold text-on-surface font-heading mb-2">No experiments created yet</h2>
              <p className="text-sm text-on-surface-variant max-w-md mb-6 leading-relaxed">
                Design your first sub-millisecond cognitive task or load a pre-configured template (Stroop, Go/No-Go, N-Back) with zero code. All experiments feature automated hardware clock synchronization.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="px-5 py-2.5 bg-primary hover:bg-emerald-700 text-white font-mono text-xs uppercase tracking-wider font-semibold rounded-lg shadow-sm flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>+ Create Your First Experiment</span>
                </button>
                <button
                  onClick={() => {
                    setDevState('populated');
                    setCategoryFilter('all');
                    showToast('Loaded Seeded Stroop Demo');
                  }}
                  className="px-5 py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-mono text-xs uppercase tracking-wider rounded-lg border border-surface-container transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">model_training</span>
                  <span>Load Seeded Demo (Stroop Reaction Time)</span>
                </button>
              </div>
            </FadeIn>
          ) : viewMode === 'table' ? (
            /* Table View */
            <FadeIn delay={100} className="w-full bg-surface-container-lowest rounded-xl border border-surface-container shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[980px]">
                  <thead>
                    <tr className="bg-surface-container-low font-mono text-xs text-on-surface-variant uppercase tracking-wider border-b border-surface-container">
                      <th className="py-3 px-5 font-semibold">Experiment ID &amp; Title</th>
                      <th className="py-3 px-5 font-semibold">Paradigm / Engine</th>
                      <th className="py-3 px-5 font-semibold">Status</th>
                      <th className="py-3 px-5 font-semibold">Participants / Quota</th>
                      <th className="py-3 px-5 font-semibold">Mean RT &amp; Jitter</th>
                      <th className="py-3 px-5 font-semibold">Telemetry Activity</th>
                      <th className="py-3 px-5 text-right font-semibold">Direct Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container text-sm">
                    {filteredExperiments.map(exp => (
                      <tr key={exp.id} className="group hover:bg-surface-container-low/60 transition-colors">
                        {/* Title & ID */}
                        <td className="py-4 px-5">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-emerald-700 font-bold uppercase tracking-wider">{exp.id}</span>
                              <span className="px-1.5 py-0.5 bg-surface-container text-on-surface-variant font-mono text-[10px] rounded uppercase font-semibold">
                                {exp.version}
                              </span>
                            </div>
                            <span className="font-heading font-semibold text-on-surface text-[15px] group-hover:text-emerald-600 transition-colors">
                              {exp.title}
                            </span>
                          </div>
                        </td>

                        {/* Paradigm */}
                        <td className="py-4 px-5">
                          <div className="flex flex-col">
                            <span className="font-medium text-on-surface text-sm">{exp.paradigm}</span>
                            <span className="text-xs text-on-surface-variant font-mono">{exp.engine}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-5">
                          {exp.status === 'published' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[11px] uppercase font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>Published</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[11px] uppercase font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              <span>Draft</span>
                            </span>
                          )}
                        </td>

                        {/* Participants */}
                        <td className="py-4 px-5">
                          {exp.customParticipantText ? (
                            <span className="text-xs text-on-surface-variant italic font-sans">{exp.customParticipantText}</span>
                          ) : (
                            <div className="flex flex-col gap-1.5 w-40">
                              <div className="flex items-baseline justify-between font-mono text-xs">
                                <span className="font-bold text-on-surface">{exp.participants} / {exp.quota}</span>
                                <span className="text-emerald-700 font-bold">{exp.pct}%</span>
                              </div>
                              <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                                <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${exp.pct}%` }}></div>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Mean RT & Jitter */}
                        <td className="py-4 px-5 font-mono text-xs">
                          <div className="flex flex-col">
                            <span className="font-bold text-on-surface text-sm">{exp.meanRt}</span>
                            {exp.jitter && <span className="text-on-surface-variant text-[11px]">Jitter: {exp.jitter}</span>}
                          </div>
                        </td>

                        {/* Telemetry Activity */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                            <span className={`w-1.5 h-1.5 rounded-full ${exp.status === 'published' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            <span>{exp.activity}</span>
                          </div>
                        </td>

                        {/* Direct Actions */}
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => navigate('/builder')}
                              className="px-2.5 py-1 bg-surface-container hover:bg-surface-container-high font-mono text-xs uppercase tracking-wider text-on-surface rounded border border-surface-container transition-colors"
                              title="Edit Protocol"
                            >
                              Edit
                            </button>

                            {exp.status === 'published' ? (
                              <>
                                <button
                                  onClick={() => navigate('/results')}
                                  className="px-2.5 py-1 bg-surface-container-high hover:bg-surface-container-highest font-mono text-xs uppercase tracking-wider text-emerald-700 font-bold rounded border border-surface-container transition-colors"
                                  title="View Results"
                                >
                                  Results
                                </button>
                                <button
                                  onClick={() => handleCopy(exp.shareUrl)}
                                  className="p-1 hover:bg-surface-container text-on-surface-variant hover:text-on-surface rounded transition-colors"
                                  title="Copy Runner Share Link"
                                >
                                  <span className="material-symbols-outlined text-[18px]">share</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handlePublish(exp)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs uppercase tracking-wider font-bold rounded shadow-xs flex items-center gap-1 transition-all"
                                  title="Publish Protocol"
                                >
                                  <span className="material-symbols-outlined text-[14px]">rocket_launch</span>
                                  <span>Publish</span>
                                </button>
                                <button
                                  onClick={() => navigate('/runner')}
                                  className="px-2 py-1 bg-surface-container hover:bg-surface-container-high font-mono text-xs uppercase tracking-wider text-on-surface rounded transition-colors"
                                  title="Launch in Runner Sandbox"
                                >
                                  Runner
                                </button>
                              </>
                            )}

                            <div className="relative">
                              <button
                                onClick={() => setActiveMenuId(activeMenuId === exp.id ? null : exp.id)}
                                className="p-1 hover:bg-surface-container text-on-surface-variant hover:text-on-surface rounded transition-colors"
                              >
                                <span className="material-symbols-outlined text-[18px]">more_vert</span>
                              </button>
                              {activeMenuId === exp.id && (
                                <div className="absolute right-0 top-8 z-30 w-44 bg-surface-container-lowest rounded-lg border border-surface-container shadow-xl py-1 text-left font-mono text-xs">
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      navigate('/builder');
                                    }}
                                    className="w-full px-3 py-1.5 hover:bg-surface-container flex items-center gap-2 text-on-surface"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                    <span>Open Visual Builder</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      navigate('/runner');
                                    }}
                                    className="w-full px-3 py-1.5 hover:bg-surface-container flex items-center gap-2 text-on-surface"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                                    <span>Run Test Session</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      showToast(`Exported ${exp.id} spec JSON`);
                                    }}
                                    className="w-full px-3 py-1.5 hover:bg-surface-container flex items-center gap-2 text-on-surface"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">download</span>
                                    <span>Export JSON Spec</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer */}
              <div className="px-5 py-3 bg-surface-container-low border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-on-surface-variant">
                <div>
                  Displaying {filteredExperiments.length} of {experiments.length} active/draft protocols | Storage utilized: 1.24 GB / 50 GB
                </div>
                <div className="flex items-center gap-1">
                  <button className="px-2.5 py-1 bg-surface-container-lowest border border-surface-container rounded hover:bg-surface-container transition-colors disabled:opacity-40" disabled>
                    PREVIOUS
                  </button>
                  <button className="px-2.5 py-1 bg-primary text-white font-bold rounded">1</button>
                  <button className="px-2.5 py-1 bg-surface-container-lowest border border-surface-container rounded hover:bg-surface-container transition-colors">2</button>
                  <button className="px-2.5 py-1 bg-surface-container-lowest border border-surface-container rounded hover:bg-surface-container transition-colors">
                    NEXT
                  </button>
                </div>
              </div>
            </FadeIn>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredExperiments.map((exp, idx) => (
                <FadeIn key={exp.id} delay={((idx % 3) + 1) * 100} className="h-full">
                  <div className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-emerald-700 font-bold uppercase tracking-wider">{exp.id}</span>
                          <span className="px-1.5 py-0.5 bg-surface-container text-on-surface-variant font-mono text-[10px] rounded uppercase font-semibold">
                            {exp.version}
                          </span>
                        </div>
                        {exp.status === 'published' ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] uppercase font-bold">
                            Published
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[10px] uppercase font-bold">
                            Draft
                          </span>
                        )}
                      </div>
                      <h3 className="font-heading font-bold text-on-surface text-base mb-1">{exp.title}</h3>
                      <p className="text-xs text-on-surface-variant font-mono mb-4">{exp.paradigm} • {exp.engine}</p>

                      <div className="bg-surface-container-low p-3 rounded-lg mb-4 text-xs font-mono">
                        <div className="flex justify-between mb-1">
                          <span className="text-on-surface-variant">Mean RT:</span>
                          <span className="font-bold text-on-surface">{exp.meanRt}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Participants:</span>
                          <span className="font-bold text-on-surface">{exp.participants} / {exp.quota || '—'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-surface-container text-xs font-mono">
                      <span className="text-on-surface-variant text-[11px]">{exp.activity}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => navigate('/builder')}
                          className="px-2.5 py-1 bg-surface-container hover:bg-surface-container-high rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => navigate(exp.status === 'published' ? '/results' : '/runner')}
                          className="px-2.5 py-1 bg-primary text-white font-bold rounded"
                        >
                          {exp.status === 'published' ? 'Results' : 'Test'}
                        </button>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface-container-low border-t border-surface-container">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-on-surface-variant">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="px-2 py-0.5 bg-surface-container-lowest text-on-surface uppercase tracking-wider font-semibold rounded border border-surface-container">
              Manova Labs
            </span>
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <span>© 2025 Manova Labs Inc.</span>
            <div className="flex items-center gap-4">
              <Link to="/science" className="hover:text-emerald-600 transition-colors uppercase tracking-wider">
                STATUS
              </Link>
              <Link to="/results" className="hover:text-emerald-600 transition-colors uppercase tracking-wider">
                GOVERNANCE
              </Link>
              <Link to="/science" className="hover:text-emerald-600 transition-colors uppercase tracking-wider">
                DOCS
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal: Publish / Dispatch Armed */}
      {publishModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest max-w-lg w-full p-6 rounded-2xl shadow-2xl border border-surface-container relative animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
                  <span className="material-symbols-outlined text-[22px]">rocket_launch</span>
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-on-surface">Experiment Ready for Deployment</h3>
                  <span className="font-mono text-xs text-emerald-600 uppercase tracking-wider font-bold">TOKEN GENERATED • NODE SYNCHRONIZED</span>
                </div>
              </div>
              <button
                onClick={() => setPublishModal({ open: false, experiment: null })}
                className="p-1 hover:bg-surface-container text-on-surface-variant rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-sm text-on-surface-variant mb-4 leading-relaxed">
              Experiment <span className="font-bold text-on-surface">{publishModal.experiment?.title}</span> is now armed. Direct participant telemetry streams will record to Stanford Vault #492.
            </p>

            <div className="bg-surface-container-low p-4 rounded-xl border border-surface-container mb-4">
              <span className="font-mono text-xs text-on-surface-variant uppercase tracking-wider block mb-1.5 font-semibold">
                PARTICIPANT DISPATCH LINK:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={publishModal.experiment?.shareUrl || 'https://manova.app/run/MANOVA-7749-STROOP'}
                  className="bg-surface-container-lowest px-3 py-2 rounded-lg font-mono text-xs text-on-surface w-full border border-surface-container focus:outline-none select-all"
                />
                <button
                  onClick={() => handleCopy(publishModal.experiment?.shareUrl || 'https://manova.app/run/MANOVA-7749-STROOP')}
                  className="px-4 py-2 bg-primary hover:bg-emerald-700 text-white font-mono text-xs uppercase font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span> Copy
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6 text-xs font-mono bg-surface-container-low p-3.5 rounded-xl border border-surface-container">
              <div><span className="text-on-surface-variant">Sampling Rate:</span> <span className="font-bold text-on-surface">1,000 Hz</span></div>
              <div><span className="text-on-surface-variant">Stimulus Accuracy:</span> <span className="font-bold text-on-surface">Sub-millisecond</span></div>
              <div><span className="text-on-surface-variant">IRB Clearance:</span> <span className="font-bold text-emerald-600">#APPROVED</span></div>
              <div><span className="text-on-surface-variant">Target Quota:</span> <span className="font-bold text-on-surface">Unlimited</span></div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setPublishModal({ open: false, experiment: null })}
                className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-mono text-xs uppercase tracking-wider rounded-lg"
              >
                Close
              </button>
              <button
                onClick={() => navigate('/runner')}
                className="px-4 py-2 bg-primary text-white hover:bg-emerald-700 font-mono text-xs uppercase tracking-wider font-bold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span> Test in Runner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Experiment */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest max-w-xl w-full p-6 rounded-2xl shadow-2xl border border-surface-container relative animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm">
                  <span className="material-symbols-outlined text-[22px]">science</span>
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-on-surface">Create Cognitive Protocol</h3>
                  <span className="font-mono text-xs text-primary uppercase tracking-wider font-semibold">SELECT TEMPLATE OR COMPOSE SCRATCH</span>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 hover:bg-surface-container text-on-surface-variant rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="font-mono text-xs text-on-surface uppercase tracking-wider block mb-1.5 font-semibold">
                  Experiment Protocol Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Attentional Blink & Temporal Dynamics Assays"
                  className="w-full bg-surface-container-low px-4 py-2.5 rounded-lg text-on-surface text-sm border border-surface-container focus:bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="font-mono text-xs text-on-surface uppercase tracking-wider block mb-1.5 font-semibold">
                  Base Paradigm Preset
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateModalOpen(false);
                      navigate('/builder');
                    }}
                    className="p-3 text-left bg-surface-container-high hover:bg-surface-container-highest border border-surface-container rounded-lg transition-colors group"
                  >
                    <span className="font-heading text-xs text-on-surface block font-bold group-hover:text-primary">Visual Stroop (Word/Color)</span>
                    <span className="text-[11px] text-on-surface-variant font-mono">Inhibition &amp; Interference</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateModalOpen(false);
                      navigate('/builder');
                    }}
                    className="p-3 text-left bg-surface-container-low hover:bg-surface-container-high border border-surface-container rounded-lg transition-colors group"
                  >
                    <span className="font-heading text-xs text-on-surface block font-bold group-hover:text-primary">Go / No-Go Sustained</span>
                    <span className="text-[11px] text-on-surface-variant font-mono">Impulse control &amp; vigilance</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateModalOpen(false);
                      navigate('/builder');
                    }}
                    className="p-3 text-left bg-surface-container-low hover:bg-surface-container-high border border-surface-container rounded-lg transition-colors group"
                  >
                    <span className="font-heading text-xs text-on-surface block font-bold group-hover:text-primary">N-Back Working Memory</span>
                    <span className="text-[11px] text-on-surface-variant font-mono">Multi-modal load staircase</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateModalOpen(false);
                      navigate('/builder');
                    }}
                    className="p-3 text-left bg-surface-container-low hover:bg-surface-container-high border border-surface-container rounded-lg transition-colors group"
                  >
                    <span className="font-heading text-xs text-on-surface block font-bold group-hover:text-primary">Blank Canvas (DSL)</span>
                    <span className="text-[11px] text-on-surface-variant font-mono">Raw JSON state machine</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-surface-container text-xs font-mono">
                <span className="text-on-surface-variant">Auto-allocates node cluster latency test</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 bg-surface-container text-on-surface uppercase rounded-lg hover:bg-surface-container-high"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateModalOpen(false);
                      navigate('/builder');
                    }}
                    className="px-4 py-2 bg-primary hover:bg-emerald-700 text-white uppercase font-bold rounded-lg transition-colors"
                  >
                    Initialize Protocol
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Import Protocol JSON */}
      {seedModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest max-w-xl w-full p-6 rounded-2xl shadow-2xl border border-surface-container relative animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary shadow-sm">
                  <span className="material-symbols-outlined text-[22px]">code</span>
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-on-surface">Import Protocol Specification</h3>
                  <span className="font-mono text-xs text-on-surface-variant uppercase tracking-wider font-semibold">PASTE JSON OR DROP FILE</span>
                </div>
              </div>
              <button
                onClick={() => setSeedModalOpen(false)}
                className="p-1 hover:bg-surface-container text-on-surface-variant rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-surface-container-low p-3 rounded-xl border border-surface-container font-mono text-xs text-on-surface-variant">
                Supports schema v3.2 Manova Protocol JSON (trials, stimuli, timings, branching logic, and randomization seeds).
              </div>

              <textarea
                rows={8}
                defaultValue={`{
  "name": "Rapid Visual ERP & P300 Neural Synchronization",
  "trials": 64,
  "sampling": "1000Hz",
  "randomization": "seeded",
  "seed": 49204,
  "branching": true
}`}
                className="w-full bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-xs border border-slate-800 focus:outline-none focus:border-emerald-500"
              />

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSeedModalOpen(false)}
                  className="px-4 py-2 bg-surface-container text-on-surface font-mono text-xs uppercase rounded-lg hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSeedModalOpen(false);
                    showToast('Imported Protocol JSON successfully!');
                    navigate('/builder');
                  }}
                  className="px-4 py-2 bg-primary hover:bg-emerald-700 text-white font-mono text-xs uppercase font-bold rounded-lg shadow-sm transition-colors"
                >
                  Validate &amp; Open in Builder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
