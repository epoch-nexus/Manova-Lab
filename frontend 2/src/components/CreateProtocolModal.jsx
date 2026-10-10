import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function CreateProtocolModal({ isOpen, onClose, onCreated }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [preset, setPreset] = useState('Visual Stroop (Word/Color)');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleInitialize = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Please provide a protocol title.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const experimentId = crypto.randomUUID();
    const trialId = crypto.randomUUID();
    const stimId = crypto.randomUUID();

    const slug =
      trimmedTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 36) +
      '-' +
      Math.floor(100 + Math.random() * 900);

    // Generate initial trial block starting with positive orderIndex: 1
    const generateTrialsForPreset = () => {
      if (preset.includes('Go / No-Go')) {
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

      if (preset.includes('N-Back')) {
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

      if (preset.includes('Blank Canvas')) {
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
      const payload = {
        id: experimentId,
        title: trimmedTitle,
        preset,
        status: 'DRAFT',
        description: `Sub-millisecond ${preset} cognitive assay.`,
        publicSlug: slug,
        config: {
          displayMode: 'fullscreen',
          backgroundColor: '#0F172A',
          allowPause: false,
          showFeedback: true,
          preset,
        },
        trials: generateTrialsForPreset(),
      };

      const created = await api.experiments.create(payload);

      const rawStatus = (created.status || 'draft').toLowerCase();
      const createdAt = created.created_at || created.createdAt || new Date().toISOString();
      const normalizedCreated = {
        ...created,
        preset: created.preset || preset,
        status: rawStatus,
        created_at: createdAt,
        createdAt,
      };

      setTitle('');
      setError(null);
      if (onCreated) onCreated(normalizedCreated);
      onClose();

      const targetId = created.id || experimentId;
      navigate(`/builder/${targetId}`);
    } catch (err) {
      console.error('Create protocol failed', err);
      setError(err instanceof Error ? err.message : 'Server error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
            onClick={onClose}
            className="p-1 hover:bg-surface-container text-on-surface-variant rounded-lg"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="font-mono text-xs text-on-surface uppercase tracking-wider block mb-1.5 font-semibold">
              Experiment Protocol Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Attentional Blink & Temporal Dynamics Assays"
              className="w-full bg-surface-container-low px-4 py-2.5 rounded-lg text-on-surface text-sm border border-surface-container focus:bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
            />
          </div>

          <div>
            <label className="font-mono text-xs text-on-surface uppercase tracking-wider block mb-1.5 font-semibold">
              Base Paradigm Preset
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { name: 'Visual Stroop', desc: 'Word & ink color interference', val: 'Visual Stroop (Word/Color)' },
                { name: 'Go / No-Go', desc: 'Impulse control & vigilance', val: 'Go / No-Go Sustained Attention' },
                { name: 'N-Back', desc: 'Multi-modal working memory', val: 'N-Back Working Memory Protocol' },
                { name: 'Blank Canvas', desc: 'Empty custom state machine', val: 'Blank Canvas Protocol' },
              ].map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setPreset(item.val)}
                  className={`p-3 text-left border rounded-lg transition-all group cursor-pointer ${
                    preset === item.val
                      ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/30'
                      : 'bg-surface-container-low hover:bg-surface-container border-surface-container'
                  }`}
                >
                  <span className="font-heading text-xs text-on-surface block font-bold group-hover:text-emerald-700">
                    {item.name}
                  </span>
                  <span className="text-[11px] text-on-surface-variant font-mono">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-mono flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-rose-600">error</span>
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-surface-container text-xs font-mono">
            <span className="text-on-surface-variant">Allocates schema on server</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={onClose}
                className="px-4 py-2 bg-surface-container text-on-surface uppercase rounded-lg hover:bg-surface-container-high cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!title.trim() || submitting}
                onClick={handleInitialize}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white uppercase font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {submitting && (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                )}
                <span>{submitting ? 'INITIALIZING...' : 'INITIALIZE PROTOCOL'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
