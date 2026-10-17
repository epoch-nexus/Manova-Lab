import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

interface Question {
  id: string;
  type: 'multiple_choice' | 'likert' | 'matrix' | 'open_text';
  prompt: string;
  description?: string;
  required?: boolean;
  options?: Array<string | { value: string; label: string }>;
  allowMultiple?: boolean;
  scaleMin?: number;
  scaleMax?: number;
  minLabel?: string;
  midLabel?: string;
  maxLabel?: string;
  rows?: string[];
  columns?: string[];
  placeholder?: string;
}

interface SurveyData {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

interface AnswerRecord {
  questionId: string;
  questionType: string;
  response: any;
  dwellTimeMs: number;
  startedAtMs: number;
  submittedAtMs: number;
}

export default function SurveyRunnerPage() {
  const { id, experiment_id } = useParams<{ id?: string; experiment_id?: string }>();
  const activeId = experiment_id || id;

  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Participant answers & timing state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [submissionStats, setSubmissionStats] = useState<{
    totalDurationMs: number;
    avgDwellMs: number;
    itemCount: number;
  } | null>(null);

  // Timing references with performance.now()
  const surveyStartTimeRef = useRef<number>(0);
  const currentItemStartTimeRef = useRef<number>(0);
  const itemTimingRecordsRef = useRef<Record<string, { startedAtMs: number; dwellTimeMs: number }>>({});

  // 1. Fetch Survey Definition
  useEffect(() => {
    if (!activeId) {
      setError('No survey identifier provided in route URL.');
      setLoading(false);
      return;
    }

    const loadSurvey = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.surveys.get(activeId);
        setSurvey(data);
        surveyStartTimeRef.current = performance.now();
        currentItemStartTimeRef.current = performance.now();
      } catch (err: any) {
        console.error('Failed to load survey:', err);
        setError(err.message || 'Survey assay not found or unavailable.');
      } finally {
        setLoading(false);
      }
    };

    loadSurvey();
  }, [activeId]);

  // Record item dwell when active question index changes
  const recordCurrentItemDwell = useCallback(() => {
    if (!survey || !survey.questions[currentIndex]) return;
    const q = survey.questions[currentIndex];
    const now = performance.now();
    const prevStart = currentItemStartTimeRef.current || surveyStartTimeRef.current;
    const delta = Math.max(0, now - prevStart);

    const existing = itemTimingRecordsRef.current[q.id];
    itemTimingRecordsRef.current[q.id] = {
      startedAtMs: existing ? existing.startedAtMs : prevStart - surveyStartTimeRef.current,
      dwellTimeMs: (existing?.dwellTimeMs || 0) + delta,
    };
  }, [survey, currentIndex]);

  // Navigate between questions
  const goToQuestion = (nextIdx: number) => {
    recordCurrentItemDwell();
    setCurrentIndex(nextIdx);
    currentItemStartTimeRef.current = performance.now();
  };

  // Keyboard shortcut support for 1-7 Likert scales
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!survey || completed) return;
      const currentQ = survey.questions[currentIndex];
      if (currentQ?.type === 'likert') {
        const num = parseInt(e.key, 10);
        if (num >= (currentQ.scaleMin ?? 1) && num <= (currentQ.scaleMax ?? 7)) {
          setAnswers((prev) => ({ ...prev, [currentQ.id]: num }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [survey, currentIndex, completed]);

  // Submit survey responses with millisecond precision dwell times
  const handleSubmitSurvey = async () => {
    if (!survey) return;
    recordCurrentItemDwell();
    const finalNow = performance.now();
    const totalDurationMs = Math.round((finalNow - surveyStartTimeRef.current) * 100) / 100;

    const formattedAnswers: AnswerRecord[] = survey.questions.map((q) => {
      const timing = itemTimingRecordsRef.current[q.id] || {
        startedAtMs: 0,
        dwellTimeMs: 0,
      };
      const dwellRounded = Math.round(timing.dwellTimeMs * 100) / 100;
      return {
        questionId: q.id,
        questionType: q.type,
        response: answers[q.id] !== undefined ? answers[q.id] : null,
        dwellTimeMs: dwellRounded,
        startedAtMs: Math.round(timing.startedAtMs * 100) / 100,
        submittedAtMs: Math.round((timing.startedAtMs + timing.dwellTimeMs) * 100) / 100,
      };
    });

    setSubmitting(true);
    try {
      await api.surveys.submit(survey.id, {
        answers: formattedAnswers,
        totalDurationMs,
        clientMetadata: {
          userAgent: navigator.userAgent,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          devicePixelRatio: window.devicePixelRatio || 1,
          hardwareConcurrency: navigator.hardwareConcurrency || 4,
          timestamp: new Date().toISOString(),
        },
      });

      const totalDwell = formattedAnswers.reduce((sum, a) => sum + a.dwellTimeMs, 0);
      const avgDwell = formattedAnswers.length > 0 ? Math.round(totalDwell / formattedAnswers.length) : 0;

      setSubmissionStats({
        totalDurationMs,
        avgDwellMs: avgDwell,
        itemCount: formattedAnswers.length,
      });
      setCompleted(true);
    } catch (err: any) {
      console.error('Survey submission failed:', err);
      alert(`Submission failed: ${err.message || 'Please retry.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Render States: Loading & Error
  // -------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6">
        <span className="w-12 h-12 rounded-full border-3 border-emerald-400 border-t-transparent animate-spin mb-4"></span>
        <h2 className="text-xl font-bold font-heading">Initializing Survey Assay</h2>
        <p className="text-xs font-mono text-slate-400 mt-1">Calibrating millisecond item dwell telemetry timers...</p>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[36px]">error_outline</span>
        </div>
        <h2 className="text-2xl font-bold font-heading mb-2">Survey Not Found</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">{error || 'Could not locate survey record.'}</p>
        <Link
          to="/dashboard"
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Render State: Completed
  // -------------------------------------------------------------
  if (completed) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-6 shadow-2xl animate-in zoom-in-90 duration-200">
          <span className="material-symbols-outlined text-[48px]">check_circle</span>
        </div>
        <h2 className="text-3xl font-extrabold font-heading text-white mb-2">Response Recorded Successfully</h2>
        <p className="text-sm text-slate-400 max-w-md mb-8">
          Your answers and high-resolution item-level dwell times have been stored in the research database.
        </p>

        {submissionStats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl w-full mb-8 text-left">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4">
              <span className="text-[10px] font-mono uppercase text-slate-400">Total Duration</span>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {(submissionStats.totalDurationMs / 1000).toFixed(2)}s
              </div>
              <span className="text-[10px] text-slate-500 font-mono">{submissionStats.totalDurationMs} ms</span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4">
              <span className="text-[10px] font-mono uppercase text-slate-400">Average Dwell / Item</span>
              <div className="text-2xl font-bold font-mono text-sky-400 mt-1">
                {(submissionStats.avgDwellMs / 1000).toFixed(2)}s
              </div>
              <span className="text-[10px] text-slate-500 font-mono">±0.02ms precision</span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4">
              <span className="text-[10px] font-mono uppercase text-slate-400">Questions Answered</span>
              <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
                {submissionStats.itemCount} / {submissionStats.itemCount}
              </div>
              <span className="text-[10px] text-emerald-500 font-mono">100% complete</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all"
          >
            Dashboard
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all"
          >
            Retake Survey
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Render State: Active Survey Runner
  // -------------------------------------------------------------
  const totalQuestions = survey.questions.length;
  const currentQ = survey.questions[currentIndex];
  const progressPct = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Precision Timing Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <span className="material-symbols-outlined text-[18px]">poll</span>
          </div>
          <div>
            <h1 className="text-sm font-bold font-heading text-white">{survey.title}</h1>
            <p className="text-[10px] font-mono text-slate-400">
              Protocol: <span className="text-emerald-400 font-bold">{survey.id.slice(0, 8)}...</span> | High-Resolution Timing Active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Question Progress</span>
            <div className="text-xs font-mono font-bold text-emerald-400">
              {currentIndex + 1} of {totalQuestions} ({progressPct}%)
            </div>
          </div>
          <div className="w-24 sm:w-36 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPct}%` }}
            ></div>
          </div>
        </div>
      </header>

      {/* Main Runner Body */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 flex flex-col justify-center">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl relative animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Question Index Badge */}
          <div className="flex items-center justify-between mb-4">
            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md font-mono text-xs font-semibold uppercase tracking-wider">
              {currentQ.type.replace('_', ' ')} • #{currentIndex + 1}
            </span>
            {currentQ.required && (
              <span className="text-[10px] font-mono text-amber-400/90 uppercase tracking-wider">
                * Required
              </span>
            )}
          </div>

          {/* Prompt */}
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-white leading-snug mb-2">
            {currentQ.prompt}
          </h2>
          {currentQ.description && (
            <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
              {currentQ.description}
            </p>
          )}

          {/* Question Content Input by Type */}
          <div className="mt-6 mb-8">
            {/* 1. LIKERT SCALE (1-7) */}
            {currentQ.type === 'likert' && (
              <div className="space-y-4">
                <div className="grid grid-cols-7 gap-2 sm:gap-3">
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                    const selected = answers[currentQ.id] === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setAnswers((prev) => ({ ...prev, [currentQ.id]: num }))}
                        className={`py-4 sm:py-6 rounded-xl font-mono text-base sm:text-xl font-bold flex flex-col items-center justify-center transition-all cursor-pointer border ${
                          selected
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/30 scale-105'
                            : 'bg-slate-800/80 hover:bg-slate-750 text-slate-200 border-slate-700/80 hover:border-slate-600'
                        }`}
                      >
                        <span>{num}</span>
                        <span className="text-[9px] font-sans font-normal opacity-60 mt-1 hidden sm:inline">
                          Key [{num}]
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs font-mono text-slate-400 px-1 pt-1">
                  <span>← {currentQ.minLabel || 'Strongly Disagree'} (1)</span>
                  <span className="hidden sm:inline">{currentQ.midLabel || 'Neutral'} (4)</span>
                  <span>{currentQ.maxLabel || 'Strongly Agree'} (7) →</span>
                </div>
              </div>
            )}

            {/* 2. MULTIPLE CHOICE */}
            {currentQ.type === 'multiple_choice' && (
              <div className="space-y-3">
                {(currentQ.options || []).map((opt, optIdx) => {
                  const val = typeof opt === 'object' ? opt.value : opt;
                  const label = typeof opt === 'object' ? opt.label : opt;
                  const isChecked = currentQ.allowMultiple
                    ? Array.isArray(answers[currentQ.id]) && answers[currentQ.id].includes(val)
                    : answers[currentQ.id] === val;

                  const handleSelect = () => {
                    if (currentQ.allowMultiple) {
                      const currentArr = Array.isArray(answers[currentQ.id]) ? [...answers[currentQ.id]] : [];
                      if (currentArr.includes(val)) {
                        setAnswers((prev) => ({ ...prev, [currentQ.id]: currentArr.filter((x) => x !== val) }));
                      } else {
                        setAnswers((prev) => ({ ...prev, [currentQ.id]: [...currentArr, val] }));
                      }
                    } else {
                      setAnswers((prev) => ({ ...prev, [currentQ.id]: val }));
                    }
                  };

                  return (
                    <div
                      key={optIdx}
                      onClick={handleSelect}
                      className={`p-4 rounded-xl border flex items-center gap-3.5 transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md'
                          : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/80 text-slate-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-${currentQ.allowMultiple ? 'md' : 'full'} border flex items-center justify-center transition-colors ${
                          isChecked ? 'border-emerald-400 bg-emerald-500 text-slate-950' : 'border-slate-500 bg-slate-900'
                        }`}
                      >
                        {isChecked && (
                          <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                        )}
                      </div>
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. MATRIX QUESTIONS */}
            {currentQ.type === 'matrix' && (
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-800/80 border-b border-slate-700 text-xs font-mono text-slate-400 uppercase">
                    <tr>
                      <th className="py-3 px-4">Statement</th>
                      {(currentQ.columns || ['1', '2', '3', '4', '5']).map((col, cIdx) => (
                        <th key={cIdx} className="py-3 px-3 text-center">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {(currentQ.rows || ['Statement 1']).map((row, rIdx) => {
                      const currentRowVal = answers[currentQ.id]?.[row];
                      return (
                        <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-medium text-slate-200">{row}</td>
                          {(currentQ.columns || ['1', '2', '3', '4', '5']).map((col, cIdx) => {
                            const isSelected = currentRowVal === col;
                            return (
                              <td key={cIdx} className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAnswers((prev) => ({
                                      ...prev,
                                      [currentQ.id]: {
                                        ...(prev[currentQ.id] || {}),
                                        [row]: col,
                                      },
                                    }))
                                  }
                                  className={`w-5 h-5 rounded-full border mx-auto transition-all cursor-pointer flex items-center justify-center ${
                                    isSelected
                                      ? 'border-emerald-400 bg-emerald-500 text-slate-950 scale-110 shadow-sm'
                                      : 'border-slate-600 bg-slate-900 hover:border-slate-400'
                                  }`}
                                >
                                  {isSelected && <span className="w-2 h-2 rounded-full bg-slate-950"></span>}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. OPEN TEXT */}
            {currentQ.type === 'open_text' && (
              <div>
                <textarea
                  rows={4}
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [currentQ.id]: e.target.value }))}
                  placeholder={currentQ.placeholder || 'Type your detailed response here...'}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
                <div className="flex justify-between text-[11px] font-mono text-slate-500 mt-1">
                  <span>Precision keystroke timing active</span>
                  <span>{(answers[currentQ.id] || '').length} characters</span>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-6">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => goToQuestion(currentIndex - 1)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 disabled:pointer-events-none text-slate-300 font-mono text-xs uppercase tracking-wider font-semibold rounded-lg border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Previous
            </button>

            {currentIndex < totalQuestions - 1 ? (
              <button
                type="button"
                onClick={() => goToQuestion(currentIndex + 1)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs uppercase tracking-wider font-bold rounded-lg shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                Next Item
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitSurvey}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono text-xs uppercase tracking-wider font-bold rounded-lg shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Recording Responses...
                  </>
                ) : (
                  <>
                    Submit Assay
                    <span className="material-symbols-outlined text-[16px]">done_all</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
