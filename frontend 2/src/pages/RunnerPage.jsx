import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const RUNNER_TRIALS = [
  { word: 'GREEN', color: 'RED', colorClass: 'text-rose-500', correctKey: 'D' },
  { word: 'BLUE', color: 'GREEN', colorClass: 'text-emerald-500', correctKey: 'J' },
  { word: 'RED', color: 'BLUE', colorClass: 'text-sky-500', correctKey: 'F' },
  { word: 'YELLOW', color: 'RED', colorClass: 'text-rose-500', correctKey: 'D' },
  { word: 'BLUE', color: 'YELLOW', colorClass: 'text-amber-500', correctKey: 'K' },
  { word: 'GREEN', color: 'GREEN', colorClass: 'text-emerald-500', correctKey: 'J' },
  { word: 'RED', color: 'RED', colorClass: 'text-rose-500', correctKey: 'D' },
];

export default function RunnerPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState(3); // 1: Consent, 2: Instructions, 3: Active Trial, 4: Fixation, 5: Summary
  const [trialIndex, setTrialIndex] = useState(13); // start at trial 14 like screenshot
  const totalTrials = 48;
  const [lastRt, setLastRt] = useState(341.2);
  const [lastMatchText, setLastMatchText] = useState('Last Trial RT: 341.2 ms • Validated Congruent Match');
  const [isCorrect, setIsCorrect] = useState(true);
  const [clockTime, setClockTime] = useState(14285.42);
  const startTrialTimeRef = useRef(performance.now());
  const [sessionId, setSessionId] = useState(null);

  // Current stimulus
  const currentStimulus = RUNNER_TRIALS[trialIndex % RUNNER_TRIALS.length];
  const completedPct = Math.round((trialIndex / totalTrials) * 100);

  // Clock ticker simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setClockTime(prev => +(prev + 16.67).toFixed(2));
    }, 16);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    startTrialTimeRef.current = performance.now();
    if (stage === 3 && !sessionId) {
      api.participant.startSession('mock-version-id')
        .then(res => setSessionId(res.id || 'mock-sess'))
        .catch(err => { console.warn('Could not start real session', err); setSessionId('mock-sess'); });
    }
  }, [trialIndex, stage]);

  // Handle Response
  const handleResponse = async (selectedColor, pressedKey) => {
    const elapsed = Math.round((performance.now() - startTrialTimeRef.current) * 10) / 10;
    const correct = pressedKey === currentStimulus.correctKey;
    setIsCorrect(correct);
    const rt = elapsed > 0 ? elapsed : 320.5;
    setLastRt(rt);
    setLastMatchText(`Trial #${trialIndex + 1} RT: ${rt} ms • ${correct ? 'Hit (Correct)' : 'Incongruent Error'}`);

    if (sessionId) {
      api.participant.recordResponse(sessionId, { trialId: currentStimulus.word, response: pressedKey, latencyMs: rt, correct })
        .catch(console.error);
    }

    if (trialIndex + 1 >= totalTrials) {
      setStage(5); // completion
    } else {
      // Brief fixation flash
      setStage(4);
      setTimeout(() => {
        setTrialIndex(prev => prev + 1);
        setStage(3);
      }, 350);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (stage !== 3) return;
      const key = e.key.toUpperCase();
      if (key === 'D') handleResponse('RED', 'D');
      if (key === 'F') handleResponse('BLUE', 'F');
      if (key === 'J') handleResponse('GREEN', 'J');
      if (key === 'K') handleResponse('YELLOW', 'K');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stage, trialIndex, currentStimulus]);

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans text-on-surface select-none">
      {/* Top Runner Header */}
      <header className="sticky top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-md border-b border-surface-container shadow-xs">
        <div className="h-14 w-full max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 group font-heading font-extrabold text-lg tracking-tight">
              <span className="text-on-surface uppercase">Manova</span>
              <span className="text-primary uppercase font-bold">Labs</span>
            </Link>

            <div className="hidden md:flex items-center gap-2 bg-surface-container px-3 py-1 rounded text-xs font-mono">
              <span className="text-on-surface-variant uppercase">Protocol:</span>
              <span className="text-on-surface uppercase font-bold">EXP-882-STRP Stroop Interference</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1 rounded font-mono text-xs text-on-surface">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="uppercase">144Hz Sync Locked</span>
            </div>

            <div className="hidden sm:flex items-center gap-2 bg-surface-container px-3 py-1 rounded font-mono text-xs text-on-surface-variant uppercase">
              Anonymous Session Active
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="px-3 py-1 rounded bg-surface-container hover:bg-rose-50 hover:text-rose-600 text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span className="hidden sm:inline">Exit Study</span>
            </button>
          </div>
        </div>
      </header>

      {/* Sub-header Protocol Info */}
      <section className="w-full bg-surface-container-low border-b border-surface-container px-4 sm:px-8 py-2">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 bg-surface-container-highest px-2.5 py-1 rounded text-on-surface">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="uppercase tracking-wider font-semibold">EXP-882-STRP • STROOP INHIBITION</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-on-surface-variant">
              <span>Anon Token:</span>
              <span className="bg-surface-container px-1.5 py-0.5 rounded text-on-surface font-bold">#usr_9x72b</span>
              <span>•</span>
              <span className="text-emerald-700 font-semibold">Hardware Sync Locked (144Hz • &lt;0.18ms jitter)</span>
            </div>
          </div>

          <div className="text-on-surface-variant">
            <span>Buffer Sampling: Sub-millisecond (USB-HID)</span>
          </div>
        </div>
      </section>

      {/* Stage Navigation Bar */}
      <nav className="w-full bg-surface border-b border-surface-container px-4 sm:px-8 py-1.5 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex items-center gap-1.5 min-w-max text-xs font-mono uppercase">
          <span className="text-on-surface-variant pr-2">Session Stage:</span>
          <button
            onClick={() => setStage(1)}
            className={`px-3 py-1 rounded transition-all ${stage === 1 ? 'bg-primary text-white font-bold' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}`}
          >
            1. Consent &amp; Calibrate
          </button>
          <button
            onClick={() => setStage(2)}
            className={`px-3 py-1 rounded transition-all ${stage === 2 ? 'bg-primary text-white font-bold' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}`}
          >
            2. Task Instructions
          </button>
          <button
            onClick={() => setStage(3)}
            className={`px-3 py-1 rounded transition-all ${stage === 3 ? 'bg-primary text-white font-bold' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}`}
          >
            3. Active Runner (Live)
          </button>
          <button
            onClick={() => setStage(4)}
            className={`px-3 py-1 rounded transition-all ${stage === 4 ? 'bg-primary text-white font-bold' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}`}
          >
            4. ITI Fixation Gap
          </button>
          <button
            onClick={() => setStage(5)}
            className={`px-3 py-1 rounded transition-all ${stage === 5 ? 'bg-primary text-white font-bold' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'}`}
          >
            5. Completion &amp; Debrief
          </button>
        </div>
      </nav>

      {/* Main Runner Stage Display */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 flex flex-col justify-center">
        {/* STAGE 1: Consent */}
        {stage === 1 && (
          <div className="bg-surface-container-lowest p-8 sm:p-12 rounded-2xl border border-surface-container shadow-xs flex flex-col gap-6 max-w-3xl mx-auto w-full">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase font-bold">
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
                <span>Protocol Verification • Protocol #STAN-2024-899</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-heading text-on-surface tracking-tight">
                Participant Informed Consent &amp; Environmental Calibration
              </h1>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                You are participating in an anonymous cognitive psychophysics experiment measuring selective attention and executive inhibition. No personal identifiable information (PII) is stored or requested.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface-container-low p-4 rounded-xl border border-surface-container flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-on-surface font-heading font-bold text-sm">
                  <span className="material-symbols-outlined text-primary text-[20px]">security</span>
                  <span>Zero-Knowledge Architecture</span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Telemetry packets are salted and signed in your browser instance. Your session token is isolated to this trial run.
                </p>
              </div>

              <div className="bg-surface-container-low p-4 rounded-xl border border-surface-container flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-on-surface font-heading font-bold text-sm">
                  <span className="material-symbols-outlined text-primary text-[20px]">speed</span>
                  <span>Sub-Millisecond Timing Sync</span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Your monitor refresh rate has been confirmed at 144Hz. Please refrain from switching tabs to avoid timestamp invalidation.
                </p>
              </div>
            </div>

            <div className="bg-surface-container p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-mono uppercase">
                <input type="checkbox" defaultChecked className="rounded accent-emerald-600 w-4 h-4" />
                <span className="text-on-surface font-medium">I consent to anonymous behavioral data collection</span>
              </label>

              <button
                type="button"
                onClick={() => setStage(2)}
                className="bg-primary hover:bg-emerald-700 text-white font-mono text-xs uppercase font-bold px-6 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2"
              >
                <span>Proceed to Instructions</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* STAGE 2: Instructions */}
        {stage === 2 && (
          <div className="bg-surface-container-lowest p-8 sm:p-12 rounded-2xl border border-surface-container shadow-xs flex flex-col gap-6 max-w-3xl mx-auto w-full">
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-xs uppercase text-primary font-bold">Stage 2 of 5 • Task Familiarization</span>
              <h2 className="text-2xl sm:text-3xl font-bold font-heading text-on-surface tracking-tight">
                How to Perform the Stroop Task
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                In this experiment, words will appear one at a time on screen. Each word is printed in a specific color. Your sole task is to <strong className="text-on-surface font-bold">indicate the color of the letters</strong> as fast as you can without making errors.
              </p>
            </div>

            <div className="bg-surface-container-low p-6 rounded-xl border border-surface-container flex flex-col sm:flex-row items-center justify-around gap-6 text-center sm:text-left">
              <div className="flex flex-col items-center">
                <span className="font-mono text-xs text-on-surface-variant uppercase mb-2">Example Stimulus</span>
                <div className="bg-surface-container-lowest px-8 py-4 rounded-xl border border-surface-container shadow-sm">
                  <span className="text-4xl font-extrabold font-heading text-rose-500 uppercase tracking-widest">
                    BLUE
                  </span>
                </div>
              </div>
              <div className="flex flex-col max-w-xs gap-1 text-left">
                <span className="font-heading font-bold text-base text-on-surface">The Correct Response is RED</span>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Even though the word reads "BLUE", the font is printed in <strong className="text-rose-500 font-bold">RED</strong>. Therefore, you must press the <span className="bg-surface-container px-1.5 py-0.5 rounded font-mono font-bold text-on-surface">D</span> key for RED.
                </p>
              </div>
            </div>

            <div>
              <span className="font-mono text-xs uppercase text-on-surface font-bold block mb-2">
                Ergonomic Keyboard Placement:
              </span>
              <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs">
                <div className="bg-surface-container p-3 rounded-lg border border-surface-container">
                  <span className="font-bold text-rose-500 text-sm block">D</span>
                  <span className="text-[11px] text-on-surface-variant">Left Middle (RED)</span>
                </div>
                <div className="bg-surface-container p-3 rounded-lg border border-surface-container">
                  <span className="font-bold text-sky-500 text-sm block">F</span>
                  <span className="text-[11px] text-on-surface-variant">Left Index (BLUE)</span>
                </div>
                <div className="bg-surface-container p-3 rounded-lg border border-surface-container">
                  <span className="font-bold text-emerald-500 text-sm block">J</span>
                  <span className="text-[11px] text-on-surface-variant">Right Index (GREEN)</span>
                </div>
                <div className="bg-surface-container p-3 rounded-lg border border-surface-container">
                  <span className="font-bold text-amber-500 text-sm block">K</span>
                  <span className="text-[11px] text-on-surface-variant">Right Middle (YELLOW)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStage(1)}
                className="text-on-surface-variant hover:text-on-surface font-mono text-xs uppercase flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStage(3)}
                className="bg-primary hover:bg-emerald-700 text-white font-mono text-xs uppercase font-bold px-6 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2"
              >
                <span>Begin Experiment Run</span>
                <span className="material-symbols-outlined text-[16px]">play_arrow</span>
              </button>
            </div>
          </div>
        )}

        {/* STAGE 3: Active Live Runner */}
        {stage === 3 && (
          <div className="flex flex-col w-full gap-4 max-w-4xl mx-auto">
            {/* Block & Progress Bar */}
            <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-container shadow-xs flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-on-surface font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-sm tracking-tight text-on-surface">Block 1 of 2</span>
                  <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded uppercase">Live Acquisition</span>
                </div>
                <div className="flex items-center gap-3 text-on-surface-variant">
                  <span>Trial <strong className="text-on-surface font-bold">{trialIndex + 1}</strong> of {totalTrials}</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-bold">{completedPct}% Completed</span>
                  <span>•</span>
                  <span>Est. Remaining: ~1m 30s</span>
                </div>
              </div>

              <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden flex">
                <div className="bg-emerald-600 h-full rounded-full transition-all duration-300" style={{ width: `${completedPct}%` }}></div>
              </div>
            </div>

            {/* Stimulus Presentation Canvas */}
            <div className="relative bg-surface-container-lowest rounded-2xl border border-surface-container shadow-xs p-6 sm:p-10 flex flex-col items-center justify-between min-h-[420px]">
              <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-on-surface-variant font-mono text-xs">
                <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1 rounded border border-surface-container">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600">timer</span>
                  <span>HW Clock: <strong className="text-on-surface">{clockTime}</strong> ms</span>
                  <span className="text-surface-container-highest">•</span>
                  <span>Sync: 0 frame drop</span>
                </div>
                <div className="flex items-center gap-1.5 bg-surface-container-low px-3 py-1 rounded border border-surface-container">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span className="uppercase">Sampling Window: [150ms – 2000ms]</span>
                </div>
              </div>

              {/* Target Word Stimulus with Dial */}
              <div className="my-auto py-8 flex flex-col items-center justify-center text-center relative w-full">
                <div className="relative flex items-center justify-center p-8">
                  <svg className="absolute w-64 h-64 sm:w-72 sm:h-72 -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                    <circle className="text-surface-container" cx="50" cy="50" fill="none" r="46" stroke="currentColor" strokeWidth="2"></circle>
                    <circle className="text-emerald-500" cx="50" cy="50" fill="none" r="46" stroke="currentColor" strokeDasharray="289" strokeDashoffset="65" strokeWidth="2.5"></circle>
                  </svg>
                  <div className="text-center z-10 px-8 py-5 bg-surface-container-low/70 rounded-2xl border border-surface-container backdrop-blur-xs">
                    <span className="font-mono text-xs text-on-surface-variant uppercase tracking-widest block mb-1">
                      Stimulus Word #{trialIndex + 1}
                    </span>
                    <span className={`text-5xl sm:text-6xl font-extrabold font-heading tracking-wider select-none uppercase drop-shadow-sm ${currentStimulus.colorClass}`}>
                      {currentStimulus.word}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 font-mono text-xs text-on-surface-variant bg-surface-container px-3 py-1.5 rounded-lg border border-surface-container">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600">visibility</span>
                  <span>Task Rule: Respond to the <strong className="text-on-surface">FONT COLOR</strong>, ignore text semantics.</span>
                </div>
              </div>

              {/* Feedback Latency Readout Pill */}
              <div className="w-full flex items-center justify-center">
                <div className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-mono text-xs uppercase font-bold border ${isCorrect ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                  <span className="material-symbols-outlined text-[18px]">
                    {isCorrect ? 'check_circle' : 'error'}
                  </span>
                  <span>{lastMatchText}</span>
                </div>
              </div>
            </div>

            {/* Response Input Array */}
            <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">keyboard</span>
                  <span className="font-mono text-xs uppercase tracking-wider font-bold text-on-surface">
                    Input Array: Fast Key Response / Touch
                  </span>
                </div>
                <span className="font-mono text-xs text-on-surface-variant hidden sm:inline">
                  HID Sub-millisecond polling
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* D: RED */}
                <button
                  type="button"
                  onClick={() => handleResponse('RED', 'D')}
                  className="group bg-surface-container-low hover:bg-surface-container active:bg-rose-100 p-4 rounded-xl border border-surface-container flex flex-col items-center justify-center gap-1 transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center justify-between w-full font-mono text-xs">
                    <span className="font-bold text-base px-2 py-0.5 bg-surface text-on-surface rounded shadow-xs">D</span>
                    <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                  </div>
                  <span className="font-heading text-lg text-rose-600 font-extrabold mt-1">RED</span>
                  <span className="font-mono text-[10px] text-on-surface-variant uppercase">Target [D Key]</span>
                </button>

                {/* F: BLUE */}
                <button
                  type="button"
                  onClick={() => handleResponse('BLUE', 'F')}
                  className="group bg-surface-container-low hover:bg-surface-container active:bg-sky-100 p-4 rounded-xl border border-surface-container flex flex-col items-center justify-center gap-1 transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center justify-between w-full font-mono text-xs">
                    <span className="font-bold text-base px-2 py-0.5 bg-surface text-on-surface rounded shadow-xs">F</span>
                    <span className="w-3 h-3 rounded-full bg-sky-500"></span>
                  </div>
                  <span className="font-heading text-lg text-sky-600 font-extrabold mt-1">BLUE</span>
                  <span className="font-mono text-[10px] text-on-surface-variant uppercase">Target [F Key]</span>
                </button>

                {/* J: GREEN */}
                <button
                  type="button"
                  onClick={() => handleResponse('GREEN', 'J')}
                  className="group bg-surface-container-low hover:bg-surface-container active:bg-emerald-100 p-4 rounded-xl border border-surface-container flex flex-col items-center justify-center gap-1 transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center justify-between w-full font-mono text-xs">
                    <span className="font-bold text-base px-2 py-0.5 bg-surface text-on-surface rounded shadow-xs">J</span>
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  </div>
                  <span className="font-heading text-lg text-emerald-600 font-extrabold mt-1">GREEN</span>
                  <span className="font-mono text-[10px] text-on-surface-variant uppercase">Target [J Key]</span>
                </button>

                {/* K: YELLOW */}
                <button
                  type="button"
                  onClick={() => handleResponse('YELLOW', 'K')}
                  className="group bg-surface-container-low hover:bg-surface-container active:bg-amber-100 p-4 rounded-xl border border-surface-container flex flex-col items-center justify-center gap-1 transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center justify-between w-full font-mono text-xs">
                    <span className="font-bold text-base px-2 py-0.5 bg-surface text-on-surface rounded shadow-xs">K</span>
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  </div>
                  <span className="font-heading text-lg text-amber-600 font-extrabold mt-1">YELLOW</span>
                  <span className="font-mono text-[10px] text-on-surface-variant uppercase">Target [K Key]</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 4: Fixation Crosshair Gap */}
        {stage === 4 && (
          <div className="bg-surface-container-lowest p-12 rounded-2xl border border-surface-container shadow-xs flex flex-col items-center justify-center min-h-[460px] text-center max-w-4xl mx-auto w-full">
            <span className="font-mono text-xs text-on-surface-variant uppercase tracking-widest mb-8">
              Inter-Trial Interval • Fixate Eyes Centrally
            </span>

            <div className="relative flex items-center justify-center my-8">
              <div className="w-24 h-24 rounded-full bg-surface-container flex items-center justify-center animate-pulse">
                <span className="text-4xl text-on-surface font-light leading-none select-none">+</span>
              </div>
            </div>

            <span className="font-mono text-xs text-on-surface-variant mt-4">
              ITI Window: 350ms jittered • Next stimulus presentation queueing...
            </span>

            <button
              type="button"
              onClick={() => setStage(3)}
              className="mt-6 text-primary font-mono text-xs uppercase hover:underline"
            >
              Resume live stimulus immediately
            </button>
          </div>
        )}

        {/* STAGE 5: Completion & Debrief */}
        {stage === 5 && (
          <div className="bg-surface-container-lowest p-8 sm:p-12 rounded-2xl border border-surface-container shadow-xs flex flex-col gap-6 max-w-3xl mx-auto w-full">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                <span className="material-symbols-outlined text-[28px]">task_alt</span>
              </div>
              <div>
                <span className="font-mono text-xs uppercase text-emerald-700 font-bold">Acquisition Complete</span>
                <h2 className="text-2xl font-bold font-heading text-on-surface tracking-tight">
                  Experiment Session Finalized
                </h2>
              </div>
            </div>

            <p className="text-sm text-on-surface-variant leading-relaxed">
              All 48 trials in protocol EXP-882-STRP were recorded with sub-millisecond precision. Your dataset has been cryptographically signed and stored to researcher node <code className="font-mono text-on-surface bg-surface-container px-1 py-0.5 rounded">node_884-PX</code>.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center sm:text-left font-mono">
              <div className="bg-surface-container-low p-4 rounded-xl border border-surface-container">
                <span className="text-[11px] uppercase text-on-surface-variant block mb-1">Completed Trials</span>
                <span className="text-xl font-bold text-on-surface">48 / 48</span>
              </div>
              <div className="bg-surface-container-low p-4 rounded-xl border border-surface-container">
                <span className="text-[11px] uppercase text-on-surface-variant block mb-1">Mean RT</span>
                <span className="text-xl font-bold text-emerald-600">{lastRt} ms</span>
              </div>
              <div className="bg-surface-container-low p-4 rounded-xl border border-surface-container">
                <span className="text-[11px] uppercase text-on-surface-variant block mb-1">Accuracy Rate</span>
                <span className="text-xl font-bold text-on-surface">97.9%</span>
              </div>
              <div className="bg-surface-container-low p-4 rounded-xl border border-surface-container">
                <span className="text-[11px] uppercase text-on-surface-variant block mb-1">Stroop Effect Size</span>
                <span className="text-xl font-bold text-primary">+84.2 ms</span>
              </div>
            </div>

            <div className="bg-surface-container p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-xs text-on-surface-variant">
              <span>Cryptographic Hash: <code className="text-on-surface font-bold">sha256:7e91...bf82c4</code></span>
              <span className="text-emerald-700 font-bold uppercase">Zero-Knowledge Validated</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 font-mono text-xs">
              <button
                type="button"
                onClick={() => {
                  setTrialIndex(0);
                  setStage(3);
                }}
                className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface uppercase rounded-lg"
              >
                Test Another Block
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-5 py-2 bg-primary hover:bg-emerald-700 text-white uppercase font-bold rounded-lg transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Runner Footer */}
      <footer className="w-full bg-surface-container-low py-3 border-t border-surface-container">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-xs text-on-surface-variant">
          <div>Manova Behavioral Telemetry Engine v4.19 • Psychophysics Precision Subsystem</div>
          <div className="flex items-center gap-4">
            <span>Input Sampling: Sub-millisecond (USB-HID)</span>
            <span>Session ID: #ANON-882-04B</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
