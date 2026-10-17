import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import Header from '../components/Header';

interface SurveyQuestionItem {
  id: string;
  type: 'multiple_choice' | 'likert' | 'matrix' | 'open_text';
  prompt: string;
  description?: string;
  required: boolean;
  options?: string[];
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

export default function SurveyBuilderPage() {
  const navigate = useNavigate();
  const { id: paramId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const surveyIdFromUrl = paramId || searchParams.get('id');

  const [title, setTitle] = useState('Cognitive Workload & Experience Survey');
  const [description, setDescription] = useState(
    'Standardized post-experiment battery assessing task friction, subjective cognitive demand, and qualitative feedback.'
  );

  const [questions, setQuestions] = useState<SurveyQuestionItem[]>([
    {
      id: 'q_likert_1',
      type: 'likert',
      prompt: 'How mentally demanding was this cognitive experimental protocol?',
      description: 'Rate your subjective mental effort from 1 (Very Low) to 7 (Very High).',
      scaleMin: 1,
      scaleMax: 7,
      minLabel: 'Very Low',
      midLabel: 'Moderate',
      maxLabel: 'Very High',
      required: true,
    },
    {
      id: 'q_mc_2',
      type: 'multiple_choice',
      prompt: 'Which response input method did you utilize during the assay?',
      options: ['Physical mechanical keyboard', 'Laptop integrated keyboard', 'Touchscreen tap', 'Mouse clicks'],
      allowMultiple: false,
      required: true,
    },
    {
      id: 'q_matrix_3',
      type: 'matrix',
      prompt: 'Evaluate the following experimental presentation attributes:',
      rows: ['Visual stimulus clarity', 'Timing synchrony & responsiveness', 'Instructions ease-of-use'],
      columns: ['Poor', 'Fair', 'Good', 'Excellent'],
      required: true,
    },
    {
      id: 'q_open_4',
      type: 'open_text',
      prompt: 'Share any unexpected distractions, latency lag, or qualitative observations:',
      placeholder: 'Describe your participant experience...',
      required: false,
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [createdSurveyId, setCreatedSurveyId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load existing survey if ID provided in route
  useEffect(() => {
    if (!surveyIdFromUrl) return;
    const fetchExistingSurvey = async () => {
      try {
        const survey = await api.surveys.get(surveyIdFromUrl);
        if (survey) {
          setTitle(survey.title || '');
          setDescription(survey.description || '');
          if (Array.isArray(survey.questions) && survey.questions.length > 0) {
            setQuestions(survey.questions);
          }
          setCreatedSurveyId(survey.id);
          showToast(`Loaded existing survey: ${survey.title}`);
        }
      } catch (err) {
        console.warn('Could not load survey with id:', surveyIdFromUrl, err);
      }
    };
    fetchExistingSurvey();
  }, [surveyIdFromUrl]);

  // Add new question by type
  const handleAddQuestion = (type: SurveyQuestionItem['type']) => {
    const newId = `q_${type}_${Date.now()}`;
    let newQ: SurveyQuestionItem;

    if (type === 'likert') {
      newQ = {
        id: newId,
        type: 'likert',
        prompt: 'Rate agreement on a 1-7 scale:',
        scaleMin: 1,
        scaleMax: 7,
        minLabel: 'Strongly Disagree',
        midLabel: 'Neutral',
        maxLabel: 'Strongly Agree',
        required: true,
      };
    } else if (type === 'multiple_choice') {
      newQ = {
        id: newId,
        type: 'multiple_choice',
        prompt: 'Select your preferred option:',
        options: ['Option A', 'Option B', 'Option C'],
        allowMultiple: false,
        required: true,
      };
    } else if (type === 'matrix') {
      newQ = {
        id: newId,
        type: 'matrix',
        prompt: 'Evaluate the following matrix criteria:',
        rows: ['Criterion 1', 'Criterion 2'],
        columns: ['Low', 'Medium', 'High'],
        required: true,
      };
    } else {
      newQ = {
        id: newId,
        type: 'open_text',
        prompt: 'Please provide your open-ended feedback:',
        placeholder: 'Type your feedback here...',
        required: false,
      };
    }

    setQuestions((prev) => [...prev, newQ]);
    showToast(`Added ${type.replace('_', ' ')} question item`);
  };

  // Delete question
  const handleDeleteQuestion = (id: string) => {
    if (questions.length <= 1) {
      alert('Survey must contain at least one question.');
      return;
    }
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  // Save Survey
  const handleSaveSurvey = async () => {
    if (!title.trim()) {
      alert('Please provide a survey title.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        preset: 'Survey',
        questions,
      };

      const res = await api.surveys.create(payload);
      setCreatedSurveyId(res.id);
      showToast(`Survey protocol created: ${res.title}`);
    } catch (err: any) {
      console.error('Failed to create survey:', err);
      alert(`Save failed: ${err.message || 'Check server connection.'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans text-on-surface pt-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-lg shadow-2xl font-mono text-xs uppercase tracking-wider flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <Header current="builder" />

      {/* Breadcrumb & Action Banner */}
      <section className="w-full bg-surface-container-lowest border-b border-surface-container px-4 sm:px-8 py-3 shadow-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-on-surface-variant font-mono text-xs uppercase tracking-wider">
              <Link to="/dashboard" className="hover:text-emerald-700 transition-colors">
                My Experiments
              </Link>
              <span>/</span>
              <span className="text-emerald-700 font-bold">Survey Assay Builder</span>
            </div>
            <h1 className="font-heading font-bold text-xl text-on-surface mt-1">Survey Assay Protocol Designer</h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-mono text-xs uppercase tracking-wider font-semibold rounded-lg transition-all"
            >
              Cancel
            </Link>
            <button
              onClick={handleSaveSurvey}
              disabled={saving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-mono text-xs uppercase tracking-wider font-bold rounded-lg shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Saving Survey...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  Save Survey Assay
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Main Builder Workspace */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8 flex-1">
        {/* Survey Metadata Card */}
        <div className="bg-surface-container-lowest border border-surface-container rounded-2xl p-6 shadow-xs space-y-4">
          <div>
            <label className="block text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">
              Survey Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-lg font-bold font-heading bg-surface border border-surface-container-high rounded-xl px-4 py-2.5 text-on-surface focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">
              Description / Participant Brief
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm bg-surface border border-surface-container-high rounded-xl p-3 text-on-surface focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
            />
          </div>
        </div>

        {/* Questions Header & Add Dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold font-heading text-on-surface">
              Survey Items ({questions.length})
            </h2>
            <p className="text-xs font-mono text-on-surface-variant">
              Every item captures sub-millisecond dwell times via performance.now() telemetry.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-on-surface-variant mr-1 font-medium">Add Item:</span>
            <button
              onClick={() => handleAddQuestion('likert')}
              className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-emerald-700 font-mono text-xs font-bold rounded-lg border border-surface-container-high transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[14px]">linear_scale</span>
              + Likert (1-7)
            </button>
            <button
              onClick={() => handleAddQuestion('multiple_choice')}
              className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-sky-700 font-mono text-xs font-bold rounded-lg border border-surface-container-high transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[14px]">radio_button_checked</span>
              + Multiple Choice
            </button>
            <button
              onClick={() => handleAddQuestion('matrix')}
              className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-indigo-700 font-mono text-xs font-bold rounded-lg border border-surface-container-high transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[14px]">grid_on</span>
              + Matrix
            </button>
            <button
              onClick={() => handleAddQuestion('open_text')}
              className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-amber-700 font-mono text-xs font-bold rounded-lg border border-surface-container-high transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[14px]">edit_note</span>
              + Open Text
            </button>
          </div>
        </div>

        {/* Question Cards List */}
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-surface-container-lowest border border-surface-container rounded-2xl p-6 shadow-xs relative"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-surface-container-high text-on-surface font-mono text-[11px] font-bold rounded">
                    #{idx + 1}
                  </span>
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-mono text-[11px] font-semibold uppercase rounded">
                    {q.type.replace('_', ' ')}
                  </span>
                </div>

                <button
                  onClick={() => handleDeleteQuestion(q.id)}
                  className="text-on-surface-variant hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                  title="Delete Item"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>

              {/* Prompt Input */}
              <div className="space-y-3">
                <input
                  type="text"
                  value={q.prompt}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuestions((prev) =>
                      prev.map((item) => (item.id === q.id ? { ...item, prompt: val } : item))
                    );
                  }}
                  placeholder="Enter item prompt / question text..."
                  className="w-full text-base font-semibold bg-surface border border-surface-container-high rounded-xl px-3.5 py-2 text-on-surface focus:outline-none focus:border-emerald-600"
                />

                {/* Sub-inputs based on question type */}
                {q.type === 'likert' && (
                  <div className="bg-surface-container/60 p-4 rounded-xl border border-surface-container-high grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-on-surface-variant uppercase mb-1">
                        Anchor 1 (Min)
                      </label>
                      <input
                        type="text"
                        value={q.minLabel || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuestions((prev) =>
                            prev.map((item) => (item.id === q.id ? { ...item, minLabel: val } : item))
                          );
                        }}
                        className="w-full text-xs bg-surface border border-surface-container-high rounded-lg p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-on-surface-variant uppercase mb-1">
                        Anchor 4 (Mid)
                      </label>
                      <input
                        type="text"
                        value={q.midLabel || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuestions((prev) =>
                            prev.map((item) => (item.id === q.id ? { ...item, midLabel: val } : item))
                          );
                        }}
                        className="w-full text-xs bg-surface border border-surface-container-high rounded-lg p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-on-surface-variant uppercase mb-1">
                        Anchor 7 (Max)
                      </label>
                      <input
                        type="text"
                        value={q.maxLabel || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuestions((prev) =>
                            prev.map((item) => (item.id === q.id ? { ...item, maxLabel: val } : item))
                          );
                        }}
                        className="w-full text-xs bg-surface border border-surface-container-high rounded-lg p-2"
                      />
                    </div>
                  </div>
                )}

                {q.type === 'multiple_choice' && (
                  <div className="bg-surface-container/60 p-4 rounded-xl border border-surface-container-high space-y-2">
                    <span className="text-[11px] font-mono text-on-surface-variant uppercase block font-semibold">
                      Options:
                    </span>
                    {(q.options || []).map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <span className="text-xs font-mono text-on-surface-variant">{optIdx + 1}.</span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const val = e.target.value;
                            setQuestions((prev) =>
                              prev.map((item) => {
                                if (item.id !== q.id) return item;
                                const newOpts = [...(item.options || [])];
                                newOpts[optIdx] = val;
                                return { ...item, options: newOpts };
                              })
                            );
                          }}
                          className="flex-1 text-xs bg-surface border border-surface-container-high rounded-lg p-2"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setQuestions((prev) =>
                              prev.map((item) => {
                                if (item.id !== q.id) return item;
                                return {
                                  ...item,
                                  options: (item.options || []).filter((_, i) => i !== optIdx),
                                };
                              })
                            );
                          }}
                          className="text-on-surface-variant hover:text-rose-600 p-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setQuestions((prev) =>
                          prev.map((item) => {
                            if (item.id !== q.id) return item;
                            return {
                              ...item,
                              options: [...(item.options || []), `Option ${(item.options || []).length + 1}`],
                            };
                          })
                        );
                      }}
                      className="text-xs font-mono text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer pt-1 inline-block"
                    >
                      + Add Option
                    </button>
                  </div>
                )}

                {q.type === 'matrix' && (
                  <div className="bg-surface-container/60 p-4 rounded-xl border border-surface-container-high space-y-2">
                    <span className="text-[11px] font-mono text-on-surface-variant uppercase block font-semibold">
                      Matrix Rows (Statements):
                    </span>
                    {(q.rows || []).map((row, rIdx) => (
                      <div key={rIdx} className="flex items-center gap-2">
                        <span className="text-xs font-mono text-on-surface-variant">R{rIdx + 1}.</span>
                        <input
                          type="text"
                          value={row}
                          onChange={(e) => {
                            const val = e.target.value;
                            setQuestions((prev) =>
                              prev.map((item) => {
                                if (item.id !== q.id) return item;
                                const newRows = [...(item.rows || [])];
                                newRows[rIdx] = val;
                                return { ...item, rows: newRows };
                              })
                            );
                          }}
                          className="flex-1 text-xs bg-surface border border-surface-container-high rounded-lg p-2"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {q.type === 'open_text' && (
                  <div className="bg-surface-container/60 p-3 rounded-xl border border-surface-container-high">
                    <input
                      type="text"
                      value={q.placeholder || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQuestions((prev) =>
                          prev.map((item) => (item.id === q.id ? { ...item, placeholder: val } : item))
                        );
                      }}
                      placeholder="Placeholder text for respondent..."
                      className="w-full text-xs bg-surface border border-surface-container-high rounded-lg p-2"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Share / Test Modal when Survey is Created */}
      {createdSurveyId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest max-w-lg w-full p-6 sm:p-8 rounded-2xl shadow-2xl border border-surface-container space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">check_circle</span>
              </div>
              <div>
                <h3 className="text-lg font-bold font-heading text-on-surface">Survey Protocol Live</h3>
                <p className="text-xs font-mono text-on-surface-variant">ID: {createdSurveyId}</p>
              </div>
            </div>

            <p className="text-sm text-on-surface-variant leading-relaxed">
              Your survey assay is now active and ready for data collection with millisecond item-level dwell telemetry.
            </p>

            <div className="bg-surface p-3 rounded-xl border border-surface-container flex items-center justify-between gap-2">
              <code className="text-xs font-mono text-emerald-700 truncate">
                {window.location.origin}/runner/survey/{createdSurveyId}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/runner/survey/${createdSurveyId}`);
                  showToast('Runner URL copied to clipboard');
                }}
                className="px-2.5 py-1 bg-surface-container hover:bg-surface-container-high text-on-surface font-mono text-xs font-semibold rounded cursor-pointer shrink-0"
              >
                Copy
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setCreatedSurveyId(null)}
                className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-mono text-xs font-semibold rounded-lg"
              >
                Close
              </button>
              <button
                onClick={() => navigate(`/runner/survey/${createdSurveyId}`)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-lg shadow-md cursor-pointer flex items-center gap-1.5"
              >
                Launch Runner
                <span className="material-symbols-outlined text-[16px]">play_arrow</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
