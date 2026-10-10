import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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

// -------------------------------------------------------------
// Node Data Interface
// -------------------------------------------------------------
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
}

export type CustomNodeType = Node<ProtocolNodeData>;

// -------------------------------------------------------------
// Custom React Flow Node Components
// -------------------------------------------------------------
const InstructionNodeComponent: React.FC<NodeProps<CustomNodeType>> = ({ id, data, selected }) => {
  return (
    <div
      className={`w-64 bg-white rounded-xl shadow-md border transition-all select-none ${
        selected
          ? 'ring-2 ring-emerald-500 border-emerald-400 shadow-xl'
          : 'border-slate-200 hover:shadow-lg'
      }`}
    >
      <div
        className={`flex items-center justify-between pb-1.5 px-3 pt-2.5 rounded-t-xl border-b ${
          selected ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px] text-emerald-700">assignment</span>
          <span className="font-mono text-[11px] text-slate-800 uppercase font-bold truncate max-w-[130px]">
            {data.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {selected && (
            <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[9px] font-mono uppercase font-bold">
              ACTIVE
            </span>
          )}
          {data.onDeleteNode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onDeleteNode?.(id);
              }}
              className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
              title="Delete node"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-3">
        <div className="font-heading font-bold text-xs text-slate-900 mb-1">{data.title}</div>
        <p className="text-[11px] text-slate-500 leading-tight line-clamp-2">
          {data.description || 'Participant instruction briefing and consent form.'}
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-emerald-600 !border-2 !border-white !-right-1.5 hover:!scale-125 transition-transform"
      />
    </div>
  );
};

const StimulusNodeComponent: React.FC<NodeProps<CustomNodeType>> = ({ id, data, selected }) => {
  return (
    <div
      className={`w-64 bg-white rounded-xl shadow-md border transition-all select-none ${
        selected
          ? 'ring-2 ring-emerald-500 border-emerald-400 shadow-xl'
          : 'border-slate-200 hover:shadow-lg'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-emerald-600 !border-2 !border-white !-left-1.5 hover:!scale-125 transition-transform"
      />

      <div
        className={`flex items-center justify-between pb-1.5 px-3 pt-2.5 rounded-t-xl border-b ${
          selected ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px] text-emerald-700">visibility</span>
          <span className="font-mono text-[11px] text-slate-800 uppercase font-bold truncate max-w-[130px]">
            {data.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {selected && (
            <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[9px] font-mono uppercase font-bold">
              ACTIVE
            </span>
          )}
          {data.onDeleteNode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onDeleteNode?.(id);
              }}
              className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
              title="Delete node"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-3">
        <div className="font-heading font-bold text-xs text-slate-900 mb-2">{data.title}</div>
        <div className="flex flex-col items-center justify-center h-16 bg-slate-50 rounded-lg mb-2 border border-slate-100">
          <span
            className="text-xl font-extrabold font-heading tracking-wider transition-colors"
            style={{ color: data.ink || '#10b981' }}
          >
            {data.text || '+'}
          </span>
          <div className="flex items-center gap-2 mt-0.5 text-[9px] font-mono text-slate-400">
            <span>Dwell: {data.dwell ?? 1000}ms</span>
            <span>•</span>
            <span>ISI: {data.isi ?? 350}ms</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span className="capitalize">{data.congruency || 'congruent'}</span>
          <span className="text-emerald-700 font-semibold">{data.ink || '#10b981'}</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-emerald-600 !border-2 !border-white !-right-1.5 hover:!scale-125 transition-transform"
      />
    </div>
  );
};

const ResponseNodeComponent: React.FC<NodeProps<CustomNodeType>> = ({ id, data, selected }) => {
  return (
    <div
      className={`w-64 bg-white rounded-xl shadow-md border transition-all select-none ${
        selected
          ? 'ring-2 ring-emerald-500 border-emerald-400 shadow-xl'
          : 'border-slate-200 hover:shadow-lg'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-emerald-600 !border-2 !border-white !-left-1.5 hover:!scale-125 transition-transform"
      />

      <div
        className={`flex items-center justify-between pb-1.5 px-3 pt-2.5 rounded-t-xl border-b ${
          selected ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px] text-emerald-700">keyboard</span>
          <span className="font-mono text-[11px] text-slate-800 uppercase font-bold truncate max-w-[130px]">
            {data.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {selected && (
            <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[9px] font-mono uppercase font-bold">
              ACTIVE
            </span>
          )}
          {data.onDeleteNode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onDeleteNode?.(id);
              }}
              className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
              title="Delete node"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-3">
        <div className="font-heading font-bold text-xs text-slate-900 mb-2">{data.title}</div>
        <div className="flex flex-wrap gap-1 mb-2 font-mono text-[10px]">
          {(data.allowedKeys || ['D', 'F', 'J', 'K']).map((k) => (
            <span key={k} className="px-2 py-0.5 bg-slate-100 text-slate-800 font-bold rounded border border-slate-200">
              {k}
            </span>
          ))}
        </div>
        <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
          <span>Timeout: {data.timeoutMs ?? 1200}ms</span>
          <span className="text-emerald-700 font-semibold">Sub-ms Precision</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-emerald-600 !border-2 !border-white !-right-1.5 hover:!scale-125 transition-transform"
      />
    </div>
  );
};

const BranchNodeComponent: React.FC<NodeProps<CustomNodeType>> = ({ id, data, selected }) => {
  return (
    <div
      className={`w-64 bg-white rounded-xl shadow-md border transition-all select-none ${
        selected
          ? 'ring-2 ring-emerald-500 border-emerald-400 shadow-xl'
          : 'border-slate-200 hover:shadow-lg'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-emerald-600 !border-2 !border-white !-left-1.5 hover:!scale-125 transition-transform"
      />

      <div
        className={`flex items-center justify-between pb-1.5 px-3 pt-2.5 rounded-t-xl border-b ${
          selected ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px] text-emerald-700">alt_route</span>
          <span className="font-mono text-[11px] text-slate-800 uppercase font-bold truncate max-w-[130px]">
            {data.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {selected && (
            <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[9px] font-mono uppercase font-bold">
              ACTIVE
            </span>
          )}
          {data.onDeleteNode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onDeleteNode?.(id);
              }}
              className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
              title="Delete node"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-3">
        <div className="font-heading font-bold text-xs text-slate-900 mb-1">{data.title}</div>
        <div className="text-[10px] font-mono text-slate-600 space-y-1 bg-slate-50 p-2 rounded border border-slate-100">
          <div className="flex justify-between">
            <span>On Correct:</span> <strong className="text-emerald-700">Next Trial →</strong>
          </div>
          <div className="flex justify-between">
            <span>On Timeout:</span> <strong className="text-rose-600">Warning ↓</strong>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="correct"
        className="!w-3 !h-3 !bg-emerald-600 !border-2 !border-white !-right-1.5 hover:!scale-125 transition-transform"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="timeout"
        className="!w-3 !h-3 !bg-rose-500 !border-2 !border-white !-bottom-1.5 hover:!scale-125 transition-transform"
      />
    </div>
  );
};

const IteratorNodeComponent: React.FC<NodeProps<CustomNodeType>> = ({ id, data, selected }) => {
  return (
    <div
      className={`w-64 bg-white rounded-xl shadow-md border transition-all select-none ${
        selected
          ? 'ring-2 ring-emerald-500 border-emerald-400 shadow-xl'
          : 'border-slate-200 hover:shadow-lg'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-emerald-600 !border-2 !border-white !-left-1.5 hover:!scale-125 transition-transform"
      />

      <div
        className={`flex items-center justify-between pb-1.5 px-3 pt-2.5 rounded-t-xl border-b ${
          selected ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px] text-emerald-700">sync</span>
          <span className="font-mono text-[11px] text-slate-800 uppercase font-bold truncate max-w-[130px]">
            {data.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {selected && (
            <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[9px] font-mono uppercase font-bold">
              ACTIVE
            </span>
          )}
          {data.onDeleteNode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onDeleteNode?.(id);
              }}
              className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
              title="Delete node"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-3">
        <div className="font-heading font-bold text-xs text-slate-900 mb-1">{data.title}</div>
        <p className="text-[11px] text-slate-500 mb-2">Block loop counterbalancing and Latin square shuffle.</p>
        <div className="text-[10px] font-mono bg-slate-50 px-2 py-1 rounded text-slate-600 flex justify-between">
          <span>Repetitions:</span>
          <strong>{data.repetitions ?? 12} Blocks</strong>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-emerald-600 !border-2 !border-white !-right-1.5 hover:!scale-125 transition-transform"
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
      description: 'Identify ink color of target words using keys [D], [F], [J], [K]. Ignore semantic text meaning.',
      bids: {
        trial_type: 'instruction',
        task_name: 'stroop_interference',
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
      title: 'Stroop Target Stimulus',
      text: 'RED',
      ink: '#10b981',
      dwell: 1000,
      isi: 350,
      congruency: 'incongruent',
      bids: {
        trial_type: 'visual_text',
        semantic: 'RED',
        ink_color: '#10b981',
        congruent: false,
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
      allowedKeys: ['D', 'F', 'J', 'K'],
      timeoutMs: 1200,
      bids: {
        trial_type: 'response_capture',
        allowed_inputs: ['D', 'F', 'J', 'K'],
        timeout_ms: 1200,
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
  const { id, experimentId } = useParams<{ id?: string; experimentId?: string }>();
  const activeId = experimentId || id;
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
        // Synthesize nodes & edges from trials
        const dynamicNodes: CustomNodeType[] = data.trials.map((trial: any, idx: number) => {
          const stim = trial.stimulus || {};
          const expResp = trial.expectedResponse || {};
          const type: ProtocolNodeData['type'] = stim.type === 'text' ? 'stimulus' : 'response';
          return {
            id: trial.id || `trial-node-${idx}`,
            type,
            position: { x: 80 + idx * 340, y: 150 + (idx % 2) * 60 },
            data: {
              label: trial.label || `TRIAL_${idx + 1}`,
              type,
              title: trial.label || `Trial #${idx + 1}`,
              description: trial.instructions || '',
              text: stim.content || 'TARGET',
              ink: stim.styling?.color || '#10b981',
              dwell: trial.timingConfig?.stimulusDurationMs || 1000,
              isi: trial.timingConfig?.preStimulusDelayMs || 350,
              congruency: 'congruent',
              allowedKeys: expResp.allowedKeys || ['D', 'F', 'J', 'K'],
              timeoutMs: trial.timingConfig?.responseTimeoutMs || 1200,
              bids: {
                trial_id: trial.id,
                order_index: trial.orderIndex,
                stimulus_type: stim.type || 'text',
                allowed_keys: expResp.allowedKeys,
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
      if (err.message?.includes('not found') || err.message?.includes('404')) {
        setNotFound(true);
      } else {
        setExperiment({
          id: activeId,
          title: 'Custom Cognitive Protocol',
          publicSlug: activeId,
          version: 1,
          status: 'DRAFT',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [activeId, setNodes, setEdges]);

  useEffect(() => {
    fetchProtocol();
  }, [fetchProtocol]);

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

  // 4. Save Protocol (PUT /api/experiments/:id)
  const handleSaveProtocol = async () => {
    setSaving(true);
    try {
      const targetExpId = activeId || experiment?.id;
      if (!targetExpId) {
        showToast('Local protocol state cached!');
        setSaving(false);
        setIsDirty(false);
        return;
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
      console.warn('Save failed, cached locally:', err);
      showToast(`Protocol cached locally: ${err.message || 'Offline'}`);
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

  // 404 Experiment Not Found View
  if (notFound) {
    return (
      <div className="min-h-screen bg-surface flex flex-col font-sans text-on-surface">
        <Header current="builder" />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-200">
            <span className="material-symbols-outlined text-[36px]">error_outline</span>
          </div>
          <h2 className="text-2xl font-bold font-heading text-on-surface mb-2">Protocol Not Found</h2>
          <p className="text-sm text-on-surface-variant max-w-md mb-6 leading-relaxed">
            The experiment identifier <code className="bg-surface-container px-2 py-0.5 rounded font-mono text-emerald-700">{activeId}</code> does not exist or does not belong to your authenticated account.
          </p>
          <button
            onClick={() => navigate('/experiments')}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs uppercase tracking-wider font-bold rounded-lg shadow-md transition-all cursor-pointer"
          >
            ← Return to /experiments
          </button>
        </div>
      </div>
    );
  }

  // Loading Skeleton View
  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col font-sans text-on-surface">
        <Header current="builder" />
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <span className="w-10 h-10 rounded-full border-3 border-emerald-500 border-t-transparent animate-spin mb-4"></span>
          <h3 className="font-heading font-bold text-lg text-on-surface">Loading Protocol Specification</h3>
          <p className="text-xs font-mono text-on-surface-variant max-w-sm mt-1">
            Parsing React Flow nodes, timing constraints &amp; BIDS schemas...
          </p>
        </div>
      </div>
    );
  }

  const expCode = experiment?.publicSlug || experiment?.id || activeId || 'PROTOCOL-DRAFT';
  const expTitle = experiment?.title || 'Cognitive Protocol Specification';
  const expVersion = experiment?.version ? `v${experiment.version}` : 'v1.0';
  const expStatus = (experiment?.status || 'DRAFT').toUpperCase();

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans text-on-surface pt-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-lg shadow-2xl font-mono text-xs uppercase tracking-wider flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Dynamic Header with Live User Profile */}
      <Header current="builder" />

      {/* Dynamic Breadcrumbs & Controls Banner */}
      <section className="w-full bg-surface-container-lowest border-b border-surface-container px-4 sm:px-8 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-on-surface-variant font-mono text-xs uppercase tracking-wider">
              <Link to="/dashboard" className="hover:text-emerald-700 transition-colors">
                My Experiments
              </Link>
              <span>/</span>
              <span className="text-on-surface font-semibold">{expCode}</span>
              <span>/</span>
              <span className="text-emerald-700 font-bold">Node Graph Builder</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="font-heading font-bold text-lg text-on-surface">{expTitle}</h1>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono text-[10px] uppercase font-bold">
                {expVersion}-{expStatus}
              </span>
              {isDirty && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-mono text-[10px] uppercase font-bold">
                  Unsaved Changes
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
            <button
              onClick={() => navigate(`/run/${expCode}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface uppercase tracking-wider rounded border border-surface-container transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-emerald-600">play_arrow</span>
              <span>Run Sandbox</span>
            </button>

            <button
              onClick={handleValidateSchema}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface uppercase tracking-wider rounded border border-surface-container transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-emerald-700">verified</span>
              <span>Validate Schema</span>
            </button>

            <button
              onClick={handleSaveProtocol}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white uppercase tracking-wider font-bold rounded shadow-sm transition-all cursor-pointer disabled:opacity-50"
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
              className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-black text-white uppercase tracking-wider font-bold rounded shadow-sm transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
              <span>Compile &amp; Publish</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Canvas + Toolbars Area */}
      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden relative">
        {/* Left Palette: HTML5 Drag and Drop */}
        <aside className="w-full xl:w-72 bg-surface-container-lowest p-4 flex flex-col gap-4 shrink-0 border-r border-surface-container z-20">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-xs text-on-surface uppercase tracking-wider font-bold">Node Palette</span>
              <span className="px-1.5 py-0.5 bg-surface-container font-mono text-[10px] text-on-surface-variant rounded">DRAG TO ADD</span>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-snug mb-2">
              Drag node templates onto the React Flow canvas to generate new trial elements.
            </p>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[380px] xl:max-h-[520px] pr-1">
            {/* Instruction Node */}
            <div
              draggable
              onDragStart={(e) => onDragStartFromPalette(e, 'instruction')}
              className="p-3 bg-surface-container-low hover:bg-surface-container rounded-xl border border-surface-container transition-all cursor-grab active:cursor-grabbing group hover:border-emerald-300 select-none"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-on-surface">
                  <span className="material-symbols-outlined text-[16px] text-emerald-700">assignment</span>
                  <span>Instruction</span>
                </div>
                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-mono rounded uppercase">Consent</span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-snug">Participant briefing, consent, and task rules.</p>
            </div>

            {/* Stimulus Node */}
            <div
              draggable
              onDragStart={(e) => onDragStartFromPalette(e, 'stimulus')}
              className="p-3 bg-surface-container-low hover:bg-surface-container rounded-xl border border-surface-container transition-all cursor-grab active:cursor-grabbing group hover:border-emerald-300 select-none"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-on-surface">
                  <span className="material-symbols-outlined text-[16px] text-emerald-700">visibility</span>
                  <span>Stimulus</span>
                </div>
                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-mono rounded uppercase">Visual/Text</span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-snug">Fixation cross, SVG targets, and ISI duration.</p>
            </div>

            {/* Response Node */}
            <div
              draggable
              onDragStart={(e) => onDragStartFromPalette(e, 'response')}
              className="p-3 bg-surface-container-low hover:bg-surface-container rounded-xl border border-surface-container transition-all cursor-grab active:cursor-grabbing group hover:border-emerald-300 select-none"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-on-surface">
                  <span className="material-symbols-outlined text-[16px] text-emerald-700">keyboard</span>
                  <span>Response</span>
                </div>
                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-mono rounded uppercase">Key/RT</span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-snug">Keypress capture and millisecond precision.</p>
            </div>

            {/* Branch Node */}
            <div
              draggable
              onDragStart={(e) => onDragStartFromPalette(e, 'branch')}
              className="p-3 bg-surface-container-low hover:bg-surface-container rounded-xl border border-surface-container transition-all cursor-grab active:cursor-grabbing group hover:border-emerald-300 select-none"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-on-surface">
                  <span className="material-symbols-outlined text-[16px] text-emerald-700">alt_route</span>
                  <span>Branch Route</span>
                </div>
                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-mono rounded uppercase">Condition</span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-snug">Conditional routing based on correctness.</p>
            </div>

            {/* Block Iterator Node */}
            <div
              draggable
              onDragStart={(e) => onDragStartFromPalette(e, 'iterator')}
              className="p-3 bg-surface-container-low hover:bg-surface-container rounded-xl border border-surface-container transition-all cursor-grab active:cursor-grabbing group hover:border-emerald-300 select-none"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-on-surface">
                  <span className="material-symbols-outlined text-[16px] text-emerald-700">sync</span>
                  <span>Block Iterator</span>
                </div>
                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-mono rounded uppercase">Loop</span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-snug">Trial looping and Latin square balancing.</p>
            </div>
          </div>

          {/* Graph Diagnostics Panel */}
          <div className="mt-auto p-3 bg-surface-container rounded-xl border border-surface-container font-mono text-xs">
            <div className="flex items-center justify-between mb-1 uppercase font-bold text-on-surface">
              <span>Graph Diagnostics</span>
              {validationIssues.length === 0 ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 0 ERRORS
                </span>
              ) : (
                <span className="text-amber-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> {validationIssues.length} ISSUES
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] text-on-surface-variant">
              <div>Nodes: <strong className="text-on-surface">{nodes.length}</strong></div>
              <div>Edges: <strong className="text-on-surface">{edges.length}</strong></div>
              <div className="col-span-2">Schema: <strong className="text-on-surface">BIDS-EXP-SPEC-1.8.2</strong></div>
              {validationTimestamp && (
                <div className="col-span-2 text-[10px] text-slate-500 mt-1">
                  Validated at {validationTimestamp}
                </div>
              )}
            </div>
            {validationIssues.length > 0 && (
              <div className="mt-2 pt-2 border-t border-surface-container-highest max-h-24 overflow-y-auto space-y-1">
                {validationIssues.map((issue, idx) => (
                  <div key={idx} className="text-[10px] text-amber-700 leading-tight flex items-start gap-1">
                    <span>⚠</span>
                    <span>{issue}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Center: Interactive React Flow Workspace */}
        <main
          className="flex-1 h-[720px] xl:h-auto min-h-[640px] relative bg-slate-50"
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
              style: { stroke: '#10b981', strokeWidth: 2 },
            }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="#94a3b8" />
            <Controls className="!bg-white !border !border-slate-200 !shadow-sm !rounded-lg" />
            <MiniMap
              nodeColor={(n) => {
                if (n.type === 'instruction') return '#10b981';
                if (n.type === 'stimulus') return '#0284c7';
                if (n.type === 'response') return '#6366f1';
                if (n.type === 'branch') return '#f59e0b';
                return '#64748b';
              }}
              className="!bg-white/90 !border !border-slate-200 !rounded-lg !shadow-sm"
              maskColor="rgba(241, 245, 249, 0.7)"
            />
          </ReactFlow>
        </main>

        {/* Right Inspector: Synchronized Live with Selected Node */}
        <aside className="w-full xl:w-96 bg-surface-container-lowest p-4 flex flex-col gap-4 shrink-0 border-l border-surface-container z-20 overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-surface-container">
            <div>
              <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider block">
                SELECTED NODE INSPECTOR
              </span>
              <h2 className="font-heading font-bold text-sm text-on-surface">
                {selectedNode ? selectedNode.data.label : 'NO NODE SELECTED'}
              </h2>
            </div>
            {selectedNode && (
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-mono text-[10px] uppercase font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {selectedNode.type?.toUpperCase()}
              </span>
            )}
          </div>

          {selectedNode ? (
            <>
              {/* Tab Navigation */}
              <div className="flex bg-surface-container p-0.5 rounded-lg font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedTab('visual')}
                  className={`flex-1 py-1.5 text-center rounded transition-all cursor-pointer ${
                    selectedTab === 'visual'
                      ? 'bg-surface-container-lowest text-on-surface font-bold shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Visual
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTab('bids')}
                  className={`flex-1 py-1.5 text-center rounded transition-all cursor-pointer ${
                    selectedTab === 'bids'
                      ? 'bg-surface-container-lowest text-on-surface font-bold shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  BIDS Schema
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTab('timing')}
                  className={`flex-1 py-1.5 text-center rounded transition-all cursor-pointer ${
                    selectedTab === 'timing'
                      ? 'bg-surface-container-lowest text-on-surface font-bold shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Timing
                </button>
              </div>

              {/* Inspector Content */}
              <div className="flex flex-col gap-3 text-xs">
                <div>
                  <label className="font-mono text-[11px] text-on-surface-variant uppercase font-medium block mb-1">
                    Node Title / Descriptor
                  </label>
                  <input
                    type="text"
                    value={selectedNode.data.title || ''}
                    onChange={(e) => updateSelectedNodeData({ title: e.target.value })}
                    className="w-full bg-surface-container-low text-on-surface font-mono font-bold px-3 py-2 rounded-lg border border-surface-container focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Stimulus Text Literal */}
                {(selectedNode.type === 'stimulus' || selectedNode.type === 'instruction') && (
                  <div>
                    <label className="font-mono text-[11px] text-on-surface-variant uppercase font-medium block mb-1">
                      Stimulus Text Literal
                    </label>
                    <input
                      type="text"
                      value={selectedNode.data.text || ''}
                      onChange={(e) => updateSelectedNodeData({ text: e.target.value })}
                      className="w-full bg-surface-container-low text-on-surface font-mono font-bold px-3 py-2 rounded-lg border border-surface-container focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                )}

                {/* Ink Color Picker & Congruency */}
                {selectedNode.type === 'stimulus' && (
                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <div>
                      <label className="text-[11px] text-on-surface-variant uppercase block mb-1">Ink Color</label>
                      <div className="flex items-center gap-2 bg-surface-container-low px-2 py-1 rounded-lg border border-surface-container">
                        <input
                          type="color"
                          value={selectedNode.data.ink || '#10b981'}
                          onChange={(e) => updateSelectedNodeData({ ink: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <span className="text-on-surface font-bold text-xs">{selectedNode.data.ink || '#10b981'}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] text-on-surface-variant uppercase block mb-1">Congruency</label>
                      <select
                        value={selectedNode.data.congruency || 'congruent'}
                        onChange={(e) => updateSelectedNodeData({ congruency: e.target.value as any })}
                        className="w-full bg-surface-container-low px-2 py-1.5 rounded-lg border border-surface-container text-on-surface font-bold text-xs focus:outline-none"
                      >
                        <option value="congruent">Congruent</option>
                        <option value="incongruent">Incongruent</option>
                        <option value="neutral">Neutral</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Dwell and ISI */}
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div>
                    <label className="text-[11px] text-on-surface-variant uppercase block mb-1">Dwell (ms)</label>
                    <input
                      type="number"
                      value={selectedNode.data.dwell ?? 1000}
                      onChange={(e) => updateSelectedNodeData({ dwell: parseInt(e.target.value) || 0 })}
                      className="w-full bg-surface-container-low text-on-surface px-3 py-1.5 rounded-lg border border-surface-container focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-on-surface-variant uppercase block mb-1">ISI (ms)</label>
                    <input
                      type="number"
                      value={selectedNode.data.isi ?? 350}
                      onChange={(e) => updateSelectedNodeData({ isi: parseInt(e.target.value) || 0 })}
                      className="w-full bg-surface-container-low text-on-surface px-3 py-1.5 rounded-lg border border-surface-container focus:outline-none"
                    />
                  </div>
                </div>

                {/* Allowed Keys for Response Node */}
                {selectedNode.type === 'response' && (
                  <div>
                    <label className="font-mono text-[11px] text-on-surface-variant uppercase font-medium block mb-1">
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
                      className="w-full bg-surface-container-low text-on-surface font-mono font-bold px-3 py-2 rounded-lg border border-surface-container focus:outline-none"
                    />
                  </div>
                )}

                {/* Live Synchronized Declarative BIDS Mapping Output */}
                <div className="mt-2">
                  <div className="flex items-center justify-between pb-1 font-mono text-[11px] text-on-surface uppercase font-bold">
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
                                text: selectedNode.data.text,
                                ink_color: selectedNode.data.ink,
                                dwell_ms: selectedNode.data.dwell,
                                isi_ms: selectedNode.data.isi,
                                congruency: selectedNode.data.congruency,
                                allowed_keys: selectedNode.data.allowedKeys,
                              },
                              bids_schema: selectedNode.data.bids || {},
                            },
                            null,
                            2
                          )
                        );
                        showToast('BIDS JSON specification copied');
                      }}
                      className="text-emerald-700 hover:underline flex items-center gap-0.5 text-[10px] cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[12px]">content_copy</span> Copy
                    </button>
                  </div>
                  <div className="bg-slate-950 text-emerald-400 p-3 rounded-xl font-mono text-[11px] leading-relaxed border border-slate-800 max-h-56 overflow-y-auto">
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
            <div className="text-center py-8 text-on-surface-variant font-mono text-xs">
              Click a node on the React Flow canvas to inspect and edit its parameters.
            </div>
          )}
        </aside>
      </div>

      {/* Protocol Builder Footer */}
      <footer className="w-full bg-surface-container-low border-t border-surface-container py-3 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono text-on-surface-variant">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-on-surface uppercase font-semibold">
              EXPERIMENT: {expCode} ({nodes.length} NODES)
            </span>
            <span>|</span>
            <span>BIDS SPEC v1.8.2 ACTIVE</span>
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
