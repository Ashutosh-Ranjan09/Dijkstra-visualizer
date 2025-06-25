import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useLayoutEffect,
} from "react";

function dijkstraWithSteps(nodes, edges, startId, endId) {
  const distances = {};
  const prev = {};
  const visited = new Set();
  const steps = [];
  nodes.forEach((n) => {
    distances[n.id] = Infinity;
    prev[n.id] = null;
  });
  distances[startId] = 0;

  while (visited.size < nodes.length) {
    let minNode = null;
    let minDist = Infinity;
    for (const n of nodes) {
      if (!visited.has(n.id) && distances[n.id] < minDist) {
        minDist = distances[n.id];
        minNode = n.id;
      }
    }
    if (minNode === null) break;
    visited.add(minNode);
    steps.push({ type: "visit", node: minNode });

    for (const e of edges) {
      if (e.source === minNode && !visited.has(e.target)) {
        steps.push({
          type: "relax",
          edgeId: e.id,
          from: minNode,
          to: e.target,
        });
        const alt = distances[minNode] + (e.weight || 1);
        if (alt < distances[e.target]) {
          distances[e.target] = alt;
          prev[e.target] = minNode;
          steps.push({
            type: "update",
            edgeId: e.id,
            from: minNode,
            to: e.target,
          });
        }
      }
    }
  }
  let path = [];
  let u = endId;
  while (u) {
    path.unshift(u);
    u = prev[u];
  }
  if (path[0] !== startId) path = [];
  steps.push({ type: "done", path });
  return steps;
}

function getArrowHead(x1, y1, x2, y2, nodeRadius = 25) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const arrowLength = 20;
  const arrowAngle = Math.PI / 4;

  const adjustedX2 = x2 - Math.cos(angle) * nodeRadius;
  const adjustedY2 = y2 - Math.sin(angle) * nodeRadius;

  const arrowX = adjustedX2 - Math.cos(angle) * arrowLength;
  const arrowY = adjustedY2 - Math.sin(angle) * arrowLength;

  const arrowX1 = arrowX - Math.cos(angle - arrowAngle) * arrowLength * 0.5;
  const arrowY1 = arrowY - Math.sin(angle - arrowAngle) * arrowLength * 0.5;
  const arrowX2 = arrowX - Math.cos(angle + arrowAngle) * arrowLength * 0.5;
  const arrowY2 = arrowY - Math.sin(angle + arrowAngle) * arrowLength * 0.5;

  return {
    lineEnd: { x: adjustedX2, y: adjustedY2 },
    arrow: `M${adjustedX2},${adjustedY2} L${arrowX1},${arrowY1} L${arrowX2},${arrowY2} Z`,
  };
}

function getArrowHeadBezier(x1, y1, cx, cy, x2, y2, nodeRadius = 25) {
  const dx = x2 - cx;
  const dy = y2 - cy;
  const angle = Math.atan2(dy, dx);
  const arrowLength = 20;
  const arrowAngle = Math.PI / 4;
  const adjustedX2 = x2 - Math.cos(angle) * nodeRadius;
  const adjustedY2 = y2 - Math.sin(angle) * nodeRadius;
  const arrowX = adjustedX2 - Math.cos(angle) * arrowLength;
  const arrowY = adjustedY2 - Math.sin(angle) * arrowLength;
  const arrowX1 = arrowX - Math.cos(angle - arrowAngle) * arrowLength * 0.5;
  const arrowY1 = arrowY - Math.sin(angle - arrowAngle) * arrowLength * 0.5;
  const arrowX2 = arrowX - Math.cos(angle + arrowAngle) * arrowLength * 0.5;
  const arrowY2 = arrowY - Math.sin(angle + arrowAngle) * arrowLength * 0.5;
  return {
    lineEnd: { x: adjustedX2, y: adjustedY2 },
    arrow: `M${adjustedX2},${adjustedY2} L${arrowX1},${arrowY1} L${arrowX2},${arrowY2} Z`,
  };
}

function getEdgePathTangential(
  x1,
  y1,
  x2,
  y2,
  nodeRadius = 25,
  control = null
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const norm = Math.sqrt(dx * dx + dy * dy) || 1;
  const offset = 0.18 * norm;
  const perpX = (-dy / norm) * offset;
  const perpY = (dx / norm) * offset;
  let cx, cy;
  if (control) {
    cx = control.x;
    cy = control.y;
  } else {
    cx = mx + perpX;
    cy = my + perpY;
  }
  const tx = x2 - cx;
  const ty = y2 - cy;
  const angle = Math.atan2(ty, tx);
  const ex = x2 - Math.cos(angle) * nodeRadius;
  const ey = y2 - Math.sin(angle) * nodeRadius;
  const sx = x1 + Math.cos(Math.atan2(cy - y1, cx - x1)) * nodeRadius;
  const sy = y1 + Math.sin(Math.atan2(cy - y1, cx - x1)) * nodeRadius;
  return { path: `M${sx},${sy} Q${cx},${cy} ${ex},${ey}`, cx, cy, ex, ey };
}

const initialNodes = [
  { id: "1", x: 150, y: 150, label: "1" },
  { id: "2", x: 450, y: 150, label: "2" },
  { id: "3", x: 300, y: 300, label: "3" },
];

const initialEdges = [
  { id: "e1-2", source: "1", target: "2", weight: 1 },
  { id: "e2-3", source: "2", target: "3", weight: 2 },
  { id: "e1-3", source: "1", target: "3", weight: 4 },
];

export default function GraphDijkstra() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [start, setStart] = useState("1");
  const [end, setEnd] = useState("3");
  const [path, setPath] = useState([]);
  const [nodeLabel, setNodeLabel] = useState("");
  const [edgeSource, setEdgeSource] = useState("");
  const [edgeTarget, setEdgeTarget] = useState("");
  const [editEdgeId, setEditEdgeId] = useState("");
  const [editEdgeWeight, setEditEdgeWeight] = useState("");
  const [draggedNode, setDraggedNode] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [pathAnimation, setPathAnimation] = useState(false);
  const [pathStep, setPathStep] = useState(0);
  const [speed, setSpeed] = useState(350);
  const [resetting, setResetting] = useState(false);
  const [algoSteps, setAlgoSteps] = useState([]);
  const [algoStepIndex, setAlgoStepIndex] = useState(-1);
  const [paused, setPaused] = useState(true);
  const svgRef = useRef(null);
  const [svgSize, setSvgSize] = useState({ width: 600, height: 400 });
  const pathRef = useRef(path);
  pathRef.current = path;

  useLayoutEffect(() => {
    function updateSize() {
      if (svgRef.current && svgRef.current.parentElement) {
        const rect = svgRef.current.parentElement.getBoundingClientRect();
        setSvgSize({ width: rect.width, height: rect.height });
      }
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const isDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const runDijkstra = () => {
    setResetting(true);
    setPaused(false);
    setPath([]);
    setPathStep(0);
    setAlgoSteps([]);
    setAlgoStepIndex(-1);
    setTimeout(() => {
      setResetting(false);
      const steps = dijkstraWithSteps(nodes, edges, start, end);
      setAlgoSteps(steps);
      setAlgoStepIndex(0);
    }, 200);
  };

  useEffect(() => {
    if (
      algoSteps.length > 0 &&
      algoStepIndex >= 0 &&
      algoStepIndex < algoSteps.length &&
      !paused
    ) {
      if (algoSteps[algoStepIndex].type === "done") {
        setPath(algoSteps[algoStepIndex].path);
        setPathStep(0);
        return;
      }
      const timer = setTimeout(() => {
        setAlgoStepIndex((i) => i + 1);
      }, speed);
      return () => clearTimeout(timer);
    }
  }, [algoSteps, algoStepIndex, speed, paused]);

  const handleStepForward = () => {
    if (algoSteps.length === 0) {
      const steps = dijkstraWithSteps(nodes, edges, start, end);
      setAlgoSteps(steps);
      setAlgoStepIndex(1);
      setPaused(false);
      setPath([]);
      setPathStep(0);
      return;
    }
    if (algoStepIndex < algoSteps.length - 1) {
      setAlgoStepIndex((i) => i + 1);
    }
  };
  const handleStepBack = () => {
    if (algoSteps.length === 0) {
      const steps = dijkstraWithSteps(nodes, edges, start, end);
      setAlgoSteps(steps);
      setAlgoStepIndex(0);
      setPaused(false);
      setPath([]);
      setPathStep(0);
      return;
    }
    if (algoStepIndex > 0) {
      setAlgoStepIndex((i) => i - 1);
    }
  };
  const handlePausePlay = () => {
    if (algoSteps.length === 0) {
      const steps = dijkstraWithSteps(nodes, edges, start, end);
      setAlgoSteps(steps);
      setAlgoStepIndex(0);
      setPaused(false);
      setPath([]);
      setPathStep(0);
      return;
    }
    setPaused((p) => !p);
  };

  useEffect(() => {
    if (
      algoSteps.length > 0 &&
      algoStepIndex >= 0 &&
      algoStepIndex < algoSteps.length
    ) {
      if (algoSteps[algoStepIndex].type === "done") {
        setPath(algoSteps[algoStepIndex].path);
      } else {
        setPath([]);
      }
    }
  }, [algoSteps, algoStepIndex]);

  let highlight = { node: null, relaxEdge: null, updateEdge: null };
  if (
    algoSteps.length > 0 &&
    algoStepIndex >= 0 &&
    algoStepIndex < algoSteps.length
  ) {
    for (let i = 0; i <= algoStepIndex; ++i) {
      const step = algoSteps[i];
      if (step.type === "visit") highlight.node = step.node;
      if (step.type === "relax") highlight.relaxEdge = step.edgeId;
      if (step.type === "update") highlight.updateEdge = step.edgeId;
    }
  }

  useEffect(() => {
    if (pathAnimation) {
      const timer = setTimeout(() => setPathAnimation(false), 600);
      return () => clearTimeout(timer);
    }
  }, [pathAnimation, path]);

  useEffect(() => {
    if (path.length > 1) {
      setPathStep(0);
      let step = 0;
      const interval = setInterval(() => {
        step++;
        setPathStep(step);
        if (step >= path.length - 1) clearInterval(interval);
      }, speed);
      return () => clearInterval(interval);
    } else {
      setPathStep(0);
    }
  }, [path, speed]);

  const addNode = () => {
    if (!nodeLabel.trim()) return;
    const newId = (Math.max(0, ...nodes.map((n) => +n.id)) + 1).toString();
    setNodes((nds) => [
      ...nds,
      {
        id: newId,
        x: 250 + Math.random() * 100,
        y: 200 + Math.random() * 100,
        label: nodeLabel,
      },
    ]);
    setNodeLabel("");
  };

  const removeNode = (id) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };

  const [edgeType, setEdgeType] = useState("directed");

  const addEdgeManual = () => {
    if (!edgeSource || !edgeTarget || edgeSource === edgeTarget) return;
    const newId = `e${edgeSource}-${edgeTarget}`;
    if (edges.some((e) => e.id === newId)) return;
    let newEdges = [
      { id: newId, source: edgeSource, target: edgeTarget, weight: 1 },
    ];
    if (edgeType === "undirected") {
      const revId = `e${edgeTarget}-${edgeSource}`;
      if (!edges.some((e) => e.id === revId)) {
        newEdges.push({
          id: revId,
          source: edgeTarget,
          target: edgeSource,
          weight: 1,
        });
      }
    }
    setEdges((eds) => [...eds, ...newEdges]);
    setEdgeSource("");
    setEdgeTarget("");
  };

  const removeEdge = (id) => {
    setEdges((eds) => eds.filter((e) => e.id !== id));
  };

  const handleEditEdgeWeight = () => {
    const weight = Number(editEdgeWeight);
    if (!editEdgeId || isNaN(weight) || weight < 0) return;
    setEdges((eds) =>
      eds.map((e) => (e.id === editEdgeId ? { ...e, weight } : e))
    );
    setEditEdgeId("");
    setEditEdgeWeight("");
  };

  const isEdgeInPath = (edge) => {
    const sourceIndex = path.indexOf(edge.source);
    const targetIndex = path.indexOf(edge.target);
    return (
      sourceIndex !== -1 &&
      targetIndex !== -1 &&
      targetIndex === sourceIndex + 1
    );
  };

  const handleMouseDown = useCallback(
    (e, nodeId) => {
      if (e.button !== 2) return;
      const rect = svgRef.current.getBoundingClientRect();
      const node = nodes.find((n) => n.id === nodeId);
      setDraggedNode(nodeId);
      setOffset({
        x: e.clientX - rect.left - node.x,
        y: e.clientY - rect.top - node.y,
      });
    },
    [nodes]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!draggedNode) return;
      const rect = svgRef.current.getBoundingClientRect();
      const newX = e.clientX - rect.left - offset.x;
      const newY = e.clientY - rect.top - offset.y;

      setNodes((nds) =>
        nds.map((n) =>
          n.id === draggedNode
            ? {
                ...n,
                x: Math.max(30, Math.min(svgSize.width - 30, newX)),
                y: Math.max(30, Math.min(svgSize.height - 30, newY)),
              }
            : n
        )
      );
    },
    [draggedNode, offset, svgSize]
  );

  const handleMouseUp = useCallback(() => {
    setDraggedNode(null);
  }, []);

  const [edgeDragSource, setEdgeDragSource] = useState(null);
  const [edgeDragPos, setEdgeDragPos] = useState(null);

  const handleEdgeDragStart = (e, nodeId) => {
    if (e.button !== 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    setEdgeDragSource(nodeId);
    setEdgeDragPos({
      x: nodes.find((n) => n.id === nodeId).x,
      y: nodes.find((n) => n.id === nodeId).y,
    });
    e.stopPropagation();
  };

  const handleSvgMouseMove = (e) => {
    if (!edgeDragSource) return;
    const rect = svgRef.current.getBoundingClientRect();
    setEdgeDragPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleEdgeDragEnd = (targetNodeId) => {
    if (edgeDragSource && targetNodeId && edgeDragSource !== targetNodeId) {
      const newId = `e${edgeDragSource}-${targetNodeId}`;
      if (!edges.some((e) => e.id === newId)) {
        let newEdges = [
          {
            id: newId,
            source: edgeDragSource,
            target: targetNodeId,
            weight: 1,
          },
        ];
        if (edgeType === "undirected") {
          const revId = `e${targetNodeId}-${edgeDragSource}`;
          if (!edges.some((e) => e.id === revId)) {
            newEdges.push({
              id: revId,
              source: targetNodeId,
              target: edgeDragSource,
              weight: 1,
            });
          }
        }
        setEdges((eds) => [...eds, ...newEdges]);
      }
    }
    setEdgeDragSource(null);
    setEdgeDragPos(null);
  };

  const handleSvgMouseUp = () => {
    setEdgeDragSource(null);
    setEdgeDragPos(null);
  };

  const edgeColorBase = isDark ? "#6b7280" : "#a3a3a3";
  const nodeFill = isDark ? "#1e293b" : "#f3f4f6";
  const nodeStroke = isDark ? "#64748b" : "#64748b";
  const nodeText = isDark ? "#f3f4f6" : "#334155";

  const [inlineEditEdgeId, setInlineEditEdgeId] = useState("");
  const [inlineEditValue, setInlineEditValue] = useState("");
  const [edgeToDelete, setEdgeToDelete] = useState("");
  const [deleteMenuPos, setDeleteMenuPos] = useState(null);

  const [bendDrag, setBendDrag] = useState({ edgeId: null, offset: null });

  const getEdgeControl = (edge, sourceNode, targetNode) => {
    if (edge.control) return edge.control;
    const dx = targetNode.x - sourceNode.x;
    const dy = targetNode.y - sourceNode.y;
    const mx = (sourceNode.x + targetNode.x) / 2;
    const my = (sourceNode.y + targetNode.y) / 2;
    const norm = Math.sqrt(dx * dx + dy * dy) || 1;
    const offset = 0.18 * norm;
    const perpX = (-dy / norm) * offset;
    const perpY = (dx / norm) * offset;
    return { x: mx + perpX, y: my + perpY };
  };

  const handleBendDragStart = (e, edge, sourceNode, targetNode) => {
    e.stopPropagation();
    e.preventDefault();
    const svgRect = svgRef.current.getBoundingClientRect();
    const control = getEdgeControl(edge, sourceNode, targetNode);
    setBendDrag({
      edgeId: edge.id,
      offset: {
        dx: e.clientX - svgRect.left - control.x,
        dy: e.clientY - svgRect.top - control.y,
      },
    });
  };

  const handleBendDragMove = useCallback(
    (e) => {
      if (!bendDrag.edgeId) return;
      const svgRect = svgRef.current.getBoundingClientRect();
      const edge = edges.find((ed) => ed.id === bendDrag.edgeId);
      if (!edge) return;
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);
      if (!sourceNode || !targetNode) return;
      const x = e.clientX - svgRect.left - bendDrag.offset.dx;
      const y = e.clientY - svgRect.top - bendDrag.offset.dy;
      setEdges((eds) =>
        eds.map((ed) => (ed.id === edge.id ? { ...ed, control: { x, y } } : ed))
      );
    },
    [bendDrag, edges, nodes]
  );

  const handleBendDragEnd = useCallback(() => {
    setBendDrag({ edgeId: null, offset: null });
  }, []);

  useEffect(() => {
    if (bendDrag.edgeId) {
      window.addEventListener("mousemove", handleBendDragMove);
      window.addEventListener("mouseup", handleBendDragEnd);
      return () => {
        window.removeEventListener("mousemove", handleBendDragMove);
        window.removeEventListener("mouseup", handleBendDragEnd);
      };
    }
  }, [bendDrag, handleBendDragMove, handleBendDragEnd]);

  useEffect(() => {
    setEdges((eds) =>
      eds.map((ed) => {
        if (!ed.control) return ed;
        const sourceNode = nodes.find((n) => n.id === ed.source);
        const targetNode = nodes.find((n) => n.id === ed.target);
        if (!sourceNode || !targetNode) return ed;
        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const mx = (sourceNode.x + targetNode.x) / 2;
        const my = (sourceNode.y + targetNode.y) / 2;
        const norm = Math.sqrt(dx * dx + dy * dy) || 1;
        const offset = 0.18 * norm;
        const perpX = (-dy / norm) * offset;
        const perpY = (dx / norm) * offset;
        const defX = mx + perpX;
        const defY = my + perpY;
        const dist = Math.hypot(ed.control.x - defX, ed.control.y - defY);
        if (dist < 2) return { ...ed, control: undefined };
        return ed;
      })
    );
  }, [nodes]);

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
      <div className="flex-shrink-0 bg-gradient-to-r from-slate-50 to-blue-100 dark:from-slate-900 dark:to-blue-950 border-b border-slate-200 dark:border-slate-800 shadow-md rounded-b-2xl">
        <div className="px-6 py-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-center gap-4 mb-2 p-3 bg-white/80 dark:bg-slate-800/80 rounded-xl shadow border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Start:
              </label>
              <select
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="px-2 py-1 text-sm rounded-lg border-0 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-150 cursor-pointer"
              >
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                End:
              </label>
              <select
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="px-2 py-1 text-sm rounded-lg border-0 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-150 cursor-pointer"
              >
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={runDijkstra}
              className="px-7 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-green-500 to-green-700 text-white shadow-lg hover:from-green-600 hover:to-green-800 transition-all duration-200 transform hover:scale-105 border-2 border-green-700/30 min-w-[120px] cursor-pointer"
            >
              🚀 Run Dijkstra
            </button>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nodeLabel}
                onChange={(e) => setNodeLabel(e.target.value)}
                placeholder="   Node label"
                className="px-2 py-1 text-sm rounded-lg border-0 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-green-500 outline-none w-24 transition-all duration-150"
              />
              <button
                onClick={addNode}
                className="px-5 py-1 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-200 shadow border-2 border-blue-700/30 min-w-[80px] cursor-pointer"
              >
                ➕ Add
              </button>
              <button
                onClick={() =>
                  nodes.length > 0 && removeNode(nodes[nodes.length - 1].id)
                }
                className="px-5 py-1 text-sm font-medium rounded-lg bg-pink-500 text-white hover:bg-pink-600 transition-colors duration-200 shadow border-2 border-pink-700/30 min-w-[80px] cursor-pointer"
              >
                ➖ Remove
              </button>
            </div>
            <button
              onClick={() => {
                if (edgeType === "directed") {
                  setEdges((eds) => {
                    let newEdges = [...eds];
                    eds.forEach((e) => {
                      const revId = `e${e.target}-${e.source}`;
                      if (!eds.some((ee) => ee.id === revId)) {
                        newEdges.push({
                          id: revId,
                          source: e.target,
                          target: e.source,
                          weight: e.weight,
                        });
                      }
                    });
                    return newEdges;
                  });
                  setEdgeType("undirected");
                } else {
                  setEdges((eds) =>
                    eds.filter(
                      (e) =>
                        !eds.some(
                          (ee) =>
                            ee.source === e.target &&
                            ee.target === e.source &&
                            ee.id !== e.id
                        ) || e.source < e.target
                    )
                  );
                  setEdgeType("directed");
                }
              }}
              className={`px-7 py-2 text-sm font-semibold rounded-xl shadow-lg border-2 border-yellow-700/30 transition-all duration-200 min-w-[130px] cursor-pointer ${
                edgeType === "directed"
                  ? "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white hover:from-yellow-500 hover:to-yellow-700"
                  : "bg-gradient-to-r from-indigo-500 to-indigo-700 text-white hover:from-indigo-600 hover:to-indigo-800"
              }`}
            >
              {edgeType === "directed" ? "🔄 Directed" : "↔️ Undirected"}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 p-3 bg-blue-50/80 dark:bg-blue-900/60 rounded-xl shadow border border-blue-200 dark:border-blue-700">
            <button
              onClick={handleStepBack}
              className={`px-5 py-1 text-sm rounded-lg font-medium transition-all duration-200 shadow-sm border-2 border-slate-200 dark:border-slate-700 min-w-[48px] cursor-pointer ${
                algoStepIndex <= 0
                  ? "bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-cyan-200 dark:bg-cyan-600 text-cyan-700 dark:text-cyan-100 hover:bg-cyan-300 dark:hover:bg-cyan-500"
              }`}
              title="Step Back"
              disabled={algoStepIndex <= 0}
            >
              ⏮️
            </button>
            <button
              onClick={handlePausePlay}
              className={`px-5 py-1 text-sm rounded-lg font-medium transition-all duration-200 shadow-sm border-2 border-slate-200 dark:border-slate-700 min-w-[70px] cursor-pointer ${
                paused
                  ? "bg-purple-500 hover:bg-purple-600 text-white"
                  : "bg-orange-500 hover:bg-orange-600 text-white"
              }`}
              title={paused ? "Resume" : "Pause"}
            >
              {paused ? "▶️" : "⏸️"}
            </button>
            <button
              onClick={handleStepForward}
              className={`px-5 py-1 text-sm rounded-lg font-medium transition-all duration-200 shadow-sm border-2 border-slate-200 dark:border-slate-700 min-w-[48px] cursor-pointer ${
                algoSteps.length > 0 && algoStepIndex >= algoSteps.length - 1
                  ? "bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-cyan-200 dark:bg-cyan-600 text-cyan-700 dark:text-cyan-100 hover:bg-cyan-300 dark:hover:bg-cyan-500"
              }`}
              title="Step Forward"
              disabled={
                algoSteps.length > 0 && algoStepIndex >= algoSteps.length - 1
              }
            >
              ⏭️
            </button>
            <div className="flex items-center gap-2 ml-3 pl-3 border-l border-slate-300 dark:border-slate-600">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Speed:
              </label>
              <input
                type="range"
                min="50"
                max="3000"
                step="50"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="accent-blue-600 w-24 cursor-pointer"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400 w-12 text-center">
                {speed}ms
              </span>
            </div>
          </div>

          {path.length > 0 && (
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 rounded-xl px-5 py-2 border border-blue-200 dark:border-blue-700 shadow justify-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  🎯 Path:
                </span>
                <span className="text-sm font-mono text-blue-800 dark:text-blue-200 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-blue-300 dark:border-blue-800 shadow-sm">
                  {path.join(" → ")}
                </span>
              </div>
              {(() => {
                if (path.length < 2) return null;
                let cost = 0;
                for (let i = 0; i < path.length - 1; i++) {
                  const edge = edges.find(
                    (e) => e.source === path[i] && e.target === path[i + 1]
                  );
                  if (!edge) return null;
                  cost += Number(edge.weight) || 0;
                }
                return (
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                      💰 Cost:
                    </span>
                    <span className="text-sm font-bold text-white bg-blue-600 px-2 py-1 rounded shadow border border-blue-800">
                      {cost}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${svgSize.width} ${svgSize.height}`}
          className="cursor-crosshair w-full h-full block"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseMoveCapture={handleSvgMouseMove}
          onMouseUpCapture={(e) => {
            if (edgeDragSource) {
              setEdgeDragSource(null);
              setEdgeDragPos(null);
            }
            handleSvgMouseUp();
          }}
        >
          <defs>
            <pattern
              id="grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke={isDark ? "#334155" : "#e2e8f0"}
                strokeWidth="1"
                opacity="0.5"
              />
            </pattern>
            <filter
              id="nodeShadow"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feDropShadow
                dx="0"
                dy="4"
                stdDeviation="3"
                floodColor={isDark ? "#000" : "#64748b"}
                floodOpacity="0.25"
              />
            </filter>
            <filter
              id="edgeShadow"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feDropShadow
                dx="0"
                dy="2"
                stdDeviation="2"
                floodColor={isDark ? "#000" : "#64748b"}
                floodOpacity="0.15"
              />
            </filter>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {edges.map((edge) => {
            const sourceNode = nodes.find((n) => n.id === edge.source);
            const targetNode = nodes.find((n) => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;

            let isFinalPath = false;
            let edgeColor = edgeColorBase;
            let edgeClass = "";
            if (path.length > 1) {
              for (let i = 0; i < pathStep + 1; i++) {
                if (path[i] === edge.source && path[i + 1] === edge.target) {
                  isFinalPath = true;
                  edgeColor = "#2563eb";
                  edgeClass = "animate-path-pulse";
                  break;
                }
              }
            }
            if (!isFinalPath) {
              if (highlight.updateEdge === edge.id) {
                edgeColor = "#22c55e";
                edgeClass = "animate-path-pulse";
              } else if (highlight.relaxEdge === edge.id) {
                edgeColor = "#06b6d4";
                edgeClass = "animate-path-pulse";
              }
            }

            const edgeControl = getEdgeControl(edge, sourceNode, targetNode);
            const {
              path: edgePath,
              cx,
              cy,
              ex,
              ey,
            } = getEdgePathTangential(
              sourceNode.x,
              sourceNode.y,
              targetNode.x,
              targetNode.y,
              25,
              edge.control
            );

            const arrowAngle = Math.atan2(ey - cy, ex - cx);
            const arrowLength = 20;
            const arrowSpread = Math.PI / 4;
            const ax = ex - Math.cos(arrowAngle) * arrowLength;
            const ay = ey - Math.sin(arrowAngle) * arrowLength;
            const ax1 =
              ax - Math.cos(arrowAngle - arrowSpread) * arrowLength * 0.5;
            const ay1 =
              ay - Math.sin(arrowAngle - arrowSpread) * arrowLength * 0.5;
            const ax2 =
              ax - Math.cos(arrowAngle + arrowSpread) * arrowLength * 0.5;
            const ay2 =
              ay - Math.sin(arrowAngle + arrowSpread) * arrowLength * 0.5;
            const arrow = `M${ex},${ey} L${ax1},${ay1} L${ax2},${ay2} Z`;

            const t = 0.5;
            const x0 = sourceNode.x;
            const y0 = sourceNode.y;
            const x1b = edge.control ? edge.control.x : cx;
            const y1b = edge.control ? edge.control.y : cy;
            const x2 = targetNode.x;
            const y2 = targetNode.y;
            const labelX =
              (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * x1b + t * t * x2;
            const labelY =
              (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * y1b + t * t * y2;

            const labelBg = isFinalPath
              ? "#2563eb"
              : isDark
              ? "#1e293b"
              : "#f8fafc";
            const labelStroke = isFinalPath
              ? "#1e40af"
              : isDark
              ? "#475569"
              : "#cbd5e1";
            const labelText = isFinalPath
              ? "#fff"
              : isDark
              ? "#f1f5f9"
              : "#334155";

            return (
              <g key={edge.id}>
                <path
                  d={edgePath}
                  stroke={edgeColor}
                  strokeWidth={isFinalPath || edgeClass ? 8 : 5}
                  opacity={isFinalPath || edgeClass ? 0.95 : 0.8}
                  fill="none"
                  filter="url(#edgeShadow)"
                  className={edgeClass}
                  style={{ cursor: "grab" }}
                  onMouseDown={(e) =>
                    handleBendDragStart(e, edge, sourceNode, targetNode)
                  }
                />
                <path
                  d={arrow}
                  fill={edgeColor}
                  opacity={isFinalPath || edgeClass ? 0.95 : 0.8}
                  filter="url(#edgeShadow)"
                  className={edgeClass}
                  style={{
                    stroke: edgeColor,
                    strokeWidth: isFinalPath || edgeClass ? 4 : 2.5,
                  }}
                />
                {inlineEditEdgeId === edge.id ? (
                  <foreignObject
                    x={labelX - 20}
                    y={labelY - 16}
                    width={40}
                    height={32}
                  >
                    <input
                      type="number"
                      min="0"
                      value={inlineEditValue}
                      autoFocus
                      style={{
                        width: 38,
                        height: 30,
                        fontSize: 14,
                        textAlign: "center",
                        borderRadius: 8,
                        border: "2px solid #f59e0b",
                        background: isDark ? "#1e293b" : "#fffbeb",
                        color: isDark ? "#f1f5f9" : "#334155",
                        fontWeight: 600,
                        outline: "none",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                      onChange={(e) => setInlineEditValue(e.target.value)}
                      onBlur={() => {
                        const weight = Number(inlineEditValue);
                        if (!isNaN(weight) && weight >= 0) {
                          setEdges((eds) =>
                            eds.map((e) =>
                              e.id === edge.id ? { ...e, weight } : e
                            )
                          );
                        }
                        setInlineEditEdgeId("");
                        setInlineEditValue("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const weight = Number(inlineEditValue);
                          if (!isNaN(weight) && weight >= 0) {
                            setEdges((eds) =>
                              eds.map((e) =>
                                e.id === edge.id ? { ...e, weight } : e
                              )
                            );
                          }
                          setInlineEditEdgeId("");
                          setInlineEditValue("");
                        } else if (e.key === "Escape") {
                          setInlineEditEdgeId("");
                          setInlineEditValue("");
                        }
                      }}
                    />
                  </foreignObject>
                ) : (
                  <g
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setInlineEditEdgeId(edge.id);
                      setInlineEditValue(edge.weight.toString());
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setEdgeToDelete(edge.id);
                      setDeleteMenuPos({ x: e.clientX, y: e.clientY });
                    }}
                  >
                    <circle
                      cx={labelX}
                      cy={labelY}
                      r="16"
                      fill={labelBg}
                      stroke={labelStroke}
                      strokeWidth={isFinalPath ? 3 : 2}
                      opacity={0.95}
                      filter="url(#nodeShadow)"
                      className={isFinalPath ? "animate-path-pulse" : ""}
                    />
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="14"
                      fontWeight={isFinalPath ? "bold" : "600"}
                      fill={labelText}
                      style={{ letterSpacing: 0.5 }}
                      className={isFinalPath ? "animate-path-pulse" : ""}
                    >
                      {edge.weight}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {edgeDragSource &&
            edgeDragPos &&
            (() => {
              const sourceNode = nodes.find((n) => n.id === edgeDragSource);
              if (!sourceNode) return null;
              return (
                <path
                  d={
                    getEdgePathTangential(
                      sourceNode.x,
                      sourceNode.y,
                      edgeDragPos.x,
                      edgeDragPos.y,
                      25
                    ).path
                  }
                  stroke="#6366f1"
                  strokeWidth={4}
                  opacity={0.7}
                  fill="none"
                  strokeDasharray="8 6"
                  filter="url(#edgeShadow)"
                />
              );
            })()}

          {nodes.map((node) => {
            let isFinalPath = false;
            let nodeColor = nodeFill;
            let nodeStrokeColor = nodeStroke;
            let nodeTextColor = nodeText;
            let nodeClass = "";
            if (path.length > 0) {
              const nodeIndex = path.indexOf(node.id);
              isFinalPath = nodeIndex !== -1 && nodeIndex <= pathStep + 1;
              if (isFinalPath) {
                nodeColor = "#2563eb";
                nodeStrokeColor = "#1e40af";
                nodeTextColor = "#fff";
              }
            }
            if (!isFinalPath && highlight.node === node.id) {
              nodeColor = "#f59e0b";
              nodeStrokeColor = "#d97706";
              nodeTextColor = "#fff";
              nodeClass = "animate-path-pulse";
            }
            return (
              <g key={node.id}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="30"
                  fill={nodeColor}
                  stroke={nodeStrokeColor}
                  strokeWidth={isFinalPath || nodeClass ? 5 : 3}
                  filter="url(#nodeShadow)"
                  className={
                    "cursor-move hover:opacity-90 transition-opacity duration-200" +
                    (nodeClass ? " animate-path-pulse" : "")
                  }
                  onMouseDown={(e) => {
                    if (e.button === 2) {
                      handleMouseDown(e, node.id);
                    } else if (e.button === 0) {
                      handleEdgeDragStart(e, node.id);
                    }
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  onMouseUpCapture={(e) => {
                    if (
                      e.button === 0 &&
                      edgeDragSource &&
                      edgeDragSource !== node.id
                    ) {
                      handleEdgeDragEnd(node.id);
                    }
                  }}
                />
                <text
                  x={node.x}
                  y={node.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="18"
                  fontWeight="bold"
                  fill={nodeTextColor}
                  className={
                    "pointer-events-none select-none" +
                    (nodeClass ? " animate-path-pulse" : "")
                  }
                  style={{ letterSpacing: 0.5 }}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
        <HelperButton />
      </div>

      {edgeToDelete && deleteMenuPos && (
        <div
          style={{
            position: "fixed",
            left: deleteMenuPos.x,
            top: deleteMenuPos.y,
            zIndex: 1000,
            background: isDark ? "#1e293b" : "#fff",
            border: `2px solid ${isDark ? "#ef4444" : "#dc2626"}`,
            borderRadius: 12,
            boxShadow:
              "0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            padding: 12,
            minWidth: 120,
            color: isDark ? "#f1f5f9" : "#334155",
          }}
          onMouseLeave={() => {
            setEdgeToDelete("");
            setDeleteMenuPos(null);
          }}
        >
          <button
            className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold shadow-md hover:bg-red-700 transition-all duration-200 w-full transform hover:scale-105"
            onClick={() => {
              setEdges((eds) => eds.filter((e) => e.id !== edgeToDelete));
              setEdgeToDelete("");
              setDeleteMenuPos(null);
            }}
          >
            🗑️ Remove Edge
          </button>
        </div>
      )}
    </div>
  );
}

function HelperButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 bg-white dark:bg-gray-900 border-2 border-blue-500 shadow-xl rounded-full w-14 h-14 flex items-center justify-center text-3xl font-extrabold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-800 transition-all duration-200 cursor-pointer"
        title="Show Instructions"
        style={{ boxShadow: "0 8px 32px 0 rgba(0,0,0,0.18)" }}
      >
        <span style={{ fontFamily: "monospace", fontWeight: 900 }}>?</span>
      </button>
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-96 max-w-[90vw] bg-white dark:bg-gray-900 border-2 border-blue-500 rounded-2xl shadow-2xl p-6 text-slate-800 dark:text-slate-100 animate-fade-in"
          style={{ boxShadow: "0 8px 32px 0 rgba(0,0,0,0.18)" }}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
              Visualizer Instructions
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-2xl font-bold text-blue-500 hover:text-blue-700 cursor-pointer "
            >
              ×
            </button>
          </div>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>
              <b>Move Nodes:</b> Right-click and drag a node to move it.
            </li>
            <li>
              <b>Create Edge:</b> Left-click and drag from one node to another.
            </li>
            <li>
              <b>Edit Edge Weight:</b> Click edge label to edit. Press
              Enter/Escape or click away to save/cancel.
            </li>
            <li>
              <b>Delete Edge:</b> Right-click edge label and confirm.
            </li>
            <li>
              <b>Add Node:</b> Enter label and click <b>Add</b>.
            </li>
            <li>
              <b>Remove Node:</b> Click <b>Remove</b> to delete the last node.
            </li>
            <li>
              <b>Directed/Undirected:</b> Toggle edge directionality.
            </li>
            <li>
              <b>Run Dijkstra:</b> Select start/end, then click{" "}
              <b>Run Dijkstra</b>.
            </li>
            <li>
              <b>Step Controls:</b> Use ⏮️, ▶️/⏸️, ⏭️ to step/pause/resume the
              algorithm.
            </li>
            <li>
              <b>Speed:</b> Adjust the slider to change animation speed.
            </li>
            <li>
              <b>Path & Cost:</b> Shortest path and cost are shown after
              completion.
            </li>
            <li>
              <b>Edge Bending:</b> Drag edge curve to adjust its shape.
            </li>
            <li>
              <b>Dark Mode:</b> UI adapts to your system theme.
            </li>
          </ul>
        </div>
      )}
    </>
  );
}
