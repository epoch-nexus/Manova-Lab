import React from 'react';
import type { Node } from 'reactflow';

export interface ProtocolNodeData {
  label: string;
  type: 'instruction' | 'stimulus' | 'response' | 'branch' | 'iterator';
  title: string;
  description?: string;
  text?: string;
  ink?: string;
  dwell?: number;
  isi?: number;
  congruency?: 'congruent' | 'incongruent' | 'neutral';
  allowedKeys?: string[];
  timeoutMs?: number;
  condition?: string;
  repetitions?: number;
  bids?: Record<string, any>;
  onDeleteNode?: (id: string) => void;
  [key: string]: any;
}

export type CustomNodeType = Node<ProtocolNodeData>;

export interface SelectedNodeInspectorProps {
  selectedNode: CustomNodeType | null;
  selectedTab: 'visual' | 'bids' | 'timing';
  setSelectedTab: (tab: 'visual' | 'bids' | 'timing') => void;
  updateSelectedNodeData: (updates: Partial<ProtocolNodeData>) => void;
  showToast: (msg: string) => void;
}

export const SelectedNodeInspector: React.FC<SelectedNodeInspectorProps> = ({
  selectedNode,
  selectedTab,
  setSelectedTab,
  updateSelectedNodeData,
  showToast,
}) => {
  return (
    <aside className="w-full xl:w-96 bg-white rounded-2xl p-5 flex flex-col gap-4 shrink-0 border border-slate-200 shadow-xs z-20 overflow-y-auto">
      {/* Node Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">
            SELECTED NODE INSPECTOR
          </span>
          <h2 className="font-heading font-bold text-sm text-neutral-900">
            {selectedNode ? selectedNode.data.label : 'NO NODE SELECTED'}
          </h2>
        </div>
        {selectedNode && (
          <span className="px-2.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded-full font-mono text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
            {selectedNode.type?.toUpperCase()}
          </span>
        )}
      </div>

      {selectedNode ? (
        <>
          {/* Tab Navigation - Pebble Pill Capsule */}
          <div className="flex bg-slate-50 p-1 rounded-full border border-slate-200 font-mono text-xs">
            <button
              type="button"
              onClick={() => setSelectedTab('visual')}
              className={`flex-1 py-1.5 text-center rounded-full transition-all cursor-pointer ${
                selectedTab === 'visual'
                  ? 'bg-white text-neutral-900 font-bold shadow-2xs border border-slate-200'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Visual
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('bids')}
              className={`flex-1 py-1.5 text-center rounded-full transition-all cursor-pointer ${
                selectedTab === 'bids'
                  ? 'bg-white text-neutral-900 font-bold shadow-2xs border border-slate-200'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              BIDS Schema
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('timing')}
              className={`flex-1 py-1.5 text-center rounded-full transition-all cursor-pointer ${
                selectedTab === 'timing'
                  ? 'bg-white text-neutral-900 font-bold shadow-2xs border border-slate-200'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Timing
            </button>
          </div>

          {/* Tab Panels: Conditional visibility via CSS to preserve form inputs without unmounting */}
          
          {/* 1. VISUAL PARAMETERS PANEL */}
          <div className={selectedTab === 'visual' ? 'flex flex-col gap-3.5 text-xs' : 'hidden'}>
            <div>
              <label className="font-mono text-[11px] text-neutral-600 uppercase font-semibold block mb-1.5">
                Node Title / Descriptor
              </label>
              <input
                type="text"
                value={selectedNode.data.title || ''}
                onChange={(e) => updateSelectedNodeData({ title: e.target.value })}
                className="w-full bg-slate-50 text-neutral-900 font-mono font-bold px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 shadow-2xs transition-all"
              />
            </div>

            {/* Stimulus Text Literal */}
            {(selectedNode.type === 'stimulus' || selectedNode.type === 'instruction') && (
              <div>
                <label className="font-mono text-[11px] text-neutral-600 uppercase font-semibold block mb-1.5">
                  Stimulus Text Literal
                </label>
                <input
                  type="text"
                  value={selectedNode.data.text || ''}
                  onChange={(e) => updateSelectedNodeData({ text: e.target.value })}
                  className="w-full bg-slate-50 text-neutral-900 font-mono font-bold px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 shadow-2xs transition-all"
                />
              </div>
            )}

            {/* Description Text Area for Instructions */}
            {selectedNode.type === 'instruction' && (
              <div>
                <label className="font-mono text-[11px] text-neutral-600 uppercase font-semibold block mb-1.5">
                  Instruction Briefing Text
                </label>
                <textarea
                  rows={3}
                  value={selectedNode.data.description || ''}
                  onChange={(e) => updateSelectedNodeData({ description: e.target.value })}
                  className="w-full bg-slate-50 text-neutral-900 font-sans px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 shadow-2xs transition-all resize-none text-xs"
                />
              </div>
            )}

            {/* Ink Color Picker & Congruency for Stimulus */}
            {selectedNode.type === 'stimulus' && (
              <div className="grid grid-cols-2 gap-2.5 font-mono">
                <div>
                  <label className="text-[11px] text-neutral-600 uppercase font-semibold block mb-1.5">Ink Color</label>
                  <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                    <input
                      type="color"
                      value={selectedNode.data.ink || '#0D9488'}
                      onChange={(e) => updateSelectedNodeData({ ink: e.target.value })}
                      className="w-6 h-6 rounded-full cursor-pointer border-0 bg-transparent"
                    />
                    <span className="text-neutral-900 font-bold text-xs">{selectedNode.data.ink || '#0D9488'}</span>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-neutral-600 uppercase font-semibold block mb-1.5">Congruency</label>
                  <select
                    value={selectedNode.data.congruency || 'congruent'}
                    onChange={(e) => updateSelectedNodeData({ congruency: e.target.value as any })}
                    className="w-full bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-neutral-900 font-bold text-xs focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 shadow-2xs transition-all"
                  >
                    <option value="congruent">Congruent</option>
                    <option value="incongruent">Incongruent</option>
                    <option value="neutral">Neutral</option>
                  </select>
                </div>
              </div>
            )}

            {/* Allowed Keys for Response Node */}
            {selectedNode.type === 'response' && (
              <div>
                <label className="font-mono text-[11px] text-neutral-600 uppercase font-semibold block mb-1.5">
                  Allowed Keybinds (comma separated)
                </label>
                <input
                  type="text"
                  value={(selectedNode.data.allowedKeys || []).join(', ')}
                  onChange={(e) =>
                    updateSelectedNodeData({
                      allowedKeys: e.target.value.split(',').map((k) => k.trim().toUpperCase()).filter(Boolean),
                    })
                  }
                  className="w-full bg-slate-50 text-neutral-900 font-mono font-bold px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 shadow-2xs transition-all"
                />
              </div>
            )}

            {/* Branch routing condition */}
            {selectedNode.type === 'branch' && (
              <div>
                <label className="font-mono text-[11px] text-neutral-600 uppercase font-semibold block mb-1.5">
                  Branch Evaluation Expression
                </label>
                <input
                  type="text"
                  value={selectedNode.data.condition || 'accuracy >= 0.8'}
                  onChange={(e) => updateSelectedNodeData({ condition: e.target.value })}
                  className="w-full bg-slate-50 text-neutral-900 font-mono font-bold px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 shadow-2xs transition-all"
                />
              </div>
            )}

            {/* Iterator trial count */}
            {selectedNode.type === 'iterator' && (
              <div>
                <label className="font-mono text-[11px] text-neutral-600 uppercase font-semibold block mb-1.5">
                  Repetitions / Block Loops
                </label>
                <input
                  type="number"
                  value={selectedNode.data.repetitions ?? 10}
                  onChange={(e) => updateSelectedNodeData({ repetitions: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-50 text-neutral-900 font-mono font-bold px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 shadow-2xs transition-all"
                />
              </div>
            )}
          </div>

          {/* 2. TIMING PARAMETERS PANEL */}
          <div className={selectedTab === 'timing' ? 'flex flex-col gap-3.5 text-xs' : 'hidden'}>
            <div className="grid grid-cols-2 gap-2.5 font-mono">
              <div>
                <label className="text-[11px] text-neutral-600 uppercase font-semibold block mb-1.5">Dwell (ms)</label>
                <input
                  type="number"
                  value={selectedNode.data.dwell ?? 1000}
                  onChange={(e) => updateSelectedNodeData({ dwell: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-50 text-neutral-900 font-bold px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 shadow-2xs transition-all"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">Active stimulus duration</span>
              </div>
              <div>
                <label className="text-[11px] text-neutral-600 uppercase font-semibold block mb-1.5">ISI (ms)</label>
                <input
                  type="number"
                  value={selectedNode.data.isi ?? 350}
                  onChange={(e) => updateSelectedNodeData({ isi: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-50 text-neutral-900 font-bold px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 shadow-2xs transition-all"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">Inter-stimulus interval</span>
              </div>
            </div>

            {selectedNode.type === 'response' && (
              <div>
                <label className="font-mono text-[11px] text-neutral-600 uppercase font-semibold block mb-1.5">
                  Response Timeout (ms)
                </label>
                <input
                  type="number"
                  value={selectedNode.data.timeoutMs ?? 1500}
                  onChange={(e) => updateSelectedNodeData({ timeoutMs: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-50 text-neutral-900 font-bold px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 shadow-2xs transition-all"
                />
              </div>
            )}

            {/* Precision Telemetry Info Card */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] space-y-2 mt-1">
              <div className="flex items-center justify-between text-neutral-700">
                <span className="text-neutral-500 uppercase">Total Trial Epoch:</span>
                <span className="font-bold text-neutral-900">
                  {(selectedNode.data.dwell ?? 1000) + (selectedNode.data.isi ?? 350)} ms
                </span>
              </div>
              <div className="flex items-center justify-between text-neutral-700">
                <span className="text-neutral-500 uppercase">144Hz Quantization:</span>
                <span className="text-teal-700 font-bold">
                  ~{Math.round(((selectedNode.data.dwell ?? 1000) / 1000) * 144)} frames
                </span>
              </div>
              <div className="flex items-center justify-between text-neutral-700">
                <span className="text-neutral-500 uppercase">Sync Engine:</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Sub-ms RAF Locked
                </span>
              </div>
            </div>
          </div>

          {/* 3. BIDS SCHEMA PARAMETERS PANEL */}
          <div className={selectedTab === 'bids' ? 'flex flex-col gap-3.5 text-xs' : 'hidden'}>
            {/* Metadata Badges */}
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-neutral-500 text-[10px] uppercase block">Standard</span>
                <strong className="text-neutral-900">BIDS 1.8.2</strong>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-neutral-500 text-[10px] uppercase block">Modality</span>
                <strong className="text-neutral-900">beh / cognitive</strong>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 col-span-2">
                <span className="text-neutral-500 text-[10px] uppercase block">Schema Type</span>
                <strong className="text-teal-700 font-mono">bids.{selectedNode.type}</strong>
              </div>
            </div>

            {/* Declarative BIDS Mapping Code Block with Copy Action */}
            <div>
              <div className="flex items-center justify-between pb-1.5 font-mono text-[11px] text-neutral-900 uppercase font-bold">
                <span>Declarative BIDS Mapping</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(
                      JSON.stringify(
                        {
                          node_id: selectedNode.id,
                          type: `bids.${selectedNode.type}`,
                          parameters: {
                            title: selectedNode.data.title,
                            text: selectedNode.data.text || undefined,
                            ink_color: selectedNode.data.ink || undefined,
                            dwell_ms: selectedNode.data.dwell ?? undefined,
                            isi_ms: selectedNode.data.isi ?? undefined,
                            congruency: selectedNode.data.congruency || undefined,
                            allowed_keys: selectedNode.data.allowedKeys || undefined,
                            condition: selectedNode.data.condition || undefined,
                            repetitions: selectedNode.data.repetitions ?? undefined,
                            bids_schema: selectedNode.data.bids || {},
                          },
                        },
                        null,
                        2
                      )
                    );
                    showToast('BIDS JSON specification copied');
                  }}
                  className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-teal-700 hover:text-teal-800 shadow-2xs text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined text-[13px]">content_copy</span> Copy
                </button>
              </div>
              <div className="bg-slate-50 text-neutral-800 p-3.5 rounded-xl font-mono text-[11px] leading-relaxed border border-slate-200 shadow-inner max-h-56 overflow-y-auto">
                <pre>
                  {JSON.stringify(
                    {
                      node_id: selectedNode.id,
                      type: `bids.${selectedNode.type}`,
                      parameters: {
                        title: selectedNode.data.title,
                        text: selectedNode.data.text || undefined,
                        ink_color: selectedNode.data.ink || undefined,
                        dwell_ms: selectedNode.data.dwell ?? undefined,
                        isi_ms: selectedNode.data.isi ?? undefined,
                        congruency: selectedNode.data.congruency || undefined,
                        allowed_keys: selectedNode.data.allowedKeys || undefined,
                        condition: selectedNode.data.condition || undefined,
                        repetitions: selectedNode.data.repetitions ?? undefined,
                        bids_schema: selectedNode.data.bids || {},
                      },
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-neutral-400 font-mono text-xs flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-neutral-300 text-[32px]">touch_app</span>
          <span>Click a node on the canvas to inspect and edit its parameters.</span>
        </div>
      )}
    </aside>
  );
};

export default SelectedNodeInspector;
