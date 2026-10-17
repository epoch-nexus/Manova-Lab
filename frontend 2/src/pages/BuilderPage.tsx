import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
  BackgroundVariant,
} from '@xyflow/react';
import type { Node, Edge, Connection, NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import api from '../services/api';
import Header from '../components/Header';
import SelectedNodeInspector from '../components/SelectedNodeInspector';
import type { ProtocolNodeData, CustomNodeType } from '../components/SelectedNodeInspector';
export type { ProtocolNodeData, CustomNodeType };
export { SelectedNodeInspector };

// -------------------------------------------------------------
// Custom React Flow Node Components
// -------------------------------------------------------------
const InstructionNodeComponent: React.FC<NodeProps<CustomNodeType>> = ({ id, data, selected }) => {
  return (
    <div
      className={`w-64 bg-white rounded-2xl shadow-xs border transition-all select-none ${
        selected
          ? 'ring-2 ring-teal-500 border-teal-400 shadow-md'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <div
        className={`flex items-center justify-between pb-2 px-3.5 pt-3 rounded-t-2xl border-b ${
          selected ? 'bg-teal-50/70 border-teal-100' : 'bg-slate-50 border-slate-200/80'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-teal-700">assignment</span>
          <span className="font-mono text-[11px] text-slate-900 uppercase font-bold truncate max-w-[130px]">
            {data.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {selected && (
            <span className="px-2.5 py-0.5 bg-teal-700 text-white rounded-full text-[9px] font-mono uppercase font-bold tracking-wider">
              ACTIVE
            </span>
          )}
          {data.onDeleteNode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onDeleteNode?.(id);
              }}
              className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer transition-colors"
              title="Delete node"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-3.5">
        <div className="font-heading font-bold text-xs text-slate-900 mb-1">{data.title}</div>
        <p className="text-[11px] text-slate-500 leading-tight line-clamp-2">
          {data.description || 'Participant instruction briefing and consent form.'}
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3.5 !h-3.5 !bg-teal-600 !border-2 !border-white !-right-1.5 hover:!scale-125 transition-transform"
      />
    </div>
  );
};

const StimulusNodeComponent: React.FC<NodeProps<CustomNodeType>> = ({ id, data, selected }) => {
  return (
    <div
      className={`w-64 bg-white rounded-2xl shadow-xs border transition-all select-none ${
        selected
          ? 'ring-2 ring-teal-500 border-teal-400 shadow-md'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3.5 !h-3.5 !bg-teal-600 !border-2 !border-white !-left-1.5 hover:!scale-125 transition-transform"
      />

      <div
        className={`flex items-center justify-between pb-2 px-3.5 pt-3 rounded-t-2xl border-b ${
          selected ? 'bg-teal-50/70 border-teal-100' : 'bg-slate-50 border-slate-200/80'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-teal-700">visibility</span>
          <span className="font-mono text-[11px] text-slate-900 uppercase font-bold truncate max-w-[130px]">
            {data.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {selected && (
            <span className="px-2.5 py-0.5 bg-teal-700 text-white rounded-full text-[9px] font-mono uppercase font-bold tracking-wider">
              ACTIVE
            </span>
          )}
          {data.onDeleteNode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onDeleteNode?.(id);
              }}
              className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer transition-colors"
              title="Delete node"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-3.5">
        <div className="font-heading font-bold text-xs text-slate-900 mb-2">{data.title}</div>
        <div className="flex flex-col items-center justify-center h-16 bg-slate-50 rounded-xl mb-2.5 border border-slate-200">
          <span
            className="text-xl font-extrabold font-heading tracking-wider transition-colors"
            style={{ color: data.ink || '#0D9488' }}
          >
            {data.text || '+'}
          </span>
          <div className="flex items-center gap-2 mt-0.5 text-[9px] font-mono text-slate-400">
            <span>Dwell: {data.dwell ?? 1000}ms</span>
            <span>•</span>
            <span>ISI: {data.isi ?? 350}ms</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-600">
          <span className="capitalize">{data.congruency || 'congruent'}</span>
          <span className="text-teal-700 font-bold">{data.ink || '#0D9488'}</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3.5 !h-3.5 !bg-teal-600 !border-2 !border-white !-right-1.5 hover:!scale-125 transition-transform"
      />
    </div>
  );
};

const ResponseNodeComponent: React.FC<NodeProps<CustomNodeType>> = ({ id, data, selected }) => {
  return (
    <div
      className={`w-64 bg-white rounded-2xl shadow-xs border transition-all select-none ${
        selected
          ? 'ring-2 ring-teal-500 border-teal-400 shadow-md'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3.5 !h-3.5 !bg-teal-600 !border-2 !border-white !-left-1.5 hover:!scale-125 transition-transform"
      />

      <div
        className={`flex items-center justify-between pb-2 px-3.5 pt-3 rounded-t-2xl border-b ${
          selected ? 'bg-teal-50/70 border-teal-100' : 'bg-slate-50 border-slate-200/80'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-teal-700">keyboard</span>
          <span className="font-mono text-[11px] text-slate-900 uppercase font-bold truncate max-w-[130px]">
            {data.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {selected && (
            <span className="px-2.5 py-0.5 bg-teal-700 text-white rounded-full text-[9px] font-mono uppercase font-bold tracking-wider">
              ACTIVE
            </span>
          )}
          {data.onDeleteNode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onDeleteNode?.(id);
              }}
              className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer transition-colors"
              title="Delete node"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-3.5">
        <div className="font-heading font-bold text-xs text-slate-900 mb-2">{data.title}</div>
        <div className="flex flex-wrap gap-1.5 mb-2.5 font-mono text-[10px]">
          {(data.allowedKeys || ['D', 'F', 'J', 'K']).map((k) => (
            <span key={k} className="px-2.5 py-0.5 bg-slate-50 text-slate-800 font-bold rounded-full border border-slate-200 shadow-2xs">
              {k}
            </span>
          ))}
        </div>
        <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between">
          <span>Timeout: {data.timeoutMs ?? 1200}ms</span>
          <span className="text-teal-700 font-bold">Sub-ms Precision</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3.5 !h-3.5 !bg-teal-600 !border-2 !border-white !-right-1.5 hover:!scale-125 transition-transform"
      />
    </div>
  );
};

const BranchNodeComponent: React.FC<NodeProps<CustomNodeType>> = ({ id, data, selected }) => {
  return (
    <div
      className={`w-64 bg-white rounded-2xl shadow-xs border transition-all select-none ${
        selected
          ? 'ring-2 ring-teal-500 border-teal-400 shadow-md'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3.5 !h-3.5 !bg-teal-600 !border-2 !border-white !-left-1.5 hover:!scale-125 transition-transform"
      />

      <div
        className={`flex items-center justify-between pb-2 px-3.5 pt-3 rounded-t-2xl border-b ${
          selected ? 'bg-teal-50/70 border-teal-100' : 'bg-slate-50 border-slate-200/80'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-teal-700">alt_route</span>
          <span className="font-mono text-[11px] text-slate-900 uppercase font-bold truncate max-w-[130px]">
            {data.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {selected && (
            <span className="px-2.5 py-0.5 bg-teal-700 text-white rounded-full text-[9px] font-mono uppercase font-bold tracking-wider">
              ACTIVE
            </span>
          )}
          {data.onDeleteNode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onDeleteNode?.(id);
              }}
              className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer transition-colors"
              title="Delete node"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-3.5">
        <div className="font-heading font-bold text-xs text-slate-900 mb-1.5">{data.title}</div>
        <div className="text-[10px] font-mono text-slate-600 space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center">
            <span>On Correct:</span> <strong className="text-teal-700">Next Trial →</strong>
          </div>
          <div className="flex justify-between items-center">
            <span>On Timeout:</span> <strong className="text-rose-600">Warning ↓</strong>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="correct"
        className="!w-3.5 !h-3.5 !bg-teal-600 !border-2 !border-white !-right-1.5 hover:!scale-125 transition-transform"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="timeout"
        className="!w-3.5 !h-3.5 !bg-rose-500 !border-2 !border-white !-bottom-1.5 hover:!scale-125 transition-transform"
      />
    </div>
  );
};

const IteratorNodeComponent: React.FC<NodeProps<CustomNodeType>> = ({ id, data, selected }) => {
  return (
    <div
      className={`w-64 bg-white rounded-2xl shadow-xs border transition-all select-none ${
        selected
          ? 'ring-2 ring-teal-500 border-teal-400 shadow-md'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3.5 !h-3.5 !bg-teal-600 !border-2 !border-white !-left-1.5 hover:!scale-125 transition-transform"
      />

      <div
        className={`flex items-center justify-between pb-2 px-3.5 pt-3 rounded-t-2xl border-b ${
          selected ? 'bg-teal-50/70 border-teal-100' : 'bg-slate-50 border-slate-200/80'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-teal-700">sync</span>
          <span className="font-mono text-[11px] text-slate-900 uppercase font-bold truncate max-w-[130px]">
            {data.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {selected && (
            <span className="px-2.5 py-0.5 bg-teal-700 text-white rounded-full text-[9px] font-mono uppercase font-bold tracking-wider">
              ACTIVE
            </span>
          )}
          {data.onDeleteNode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onDeleteNode?.(id);
              }}
              className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer transition-colors"
              title="Delete node"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-3.5">
        <div className="font-heading font-bold text-xs text-neutral-900 mb-1">{data.title}</div>
        <p className="text-[11px] text-neutral-500 mb-2 leading-relaxed">Block loop counterbalancing and Latin square shuffle.</p>
        <div className="text-[10px] font-mono bg-[#FAF9F5] px-2.5 py-1.5 rounded-xl text-neutral-700 flex justify-between border border-neutral-200/60">
          <span>Repetitions:</span>
          <strong>{data.repetitions ?? 12} Blocks</strong>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3.5 !h-3.5 !bg-teal-600 !border-2 !border-white !-right-1.5 hover:!scale-125 transition-transform"
      />
    </div>
  );
};

const nodeTypes = {
  instruction: InstructionNodeComponent,
  stimulus: StimulusNodeComponent,
  response: ResponseNodeComponent,
  branch: BranchNodeComponent,
  iterator: IteratorNodeComponent,
};

// -------------------------------------------------------------
// Default Starter Schema
// -------------------------------------------------------------
const INITIAL_NODES: CustomNodeType[] = [
  {
    id: 'node-inst-1',
    type: 'instruction',
    position: { x: 50, y: 150 },
    data: {
      label: 'INSTRUCTION_01',
      type: 'instruction',
      title: 'Participant Brief & Consent',
      description: 'Welcome to the experiment. Follow the onscreen prompts and respond as accurately as possible.',
      bids: {
        trial_type: 'instruction',
        task_name: 'cognitive_protocol',
        consent_required: true,
      },
    },
  },
  {
    id: 'node-fix-2',
    type: 'stimulus',
    position: { x: 380, y: 150 },
    data: {
      label: 'STIMULUS_FIXATION',
      type: 'stimulus',
      title: 'Central Fixation Cross (+)',
      text: '+',
      ink: '#0284c7',
      dwell: 500,
      isi: 100,
      congruency: 'neutral',
      bids: {
        trial_type: 'fixation',
        symbol: '+',
        duration_ms: 500,
        sync: 'hardware_raf',
      },
    },
  },
  {
    id: 'node-target-3',
    type: 'stimulus',
    position: { x: 720, y: 150 },
    data: {
      label: 'STIMULUS_TARGET',
      type: 'stimulus',
      title: 'Target Stimulus',
      text: 'START',
      ink: '#10b981',
      dwell: 1000,
      isi: 350,
      congruency: 'neutral',
      bids: {
        trial_type: 'visual_text',
        stimulus: 'START',
        duration_ms: 1000,
      },
    },
  },
  {
    id: 'node-resp-4',
    type: 'response',
    position: { x: 1060, y: 150 },
    data: {
      label: 'RESPONSE_CAPTURE',
      type: 'response',
      title: 'Raw Keydown Dispatch',
      allowedKeys: ['Space'],
      timeoutMs: 2000,
      bids: {
        trial_type: 'response_capture',
        allowed_inputs: ['Space'],
        timeout_ms: 2000,
        precision: 'submillisecond_raf',
      },
    },
  },
];

const INITIAL_EDGES: Edge[] = [
  {
    id: 'e1-2',
    source: 'node-inst-1',
    target: 'node-fix-2',
    animated: true,
    style: { stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '4 4' },
  },
  {
    id: 'e2-3',
    source: 'node-fix-2',
    target: 'node-target-3',
    style: { stroke: '#10b981', strokeWidth: 2.5 },
  },
  {
    id: 'e3-4',
    source: 'node-target-3',
    target: 'node-resp-4',
    style: { stroke: '#10b981', strokeWidth: 2.5 },
  },
];

// -------------------------------------------------------------
// Inner Builder Canvas Component (has access to useReactFlow)
// -------------------------------------------------------------
function BuilderCanvas() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id, experimentId } = useParams<{ id?: string; experimentId?: string }>();
  const activeId =
    experimentId ||
    id ||
    searchParams.get('id') ||
    searchParams.get('experiment_id') ||
    searchParams.get('experimentId') ||
    undefined;
  const reactFlowInstance = useReactFlow();

  // Active Experiment & Loading States
  const [experiment, setExperiment] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // React Flow State Hooks
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNodeType>(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(INITIAL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('node-target-3');
  const [selectedTab, setSelectedTab] = useState<'visual' | 'bids' | 'timing'>('visual');

  // Diagnostics and Validation State
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [validationTimestamp, setValidationTimestamp] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Node Deletion Callback
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
      }
      setIsDirty(true);
      showToast('Node deleted from graph');
    },
    [selectedNodeId, setNodes, setEdges]
  );

  // Inject onDeleteNode into node data
  const decoratedNodes = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onDeleteNode: handleDeleteNode,
      },
    }));
  }, [nodes, handleDeleteNode]);

  // Selected Node Reference
  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  // 1. Fetch Protocol Schema on Page Mount
  const fetchProtocol = useCallback(async () => {
    if (!activeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setNotFound(false);

    try {
      const data = await api.experiments.get(activeId);
      if (!data) {
        setNotFound(true);
        return;
      }

      setExperiment(data);

      // Hydrate saved React Flow graph if exists
      if (data.config?.nodeGraph?.nodes && Array.isArray(data.config.nodeGraph.nodes)) {
        setNodes(data.config.nodeGraph.nodes);
        if (data.config.nodeGraph.edges && Array.isArray(data.config.nodeGraph.edges)) {
          setEdges(data.config.nodeGraph.edges);
        }
        if (data.config.nodeGraph.nodes.length > 0) {
          setSelectedNodeId(data.config.nodeGraph.nodes[0].id);
        }
      } else if (data.trials && data.trials.length > 0) {
        // Synthesize nodes & edges from trials dynamically
        const dynamicNodes: CustomNodeType[] = data.trials.map((trial: any, idx: number) => {
          const stim = trial.stimulus || {};
          const expResp = trial.expectedResponse || {};
          const type: ProtocolNodeData['type'] = stim.type === 'text' ? 'stimulus' : 'response';
          return {
            id: trial.id || `trial-node-${idx}`,
            type,
            position: { x: 80 + idx * 340, y: 150 + (idx % 2) * 60 },
            data: {
              label: trial.label || `TRIAL_${trial.orderIndex || idx + 1}`,
              type,
              title: trial.label || `Trial #${trial.orderIndex || idx + 1}`,
              description: trial.instructions || '',
              text: stim.content || '',
              ink: stim.styling?.color || '#10b981',
              dwell: trial.timingConfig?.stimulusDurationMs || 1000,
              isi: trial.timingConfig?.preStimulusDelayMs || 350,
              congruency: stim.metadata?.congruency || 'neutral',
              allowedKeys: expResp.allowedKeys || [],
              correctResponse: expResp.correctResponse,
              timeoutMs: trial.timingConfig?.responseTimeoutMs || 1500,
              bids: {
                trial_id: trial.id,
                order_index: trial.orderIndex,
                stimulus_type: stim.type || 'text',
                stimulus: stim.content || stim.url || '',
                allowed_keys: expResp.allowedKeys || [],
                correct_response: expResp.correctResponse || null,
              },
            },
          };
        });

        const dynamicEdges: Edge[] = [];
        for (let i = 0; i < dynamicNodes.length - 1; i++) {
          dynamicEdges.push({
            id: `e-${dynamicNodes[i].id}-${dynamicNodes[i + 1].id}`,
            source: dynamicNodes[i].id,
            target: dynamicNodes[i + 1].id,
            style: { stroke: '#10b981', strokeWidth: 2 },
          });
        }

        setNodes(dynamicNodes);
        setEdges(dynamicEdges);
        if (dynamicNodes.length > 0) setSelectedNodeId(dynamicNodes[0].id);
      } else {
        // Clean starter template for fresh protocol
        setNodes(INITIAL_NODES);
        setEdges(INITIAL_EDGES);
        setSelectedNodeId('node-target-3');
      }
    } catch (err: any) {
      console.warn('Could not load protocol schema from backend:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [activeId, setNodes, setEdges]);

  useEffect(() => {
    if (!activeId) {
      // Auto-initialize a fresh experiment with a unique ID so user is not stuck on PROTOCOL-DRAFT
      const initDraft = async () => {
        try {
          const uniqueSlug = `protocol-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
          const created = await api.experiments.create({
            title: 'New Cognitive Protocol',
            preset: 'Visual Stroop',
            status: 'DRAFT',
            description: 'Cognitive protocol assay.',
            publicSlug: uniqueSlug,
            config: {
              displayMode: 'fullscreen',
              backgroundColor: '#0F172A',
              nodeGraph: { nodes: INITIAL_NODES, edges: INITIAL_EDGES },
              bidsSchema: {
                specification: 'BIDS-EXP-SPEC-1.8.2',
                updatedAt: new Date().toISOString(),
                totalNodes: INITIAL_NODES.length,
                totalEdges: INITIAL_EDGES.length,
              },
            },
          });
          const newId = created?.id || created?.data?.id || created?.publicSlug;
          if (newId) {
            setExperiment(created);
            navigate(`/builder?id=${newId}`, { replace: true });
          }
        } catch (e) {
          console.warn('Auto-init draft offline/fallback:', e);
        } finally {
          setLoading(false);
        }
      };
      initDraft();
    } else {
      fetchProtocol();
    }
  }, [activeId, fetchProtocol, navigate]);

  // Connect Handle edges
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: '#10b981', strokeWidth: 2 },
          },
          eds
        )
      );
      setIsDirty(true);
    },
    [setEdges]
  );

  // 2. Bi-directional Form Editing: Connects form controls directly to selected node's data
  const updateSelectedNodeData = (updates: Partial<ProtocolNodeData>) => {
    if (!selectedNodeId) return;
    setIsDirty(true);
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeId) {
          const mergedData = { ...node.data, ...updates };
          // Live sync declarative BIDS schema
          mergedData.bids = {
            ...mergedData.bids,
            ...(updates.text !== undefined ? { text: updates.text } : {}),
            ...(updates.ink !== undefined ? { ink_color: updates.ink } : {}),
            ...(updates.dwell !== undefined ? { duration_ms: updates.dwell } : {}),
            ...(updates.isi !== undefined ? { isi_ms: updates.isi } : {}),
            ...(updates.congruency !== undefined ? { congruency: updates.congruency } : {}),
            ...(updates.allowedKeys !== undefined ? { allowed_keys: updates.allowedKeys } : {}),
          };
          return { ...node, data: mergedData };
        }
        return node;
      })
    );
  };

  // 3. Drag-and-Drop from Palette
  const onDragStartFromPalette = (e: React.DragEvent, type: ProtocolNodeData['type']) => {
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOverCanvas = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDropOnCanvas = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/reactflow') as ProtocolNodeData['type'];
      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      const timestamp = Date.now();
      const newId = `node_${type}_${timestamp}`;

      let label = `${type.toUpperCase()}_${nodes.length + 1}`;
      let title = `${type.charAt(0).toUpperCase() + type.slice(1)} Block`;
      let text = 'STIMULUS';
      let ink = '#10b981';
      let dwell = 1000;
      let isi = 350;
      let allowedKeys = ['D', 'F', 'J', 'K'];

      if (type === 'instruction') {
        label = `INSTRUCT_${nodes.length + 1}`;
        title = 'Instruction & Consent Form';
        text = 'Read instructions carefully before beginning.';
      } else if (type === 'response') {
        label = `RESP_${nodes.length + 1}`;
        title = 'Keypress Collector';
      } else if (type === 'branch') {
        label = `BRANCH_${nodes.length + 1}`;
        title = 'Contingency Router';
      } else if (type === 'iterator') {
        label = `ITER_${nodes.length + 1}`;
        title = 'Block Counterbalance';
      }

      const newNode: CustomNodeType = {
        id: newId,
        type,
        position,
        data: {
          label,
          type,
          title,
          text,
          ink,
          dwell,
          isi,
          congruency: 'congruent',
          allowedKeys,
          timeoutMs: 1200,
          bids: {
            node_id: newId,
            type: `bids.${type}`,
            created_at: new Date().toISOString(),
          },
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setSelectedNodeId(newId);
      setIsDirty(true);
      showToast(`Added ${type} node to canvas`);
    },
    [reactFlowInstance, nodes.length, setNodes]
  );

  // 4. Save Protocol (PUT /api/experiments/:id or POST /api/experiments)
  const handleSaveProtocol = async () => {
    setSaving(true);
    try {
      let targetExpId = activeId || experiment?.id;

      if (!targetExpId) {
        // Create new experiment in database and redirect to /builder?id={new_id}
        const uniqueSlug = `protocol-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        const created = await api.experiments.create({
          title: experiment?.title || 'Cognitive Protocol',
          preset: 'Visual Stroop',
          status: 'DRAFT',
          description: experiment?.description || 'Cognitive protocol assay.',
          publicSlug: uniqueSlug,
          config: {
            displayMode: 'fullscreen',
            backgroundColor: '#0F172A',
            nodeGraph: { nodes, edges },
            bidsSchema: {
              specification: 'BIDS-EXP-SPEC-1.8.2',
              updatedAt: new Date().toISOString(),
              totalNodes: nodes.length,
              totalEdges: edges.length,
            },
          },
        });

        const newId = created.id || created.data?.id || created.publicSlug;
        if (newId) {
          setExperiment(created);
          targetExpId = newId;
          navigate(`/builder?id=${newId}`, { replace: true });
          setIsDirty(false);
          showToast(`Protocol created & saved: ID ${newId.slice(0, 8)}...`);
          return;
        }
      }

      await api.experiments.update(targetExpId, {
        title: experiment?.title || 'Cognitive Protocol',
        config: {
          ...(experiment?.config || {}),
          nodeGraph: { nodes, edges },
          bidsSchema: {
            specification: 'BIDS-EXP-SPEC-1.8.2',
            updatedAt: new Date().toISOString(),
            totalNodes: nodes.length,
            totalEdges: edges.length,
          },
        },
      });

      setIsDirty(false);
      showToast('Protocol specification saved to backend!');
    } catch (err: any) {
      console.warn('Save failed:', err);
      showToast(`Protocol save error: ${err.message || 'Offline'}`);
    } finally {
      setSaving(false);
    }
  };

  // 5. Schema Validation Engine
  const handleValidateSchema = () => {
    const issues: string[] = [];

    // Check for unconnected nodes (except lone root instruction)
    if (nodes.length > 1) {
      nodes.forEach((node) => {
        const hasIncoming = edges.some((e) => e.target === node.id);
        const hasOutgoing = edges.some((e) => e.source === node.id);
        if (!hasIncoming && !hasOutgoing) {
          issues.push(`Node [${node.data.label}] is unconnected in the graph.`);
        }
      });
    }

    // Check timing parameters
    nodes.forEach((node) => {
      if (node.type === 'stimulus') {
        if (!node.data.text?.trim()) {
          issues.push(`Stimulus node [${node.data.label}] has an empty text literal.`);
        }
        if ((node.data.dwell ?? 0) <= 0) {
          issues.push(`Stimulus node [${node.data.label}] has non-positive dwell time (${node.data.dwell}ms).`);
        }
        if ((node.data.isi ?? 0) < 0) {
          issues.push(`Stimulus node [${node.data.label}] has negative ISI (${node.data.isi}ms).`);
        }
      }

      if (node.type === 'response') {
        if (!node.data.allowedKeys || node.data.allowedKeys.length === 0) {
          issues.push(`Response node [${node.data.label}] has no allowed keys configured.`);
        }
      }
    });

    setValidationIssues(issues);
    setValidationTimestamp(new Date().toLocaleTimeString());

    if (issues.length === 0) {
      showToast(`Schema Validated: 0 Errors in ${nodes.length} Nodes`);
    } else {
      showToast(`Validation: ${issues.length} issue(s) identified in graph.`);
    }
  };

  // 404 Experiment Not Found View - Organic Card Chassis
  if (notFound) {
    return (
      <div className="min-h-screen bg-[#F0EFEB] flex flex-col font-sans text-neutral-900 pt-16">
        <Header current="builder" />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="bg-white/90 backdrop-blur-md p-8 rounded-3xl border border-[#E3E0D8] shadow-[0_8px_30px_rgba(0,0,0,0.05)] max-w-md w-full flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-200 shadow-2xs">
              <span className="material-symbols-outlined text-[32px]">error_outline</span>
            </div>
            <h2 className="text-xl font-bold font-heading text-neutral-900 mb-2">Protocol Not Found</h2>
            <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
              The experiment identifier <code className="bg-[#FAF9F5] px-2 py-0.5 rounded-full font-mono text-teal-800 border border-neutral-200">{activeId}</code> does not exist or does not belong to your authenticated account.
            </p>
            <button
              onClick={() => navigate('/experiments')}
              className="px-5 py-2.5 bg-neutral-900 hover:bg-black text-white font-mono text-xs uppercase tracking-wider font-bold rounded-full shadow-sm hover:shadow transition-all cursor-pointer"
            >
              ← Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading Skeleton View - Organic Card Chassis
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0EFEB] flex flex-col font-sans text-neutral-900 pt-16">
        <Header current="builder" />
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <div className="bg-white/90 backdrop-blur-md p-8 rounded-3xl border border-[#E3E0D8] shadow-[0_8px_30px_rgba(0,0,0,0.05)] max-w-sm w-full flex flex-col items-center">
            <span className="w-10 h-10 rounded-full border-3 border-teal-600 border-t-transparent animate-spin mb-4"></span>
            <h3 className="font-heading font-bold text-base text-neutral-900">Loading Protocol Specification</h3>
            <p className="text-xs font-mono text-neutral-500 mt-1.5">
              Parsing React Flow nodes, timing constraints &amp; BIDS schemas...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const expCode = experiment?.publicSlug || experiment?.id || activeId || 'PROTOCOL-DRAFT';
  const expTitle = experiment?.title || 'Cognitive Protocol Specification';
  const expVersion = experiment?.version ? `v${experiment.version}` : 'v1.0';
  const expStatus = (experiment?.status || 'DRAFT').toUpperCase();

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans text-neutral-900 pt-16">
      {/* Toast Notification - Organic Pebble Capsule */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900/95 text-white px-5 py-3 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.15)] font-mono text-xs uppercase tracking-wider flex items-center gap-3 border border-neutral-700 backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="material-symbols-outlined text-teal-400 text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Dynamic Header with Live User Profile */}
      <Header current="builder" />

      {/* Dynamic Breadcrumbs & Controls Banner - Crisp White Card */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs mx-4 sm:mx-6 my-3 p-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-neutral-500 font-mono text-xs">
              <Link to="/dashboard" className="hover:text-teal-700 transition-colors font-medium">
                My Experiments
              </Link>
              <span>/</span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-neutral-800 font-bold border border-slate-200 font-mono text-[10px]">{expCode}</span>
              <span>/</span>
              <span className="text-teal-700 font-bold">Node Graph Builder</span>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <h1 className="font-heading font-bold text-xl text-neutral-900 tracking-tight">{expTitle}</h1>
              <span className="px-2.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded-full font-mono text-[10px] uppercase font-bold tracking-wider">
                {expVersion}-{expStatus}
              </span>
              {isDirty && (
                <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full font-mono text-[10px] uppercase font-bold tracking-wider">
                  Unsaved Changes
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <button
              onClick={() => navigate(`/run/${expCode}`)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-neutral-800 uppercase tracking-wider font-semibold rounded-full border border-slate-200 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-teal-600">play_arrow</span>
              <span>Run Sandbox</span>
            </button>

            <button
              onClick={handleValidateSchema}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-neutral-800 uppercase tracking-wider font-semibold rounded-full border border-slate-200 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-teal-700">verified</span>
              <span>Validate Schema</span>
            </button>

            <button
              onClick={handleSaveProtocol}
              disabled={saving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white uppercase tracking-wider font-bold rounded-full border border-teal-700 shadow-2xs hover:shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">
                {saving ? 'hourglass_top' : 'save'}
              </span>
              <span>{saving ? 'Saving...' : 'Save Protocol'}</span>
            </button>

            <button
              onClick={async () => {
                await handleSaveProtocol();
                if (activeId) {
                  try {
                    await api.experiments.publish(activeId);
                    showToast('Protocol compiled & published to edge nodes!');
                    setTimeout(() => navigate('/dashboard'), 800);
                  } catch (e: any) {
                    showToast(`Publish error: ${e.message}`);
                  }
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-neutral-900 hover:bg-black text-white uppercase tracking-wider font-bold rounded-full border border-neutral-900 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
              <span>Compile &amp; Publish</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Canvas + Floating Sidebars Workspace */}
      <div className="flex-1 flex flex-col xl:flex-row gap-4 px-4 sm:px-6 pb-4 sm:pb-6 overflow-hidden relative">
        {/* Left Palette: HTML5 Drag and Drop Floating Card */}
        <aside className="w-full xl:w-72 bg-white rounded-2xl p-5 flex flex-col gap-4 shrink-0 border border-slate-200 shadow-xs z-20">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-xs text-neutral-900 uppercase tracking-wider font-bold">Node Palette</span>
              <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 font-mono text-[10px] text-neutral-600 rounded-full font-bold tracking-wider uppercase">DRAG TO ADD</span>
            </div>
            <p className="text-[11px] text-neutral-500 leading-snug">
              Drag node templates onto the canvas to construct your experimental workflow.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[380px] xl:max-h-[520px] pr-1">
            {/* Instruction Node */}
            <div
              draggable
              onDragStart={(e) => onDragStartFromPalette(e, 'instruction')}
              className="p-3.5 bg-slate-50/70 hover:bg-white rounded-xl border border-slate-200 hover:border-teal-500 hover:shadow-xs transition-all cursor-grab active:cursor-grabbing group select-none"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-neutral-900">
                  <span className="material-symbols-outlined text-[16px] text-teal-700">assignment</span>
                  <span>Instruction</span>
                </div>
                <span className="px-2.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-mono rounded-full uppercase font-bold tracking-wider">Consent</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-snug">Participant briefing, consent, and task rules.</p>
            </div>

            {/* Stimulus Node */}
            <div
              draggable
              onDragStart={(e) => onDragStartFromPalette(e, 'stimulus')}
              className="p-3.5 bg-slate-50/70 hover:bg-white rounded-xl border border-slate-200 hover:border-teal-500 hover:shadow-xs transition-all cursor-grab active:cursor-grabbing group select-none"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-neutral-900">
                  <span className="material-symbols-outlined text-[16px] text-teal-700">visibility</span>
                  <span>Stimulus</span>
                </div>
                <span className="px-2.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-mono rounded-full uppercase font-bold tracking-wider">Visual/Text</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-snug">Fixation cross, SVG targets, and ISI duration.</p>
            </div>

            {/* Response Node */}
            <div
              draggable
              onDragStart={(e) => onDragStartFromPalette(e, 'response')}
              className="p-3.5 bg-slate-50/70 hover:bg-white rounded-xl border border-slate-200 hover:border-teal-500 hover:shadow-xs transition-all cursor-grab active:cursor-grabbing group select-none"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-neutral-900">
                  <span className="material-symbols-outlined text-[16px] text-teal-700">keyboard</span>
                  <span>Response</span>
                </div>
                <span className="px-2.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-mono rounded-full uppercase font-bold tracking-wider">Key/RT</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-snug">Keypress capture and millisecond precision.</p>
            </div>

            {/* Branch Node */}
            <div
              draggable
              onDragStart={(e) => onDragStartFromPalette(e, 'branch')}
              className="p-3.5 bg-slate-50/70 hover:bg-white rounded-xl border border-slate-200 hover:border-teal-500 hover:shadow-xs transition-all cursor-grab active:cursor-grabbing group select-none"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-neutral-900">
                  <span className="material-symbols-outlined text-[16px] text-teal-700">alt_route</span>
                  <span>Branch Route</span>
                </div>
                <span className="px-2.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-mono rounded-full uppercase font-bold tracking-wider">Condition</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-snug">Conditional routing based on correctness.</p>
            </div>

            {/* Block Iterator Node */}
            <div
              draggable
              onDragStart={(e) => onDragStartFromPalette(e, 'iterator')}
              className="p-3.5 bg-slate-50/70 hover:bg-white rounded-xl border border-slate-200 hover:border-teal-500 hover:shadow-xs transition-all cursor-grab active:cursor-grabbing group select-none"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-neutral-900">
                  <span className="material-symbols-outlined text-[16px] text-teal-700">sync</span>
                  <span>Block Iterator</span>
                </div>
                <span className="px-2.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-mono rounded-full uppercase font-bold tracking-wider">Loop</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-snug">Trial looping and Latin square balancing.</p>
            </div>
          </div>

          {/* Graph Diagnostics Panel - Soft Organic Box */}
          <div className="mt-auto p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs">
            <div className="flex items-center justify-between mb-1.5 uppercase font-bold text-neutral-900">
              <span>Graph Diagnostics</span>
              {validationIssues.length === 0 ? (
                <span className="text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span> 0 ERRORS
                </span>
              ) : (
                <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> {validationIssues.length} ISSUES
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] text-neutral-600">
              <div>Nodes: <strong className="text-neutral-900">{nodes.length}</strong></div>
              <div>Edges: <strong className="text-neutral-900">{edges.length}</strong></div>
              <div className="col-span-2">Schema: <strong className="text-neutral-900">BIDS-EXP-SPEC-1.8.2</strong></div>
              {validationTimestamp && (
                <div className="col-span-2 text-[10px] text-neutral-400 mt-1">
                  Validated at {validationTimestamp}
                </div>
              )}
            </div>
            {validationIssues.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-slate-200 max-h-24 overflow-y-auto space-y-1">
                {validationIssues.map((issue, idx) => (
                  <div key={idx} className="text-[10px] text-amber-800 leading-tight flex items-start gap-1">
                    <span>⚠</span>
                    <span>{issue}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Center: Interactive React Flow Workspace Floating Canvas */}
        <main
          className="flex-1 h-[720px] xl:h-auto min-h-[640px] relative bg-[#fafafa] rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
          onDragOver={onDragOverCanvas}
          onDrop={onDropOnCanvas}
        >
          <ReactFlow
            nodes={decoratedNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: '#0D9488', strokeWidth: 2 },
            }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="#CBD5E1" />
            <Controls className="!bg-white !border !border-slate-200 !shadow-xs !rounded-xl !p-1" />
            <MiniMap
              nodeColor={(n) => {
                if (n.type === 'instruction') return '#0D9488';
                if (n.type === 'stimulus') return '#0284C7';
                if (n.type === 'response') return '#6366F1';
                if (n.type === 'branch') return '#F59E0B';
                return '#64748B';
              }}
              className="!bg-white !border !border-slate-200 !rounded-xl !shadow-xs"
              maskColor="rgba(248, 250, 252, 0.7)"
            />
          </ReactFlow>
        </main>

        {/* Right Inspector: Synchronized Live with Selected Node Floating Card */}
        <SelectedNodeInspector
          selectedNode={selectedNode}
          selectedTab={selectedTab}
          setSelectedTab={setSelectedTab}
          updateSelectedNodeData={updateSelectedNodeData}
          showToast={showToast}
        />
      </div>

      {/* Protocol Builder Footer - Clean Pebble Summary */}
      <footer className="w-full bg-white border-t border-slate-200 py-3 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono text-neutral-500">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-teal-500"></span>
            <span className="text-neutral-800 uppercase font-semibold">
              EXPERIMENT: {expCode} ({nodes.length} NODES)
            </span>
            <span>•</span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-neutral-600 text-[10px] uppercase font-bold tracking-wider">
              BIDS SPEC v1.8.2 ACTIVE
            </span>
          </div>
          <div>© 2025 Manova Labs Precision Research Suite.</div>
        </div>
      </footer>
    </div>
  );
}

// -------------------------------------------------------------
// Root Export wrapped with ReactFlowProvider
// -------------------------------------------------------------
export default function BuilderPage() {
  return (
    <ReactFlowProvider>
      <BuilderCanvas />
    </ReactFlowProvider>
  );
}
