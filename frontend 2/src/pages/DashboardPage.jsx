import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import FadeIn from '../components/FadeIn';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Component State for live data
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters and UI Controls
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'published' | 'draft'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('modified');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [toastMessage, setToastMessage] = useState(null);

  // Modals state
  const [publishModal, setPublishModal] = useState({ open: false, experiment: null });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newProtocolTitle, setNewProtocolTitle] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('Visual Stroop (Word/Color)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text);
    showToast('Participant link copied to clipboard!');
  };

  // Fetch experiments on mount and whenever user resolves with Authorization Bearer header
  const fetchUserExperiments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = user?.id || user?.email ? { user_id: user.id || user.email, email: user.email } : undefined;
      const res = await api.experiments.list(query);
      
      // Response Parsing: handle res.data, res.data.experiments, res.experiments, or direct array
      const rawList = Array.isArray(res)
        ? res
        : Array.isArray(res?.experiments)
        ? res.experiments
        : Array.isArray(res?.data?.experiments)
        ? res.data.experiments
        : Array.isArray(res?.data)
        ? res.data
        : [];

      const mapped = rawList.map((exp) => {
        const rawStatus = (exp.status || 'draft').toLowerCase();
        const preset = exp.preset || exp.config?.preset || exp.paradigm || 'Visual Stroop';
        const createdAt = exp.created_at || exp.createdAt || new Date().toISOString();
        return {
          id: exp.id,
          publicSlug: exp.publicSlug,
          version: 'v' + (exp.version || 1),
          isDraft: rawStatus === 'draft',
          title: exp.title || 'Untitled Protocol',
          preset,
          paradigm: preset,
          description: exp.description || `Sub-millisecond ${preset} cognitive assay.`,
          engine: 'High-frequency 144Hz WebGL',
          status: rawStatus,
          created_at: createdAt,
          createdAt,
          participants: exp.trialCount || exp._count?.trials || exp._count?.sessions || 0,
          quota: 100,
          pct: 0,
          meanRt: '-',
          jitter: '±0.08 ms',
          activity: createdAt ? new Date(createdAt).toLocaleDateString() : 'Active',
          shareUrl: `${window.location.origin}/run/${exp.publicSlug || exp.id}`,
        };
      });
      setExperiments(mapped);
    } catch (err) {
      console.error('Failed to fetch user experiments from REST API', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to backend service.');
      setExperiments([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    fetchUserExperiments();
  }, [fetchUserExperiments]);

  // Handle Create Experiment (POST /api/v1/experiments)
  const handleCreateExperiment = async (overridePreset) => {
    const activePreset = overridePreset || selectedPreset || 'Visual Stroop (Word/Color)';
    const title = newProtocolTitle.trim();

    if (!title) {
      setCreateError('Please provide a protocol title before initializing.');
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);

    const experimentId = crypto.randomUUID();
    const trialId = crypto.randomUUID();
    const stimId = crypto.randomUUID();

    const slug =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 36) +
      '-' +
      Math.floor(100 + Math.random() * 900);

    // Generate initial trial block starting with positive orderIndex: 1
    const generateTrialsForPreset = () => {
      if (activePreset.includes('Go / No-Go')) {
        return [
          {
            id: trialId,
            orderIndex: 1,
            label: 'Trial 1 - Go Stimulus',
            instructions: 'Press SPACE when you see GREEN "X". Do not press for other letters.',
            fixation: { enabled: true, durationMs: 400, symbol: '+' },
            stimulus: {
              id: stimId,
              type: 'text',
              content: 'X',
              styling: { color: '#10B981', fontSize: '64px' },
            },
            timingConfig: {
              preStimulusDelayMs: 400,
              stimulusDurationMs: 1000,
              responseTimeoutMs: 1500,
              allowEarlyResponse: false,
              waitForResponse: true,
            },
            expectedResponse: {
              type: 'keypress',
              allowedKeys: ['Space'],
              correctResponse: 'Space',
              evaluationMode: 'exact_match',
            },
            nextTrialId: null,
          },
        ];
      }

      if (activePreset.includes('N-Back')) {
        return [
          {
            id: trialId,
            orderIndex: 1,
            label: 'Trial 1 - Working Memory',
            instructions: 'Press [M] if current letter matches the previous letter.',
            fixation: { enabled: true, durationMs: 500, symbol: '+' },
            stimulus: {
              id: stimId,
              type: 'text',
              content: 'B',
              styling: { color: '#3B82F6', fontSize: '64px' },
            },
            timingConfig: {
              preStimulusDelayMs: 500,
              stimulusDurationMs: 1200,
              responseTimeoutMs: 2000,
              allowEarlyResponse: false,
              waitForResponse: true,
            },
            expectedResponse: {
              type: 'keypress',
              allowedKeys: ['KeyM'],
              correctResponse: 'KeyM',
              evaluationMode: 'exact_match',
            },
            nextTrialId: null,
          },
        ];
      }

      if (activePreset.includes('Blank Canvas')) {
        return [
          {
            id: trialId,
            orderIndex: 1,
            label: 'Block 1 - Step 1',
            instructions: 'Blank protocol canvas initial trial step.',
            fixation: { enabled: true, durationMs: 500, symbol: '+' },
            stimulus: {
              id: stimId,
              type: 'text',
              content: 'START',
              styling: { color: '#10B981', fontSize: '48px' },
            },
            timingConfig: {
              preStimulusDelayMs: 500,
              stimulusDurationMs: 1000,
              responseTimeoutMs: 2000,
              allowEarlyResponse: false,
              waitForResponse: true,
            },
            expectedResponse: {
              type: 'keypress',
              allowedKeys: ['Space', 'KeyD'],
              correctResponse: 'Space',
              evaluationMode: 'exact_match',
            },
            nextTrialId: null,
          },
        ];
      }

      // Default: Visual Stroop
      return [
        {
          id: trialId,
          orderIndex: 1,
          label: 'Trial 1 - Stroop Incongruent',
          instructions: 'Identify ink color of target words using keys [D], [F], [J], [K]. Ignore semantic text meaning.',
          fixation: { enabled: true, durationMs: 500, symbol: '+' },
          stimulus: {
            id: stimId,
            type: 'text',
            content: 'RED',
            styling: { color: '#10B981', fontSize: '48px' },
          },
          timingConfig: {
            preStimulusDelayMs: 500,
            stimulusDurationMs: 1500,
            responseTimeoutMs: 2500,
            allowEarlyResponse: false,
            waitForResponse: true,
          },
          expectedResponse: {
            type: 'keypress',
            allowedKeys: ['KeyD', 'KeyF', 'KeyJ', 'KeyK'],
            correctResponse: 'KeyD',
            evaluationMode: 'exact_match',
          },
          nextTrialId: null,
        },
      ];
    };

    try {
      showToast('Initializing protocol on server...');
      const created = await api.experiments.create({
        id: experimentId,
        title,
        preset: activePreset,
        status: 'DRAFT',
        description: `Sub-millisecond ${activePreset} cognitive assay.`,
        publicSlug: slug,
        config: {
          displayMode: 'fullscreen',
          backgroundColor: '#0F172A',
          allowPause: false,
          showFeedback: true,
          preset: activePreset,
        },
        trials: generateTrialsForPreset(),
      });

      const rawStatus = (created.status || 'draft').toLowerCase();
      const preset = created.preset || activePreset;
      const createdAt = created.created_at || created.createdAt || new Date().toISOString();
      const newExp = {
        id: created.id,
        publicSlug: created.publicSlug,
        version: 'v' + (created.version || 1),
        isDraft: rawStatus === 'draft',
        title: created.title,
        preset,
        paradigm: preset,
        description: created.description,
        engine: 'High-frequency 144Hz WebGL',
        status: rawStatus,
        created_at: createdAt,
        createdAt,
        participants: 0,
        quota: 100,
        pct: 0,
        meanRt: '-',
        jitter: '±0.08 ms',
        activity: 'Just now',
        shareUrl: `${window.location.origin}/run/${created.publicSlug || created.id}`,
      };

      // Immediately update local state array and re-invoke fetchUserExperiments
      setExperiments((prev) => [newExp, ...prev.filter((e) => e.id !== newExp.id)]);
      fetchUserExperiments();
      setCreateModalOpen(false);
      setNewProtocolTitle('');
      setCreateError(null);
      showToast(`Protocol created: ${created.title}`);

      // Redirect user directly to the Protocol Builder for the new experiment
      const targetId = created.id || experimentId;
      navigate(`/builder/${targetId}`);
    } catch (err) {
      console.error('Create experiment failed', err);
      const msg = err instanceof Error ? err.message : 'Server error occurred.';
      setCreateError(msg);
      showToast(`Create failed: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Publish Experiment (POST /api/v1/experiments/:id/publish)
  const handlePublish = async (exp) => {
    try {
      showToast(`Publishing protocol ${exp.id}...`);
      await api.experiments.publish(exp.id);
      setExperiments((prev) =>
        prev.map((item) =>
          item.id === exp.id
            ? { ...item, status: 'published', isDraft: false, version: 'v1.0' }
            : item
        )
      );
      setPublishModal({ open: true, experiment: { ...exp, status: 'published', isDraft: false } });
      showToast(`Protocol ${exp.title} armed & published!`);
    } catch (err) {
      console.error('Publish API failed', err);
      showToast(`Publish failed: ${err instanceof Error ? err.message : 'Error'}`);
    }
  };

  // Handle Delete Experiment (DELETE /api/v1/experiments/:id)
  const handleDeleteExperiment = async (id, title) => {
    if (!window.confirm(`Delete protocol "${title || id}"? This action cannot be undone.`)) {
      return;
    }
    try {
      showToast('Deleting protocol...');
      await api.experiments.delete(id, true);
      setExperiments((prev) => prev.filter((e) => e.id !== id));
      setActiveMenuId(null);
      showToast('Protocol deleted from database.');
    } catch (err) {
      console.error('Delete failed', err);
      showToast(`Delete failed: ${err instanceof Error ? err.message : 'Error'}`);
    }
  };

  // Filtered & Sorted Experiments
  const filteredExperiments = useMemo(() => {
    return experiments
      .filter((exp) => {
        if (categoryFilter === 'published' && exp.status !== 'published') return false;
        if (categoryFilter === 'draft' && exp.status !== 'draft') return false;

        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchesTitle = exp.title.toLowerCase().includes(query);
          const matchesId = exp.id.toLowerCase().includes(query);
          const matchesParadigm = exp.paradigm.toLowerCase().includes(query);
          if (!matchesTitle && !matchesId && !matchesParadigm) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'participants') return b.participants - a.participants;
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        return 0;
      });
  }, [experiments, categoryFilter, searchQuery, sortBy]);

  const publishedCount = experiments.filter((e) => e.status === 'published').length;
  const draftCount = experiments.filter((e) => e.status === 'draft').length;

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans text-on-surface">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-lg shadow-2xl font-mono text-xs uppercase tracking-wider flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Live Authenticated User Header */}
      <Header current="dashboard" />

      {/* Main Container */}
      <main className="flex-1 w-full bg-surface pb-16 pt-16">
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
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono uppercase tracking-wider font-bold shadow-md hover:shadow-lg shadow-emerald-700/20 flex items-center gap-2 rounded-lg transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>+ Create Experiment</span>
              </button>
            </div>
          </FadeIn>

          {/* Error Banner with Retry */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-rose-600">error</span>
                <span>{error}</span>
              </div>
              <button
                onClick={fetchExperiments}
                className="px-3 py-1 bg-rose-600 text-white rounded font-mono text-xs uppercase hover:bg-rose-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Conditional Views: Loading Skeleton, Empty State, or Live Populated List */}
          {loading ? (
            /* Loading Skeleton / Spinner State */
            <div className="w-full bg-surface-container-lowest rounded-xl border border-surface-container p-12 flex flex-col items-center justify-center text-center shadow-xs">
              <span className="w-10 h-10 rounded-full border-3 border-emerald-500 border-t-transparent animate-spin mb-4"></span>
              <h3 className="font-heading font-bold text-lg text-on-surface">Fetching User Protocols</h3>
              <p className="text-xs font-mono text-on-surface-variant max-w-sm mt-1">
                Authenticating session token &amp; loading experiment records from backend...
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-8 max-w-4xl">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-44 bg-surface-container-low rounded-xl animate-pulse"></div>
                ))}
              </div>
            </div>
          ) : experiments.length === 0 ? (
            /* Empty State UI */
            <FadeIn delay={100} className="w-full bg-surface-container-lowest rounded-xl border border-surface-container p-12 flex flex-col items-center justify-center text-center shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center text-on-surface-variant mb-4">
                <span className="material-symbols-outlined text-[36px]">science</span>
              </div>
              <h3 className="font-heading font-bold text-xl text-on-surface">No experiments found</h3>
              <p className="text-sm text-on-surface-variant max-w-md mt-1 mb-6">
                You have not created any cognitive protocols yet. Click '+ CREATE EXPERIMENT' to launch your first protocol.
              </p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono uppercase tracking-wider font-bold shadow-md rounded-lg flex items-center gap-2 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>+ CREATE EXPERIMENT</span>
              </button>
            </FadeIn>
          ) : (
            /* Live Populated View */
            <div className="flex flex-col gap-6">
              {/* Filter Tabs & Search Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-surface-container">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setCategoryFilter('all')}
                    className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-lg transition-colors ${
                      categoryFilter === 'all'
                        ? 'bg-surface-container-high text-on-surface font-bold border border-surface-container'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                    }`}
                  >
                    All Protocols ({experiments.length})
                  </button>
                  <button
                    onClick={() => setCategoryFilter('published')}
                    className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-lg transition-colors ${
                      categoryFilter === 'published'
                        ? 'bg-surface-container-high text-emerald-700 font-bold border border-surface-container'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                    }`}
                  >
                    Published ({publishedCount})
                  </button>
                  <button
                    onClick={() => setCategoryFilter('draft')}
                    className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-lg transition-colors ${
                      categoryFilter === 'draft'
                        ? 'bg-surface-container-high text-amber-700 font-bold border border-surface-container'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                    }`}
                  >
                    Drafts ({draftCount})
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                      search
                    </span>
                    <input
                      type="text"
                      placeholder="Search title, ID, paradigm..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-surface-container-low text-on-surface text-xs font-mono pl-9 pr-3 py-2 rounded-lg border border-surface-container focus:outline-none focus:ring-1 focus:ring-emerald-500 w-56 sm:w-64"
                    />
                  </div>

                  <div className="flex items-center border border-surface-container rounded-lg p-0.5 bg-surface-container-low">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded transition-colors ${
                        viewMode === 'grid' ? 'bg-white shadow-xs text-on-surface' : 'text-on-surface-variant'
                      }`}
                      title="Grid View"
                    >
                      <span className="material-symbols-outlined text-[18px]">grid_view</span>
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`p-1.5 rounded transition-colors ${
                        viewMode === 'table' ? 'bg-white shadow-xs text-on-surface' : 'text-on-surface-variant'
                      }`}
                      title="Table View"
                    >
                      <span className="material-symbols-outlined text-[18px]">view_list</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid Cards View */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredExperiments.map((exp) => (
                    <FadeIn key={exp.id} className="h-full">
                      <div className="bg-surface-container-lowest rounded-xl border border-surface-container p-6 flex flex-col justify-between h-full shadow-xs hover:shadow-md transition-shadow relative group">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs text-on-surface-variant uppercase font-semibold">
                              {exp.id}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold ${
                                  exp.status === 'published'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {exp.status}
                              </span>
                              <span className="font-mono text-[10px] text-on-surface-variant px-1.5 py-0.5 bg-surface-container-low rounded">
                                {exp.version}
                              </span>
                            </div>
                          </div>

                          <h3 className="font-heading font-bold text-lg text-on-surface group-hover:text-emerald-700 transition-colors">
                            {exp.title}
                          </h3>

                          <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                            {exp.description}
                          </p>

                          <div className="flex items-center gap-2 pt-2 border-t border-surface-container text-xs font-mono text-on-surface-variant">
                            <span className="material-symbols-outlined text-[16px] text-emerald-600">group</span>
                            <span>{exp.participants} sessions recorded</span>
                          </div>
                        </div>

                        {/* Card Action Buttons (Dynamic IDs) */}
                        <div className="flex items-center justify-between pt-4 mt-4 border-t border-surface-container">
                          <span className="font-mono text-[11px] text-on-surface-variant">{exp.activity}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/builder/${exp.id}`)}
                              className="px-2.5 py-1 bg-surface-container hover:bg-surface-container-high text-xs font-mono uppercase tracking-wider rounded transition-colors"
                              title="Edit Protocol Definition"
                            >
                              Edit
                            </button>

                            {exp.status === 'published' ? (
                              <button
                                onClick={() => navigate(`/results/${exp.id}`)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono uppercase tracking-wider font-bold rounded transition-colors"
                              >
                                Results
                              </button>
                            ) : (
                              <button
                                onClick={() => handlePublish(exp)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono uppercase tracking-wider font-bold rounded transition-colors flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[14px]">rocket_launch</span>
                                <span>Publish</span>
                              </button>
                            )}

                            <button
                              onClick={() => navigate(`/run/${exp.publicSlug || exp.id}`)}
                              className="px-2.5 py-1 bg-surface-container-high hover:bg-surface-container-highest text-xs font-mono uppercase tracking-wider text-emerald-700 font-bold rounded transition-colors"
                              title="Execute in Test Runner"
                            >
                              Test
                            </button>

                            <button
                              onClick={() => handleDeleteExperiment(exp.id, exp.title)}
                              className="p-1 hover:bg-rose-50 text-on-surface-variant hover:text-rose-600 rounded transition-colors"
                              title="Delete Protocol"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </FadeIn>
                  ))}
                </div>
              ) : (
                /* Table View */
                <div className="w-full bg-surface-container-lowest rounded-xl border border-surface-container overflow-x-auto shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-surface-container bg-surface-container-low font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">
                        <th className="py-3 px-4">Protocol ID</th>
                        <th className="py-3 px-4">Title</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Sessions</th>
                        <th className="py-3 px-4">Last Activity</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container font-mono text-xs">
                      {filteredExperiments.map((exp) => (
                        <tr key={exp.id} className="hover:bg-surface-container-low/50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-on-surface">{exp.id}</td>
                          <td className="py-3 px-4 font-sans font-medium text-on-surface max-w-xs truncate">
                            {exp.title}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold ${
                                exp.status === 'published'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {exp.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-on-surface-variant">{exp.participants}</td>
                          <td className="py-3 px-4 text-on-surface-variant">{exp.activity}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => navigate(`/builder/${exp.id}`)}
                                className="px-2 py-1 bg-surface-container hover:bg-surface-container-high rounded"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => navigate(`/run/${exp.publicSlug || exp.id}`)}
                                className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded"
                              >
                                Test
                              </button>
                              {exp.status === 'published' ? (
                                <button
                                  onClick={() => navigate(`/results/${exp.id}`)}
                                  className="px-2 py-1 bg-emerald-600 text-white rounded font-bold"
                                >
                                  Results
                                </button>
                              ) : (
                                <button
                                  onClick={() => handlePublish(exp)}
                                  className="px-2 py-1 bg-emerald-600 text-white rounded font-bold"
                                >
                                  Publish
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteExperiment(exp.id, exp.title)}
                                className="p-1 hover:text-rose-600 text-on-surface-variant rounded"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal: Publish Protocol */}
      {publishModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest max-w-lg w-full p-6 rounded-2xl shadow-2xl border border-surface-container relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">rocket_launch</span>
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-on-surface">Protocol Published</h3>
                <span className="font-mono text-xs text-emerald-600 uppercase tracking-wider font-semibold">
                  ARMED FOR DIRECT PARTICIPANT RUNS
                </span>
              </div>
            </div>

            <p className="text-sm text-on-surface-variant mb-4">
              Protocol <span className="font-bold text-on-surface">{publishModal.experiment?.title}</span> is now active. Share this link with participants:
            </p>

            <div className="flex items-center gap-2 mb-6">
              <input
                type="text"
                readOnly
                value={publishModal.experiment?.shareUrl}
                className="flex-1 bg-surface-container-low px-3 py-2 text-xs font-mono rounded-lg border border-surface-container text-on-surface"
              />
              <button
                onClick={() => handleCopy(publishModal.experiment?.shareUrl)}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono uppercase font-bold rounded-lg transition-colors"
              >
                Copy
              </button>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setPublishModal({ open: false, experiment: null })}
                className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-xs font-mono uppercase rounded-lg"
              >
                Close
              </button>
              <button
                onClick={() => navigate(`/run/${publishModal.experiment?.publicSlug || publishModal.experiment?.id}`)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono uppercase font-bold rounded-lg"
              >
                Test in Runner
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
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
                  <span className="material-symbols-outlined text-[22px]">science</span>
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-on-surface">Create Cognitive Protocol</h3>
                  <span className="font-mono text-xs text-emerald-600 uppercase tracking-wider font-semibold">
                    POST /API/V1/EXPERIMENTS
                  </span>
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
                  Protocol Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProtocolTitle}
                  onChange={(e) => {
                    setNewProtocolTitle(e.target.value);
                    if (createError) setCreateError(null);
                  }}
                  placeholder="e.g. Attentional Blink & Temporal Dynamics Assays"
                  className="w-full bg-surface-container-low px-4 py-2.5 rounded-lg text-on-surface text-sm border border-surface-container focus:bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-mono text-xs text-on-surface uppercase tracking-wider block mb-1.5 font-semibold">
                  Base Paradigm Preset
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedPreset('Visual Stroop (Word/Color)')}
                    className={`p-3 text-left border rounded-lg transition-all group cursor-pointer ${
                      selectedPreset === 'Visual Stroop (Word/Color)'
                        ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/30'
                        : 'bg-surface-container-low hover:bg-surface-container border-surface-container'
                    }`}
                  >
                    <span className="font-heading text-xs text-on-surface block font-bold group-hover:text-emerald-700">
                      Visual Stroop
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-mono">Word &amp; ink color interference</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPreset('Go / No-Go Sustained Attention')}
                    className={`p-3 text-left border rounded-lg transition-all group cursor-pointer ${
                      selectedPreset === 'Go / No-Go Sustained Attention'
                        ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/30'
                        : 'bg-surface-container-low hover:bg-surface-container border-surface-container'
                    }`}
                  >
                    <span className="font-heading text-xs text-on-surface block font-bold group-hover:text-emerald-700">
                      Go / No-Go
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-mono">Impulse control &amp; vigilance</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPreset('N-Back Working Memory Protocol')}
                    className={`p-3 text-left border rounded-lg transition-all group cursor-pointer ${
                      selectedPreset === 'N-Back Working Memory Protocol'
                        ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/30'
                        : 'bg-surface-container-low hover:bg-surface-container border-surface-container'
                    }`}
                  >
                    <span className="font-heading text-xs text-on-surface block font-bold group-hover:text-emerald-700">
                      N-Back
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-mono">Multi-modal working memory</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPreset('Blank Canvas Protocol')}
                    className={`p-3 text-left border rounded-lg transition-all group cursor-pointer ${
                      selectedPreset === 'Blank Canvas Protocol'
                        ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/30'
                        : 'bg-surface-container-low hover:bg-surface-container border-surface-container'
                    }`}
                  >
                    <span className="font-heading text-xs text-on-surface block font-bold group-hover:text-emerald-700">
                      Blank Canvas
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-mono">Empty custom state machine</span>
                  </button>
                </div>
              </div>

              {/* Inline Error Message */}
              {createError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-mono flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-rose-600">error</span>
                  <span>{createError}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-surface-container text-xs font-mono">
                <span className="text-on-surface-variant">Allocates schema on server</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setCreateModalOpen(false);
                      setCreateError(null);
                    }}
                    className="px-4 py-2 bg-surface-container text-on-surface uppercase rounded-lg hover:bg-surface-container-high cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!newProtocolTitle.trim() || isSubmitting}
                    onClick={() => handleCreateExperiment()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white uppercase font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {isSubmitting && (
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                    )}
                    <span>{isSubmitting ? 'INITIALIZING...' : 'INITIALIZE PROTOCOL'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
