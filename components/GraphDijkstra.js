import React, { useState, useRef, useCallback, useEffect } from "react";

// Helper to run Dijkstra's algorithm and record steps
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
  // Reconstruct path
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

// Helper to calculate arrow head points
function getArrowHead(x1, y1, x2, y2, nodeRadius = 25) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const arrowLength = 20; // Increased from 12
  const arrowAngle = Math.PI / 4; // Increased from Math.PI / 6

  // Adjust end point to stop at node edge
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

// Helper to calculate arrow head points for a quadratic Bezier curve
function getArrowHeadBezier(x1, y1, cx, cy, x2, y2, nodeRadius = 25) {
  // Find the tangent at t=1 (end of curve)
  // Quadratic Bezier: B(t) = (1-t)^2*P0 + 2*(1-t)*t*C + t^2*P2
  // Derivative at t=1: 2*(P2 - C)
  const dx = x2 - cx;
  const dy = y2 - cy;
  const angle = Math.atan2(dy, dx);
  const arrowLength = 20;
  const arrowAngle = Math.PI / 4;
  // Adjust end point to stop at node edge
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

// Helper to get a quadratic Bezier path for a flexible edge, now supports custom control point and tangential end
function getEdgePathTangential(
  x1,
  y1,
  x2,
  y2,
  nodeRadius = 25,
  control = null
) {
  // Compute default or custom control point
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
  // Find tangent at t=1 (end of curve)
  // Derivative: 2*(P2 - C)
  const tx = x2 - cx;
  const ty = y2 - cy;
  const angle = Math.atan2(ty, tx);
  // Move end point back along tangent by nodeRadius
  const ex = x2 - Math.cos(angle) * nodeRadius;
  const ey = y2 - Math.sin(angle) * nodeRadius;
  // Move start point forward along tangent at t=0
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
  const [pathStep, setPathStep] = useState(0); // For propagation animation
  const [speed, setSpeed] = useState(350); // Propagation speed in ms
  const [resetting, setResetting] = useState(false);
  const [algoSteps, setAlgoSteps] = useState([]);
  const [algoStepIndex, setAlgoStepIndex] = useState(-1);
  const svgRef = useRef(null);
  const pathRef = useRef(path);
  pathRef.current = path;

  // Detect dark mode for better color adaptation
  const isDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const runDijkstra = () => {
    setResetting(true);
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

  // Animate algorithm steps
  useEffect(() => {
    if (
      algoSteps.length > 0 &&
      algoStepIndex >= 0 &&
      algoStepIndex < algoSteps.length
    ) {
      if (algoSteps[algoStepIndex].type === "done") {
        // Show final path propagation as before
        setPath(algoSteps[algoStepIndex].path);
        setPathStep(0);
        return;
      }
      const timer = setTimeout(() => {
        setAlgoStepIndex((i) => i + 1);
      }, speed);
      return () => clearTimeout(timer);
    }
  }, [algoSteps, algoStepIndex, speed]);

  // Highlighting logic for algorithm steps
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

  // Animation effect: remove animation after 600ms
  useEffect(() => {
    if (pathAnimation) {
      const timer = setTimeout(() => setPathAnimation(false), 600);
      return () => clearTimeout(timer);
    }
  }, [pathAnimation, path]);

  // Animate path propagation
  useEffect(() => {
    if (path.length > 1) {
      setPathStep(0);
      let step = 0;
      const interval = setInterval(() => {
        step++;
        setPathStep(step);
        if (step >= path.length - 1) clearInterval(interval);
      }, speed); // Use speed state
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

  const [edgeType, setEdgeType] = useState("directed"); // 'directed' or 'undirected'

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
                x: Math.max(30, Math.min(570, newX)),
                y: Math.max(30, Math.min(370, newY)),
              }
            : n
        )
      );
    },
    [draggedNode, offset]
  );

  const handleMouseUp = useCallback(() => {
    setDraggedNode(null);
  }, []);

  // Drag-and-drop edge creation state
  const [edgeDragSource, setEdgeDragSource] = useState(null); // node id
  const [edgeDragPos, setEdgeDragPos] = useState(null); // {x, y}

  // Start edge drag from node
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

  // Move edge drag
  const handleSvgMouseMove = (e) => {
    if (!edgeDragSource) return;
    const rect = svgRef.current.getBoundingClientRect();
    setEdgeDragPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Complete edge drag
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

  // Cancel edge drag
  const handleSvgMouseUp = () => {
    setEdgeDragSource(null);
    setEdgeDragPos(null);
  };

  // Color palette base for edges
  const edgeColorBase = isDark ? "#6b7280" : "#a3a3a3";
  // Color palette base for nodes
  const nodeFill = isDark ? "#1e293b" : "#f3f4f6";
  const nodeStroke = isDark ? "#64748b" : "#64748b";
  const nodeText = isDark ? "#f3f4f6" : "#334155";

  // Add state for editing edge weight inline
  const [inlineEditEdgeId, setInlineEditEdgeId] = useState("");
  const [inlineEditValue, setInlineEditValue] = useState("");
  const [edgeToDelete, setEdgeToDelete] = useState("");
  const [deleteMenuPos, setDeleteMenuPos] = useState(null);

  // Bend drag state
  const [bendDrag, setBendDrag] = useState({ edgeId: null, offset: null });

  // Helper to get control point for an edge
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

  // Handle bend drag start
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

  // Handle bend drag move
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

  // Handle bend drag end
  const handleBendDragEnd = useCallback(() => {
    setBendDrag({ edgeId: null, offset: null });
  }, []);

  // Attach bend drag listeners
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

  // Remove custom control if nodes move
  useEffect(() => {
    setEdges((eds) =>
      eds.map((ed) => {
        if (!ed.control) return ed;
        const sourceNode = nodes.find((n) => n.id === ed.source);
        const targetNode = nodes.find((n) => n.id === ed.target);
        if (!sourceNode || !targetNode) return ed;
        // If control is too close to default, remove it
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
    <div className="w-full">
      <div className="mb-4 flex flex-wrap gap-4 items-center justify-center bg-blue-50 dark:bg-gray-800/80 p-4 rounded-lg border border-blue-100 dark:border-gray-700 shadow">
        {/* Controls */}
        <label className="font-semibold text-blue-900 dark:text-blue-200">
          Start:
          <select
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="ml-2 p-1 rounded border border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-900 text-blue-900 dark:text-blue-200"
          >
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
        </label>
        <label className="font-semibold text-blue-900 dark:text-blue-200">
          End:
          <select
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="ml-2 p-1 rounded border border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-900 text-blue-900 dark:text-blue-200"
          >
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={runDijkstra}
          className="px-4 py-2 rounded bg-blue-600 text-white font-bold shadow hover:bg-blue-700 transition-colors"
        >
          Run Dijkstra
        </button>

        {/* Add/Remove Node */}
        <input
          type="text"
          value={nodeLabel}
          onChange={(e) => setNodeLabel(e.target.value)}
          placeholder="Node label"
          className="p-1 rounded border border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-900 text-blue-900 dark:text-blue-200"
        />
        <button
          onClick={addNode}
          className="px-3 py-1 rounded bg-green-600 text-white font-bold shadow hover:bg-green-700 transition-colors"
        >
          Add Node
        </button>
        <button
          onClick={() =>
            nodes.length > 0 && removeNode(nodes[nodes.length - 1].id)
          }
          className="px-3 py-1 rounded bg-red-600 text-white font-bold shadow hover:bg-red-700 transition-colors"
        >
          Remove Last Node
        </button>

        {/* Add/Remove Edge */}
        {/* <select
          value={edgeSource}
          onChange={(e) => setEdgeSource(e.target.value)}
          className="ml-2 p-1 rounded border border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-900 text-blue-900 dark:text-blue-200"
        >
          <option value="">Edge Source</option>
          {nodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label}
            </option>
          ))}
        </select>
        <select
          value={edgeTarget}
          onChange={(e) => setEdgeTarget(e.target.value)}
          className="ml-2 p-1 rounded border border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-900 text-blue-900 dark:text-blue-200"
        >
          <option value="">Edge Target</option>
          {nodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label}
            </option>
          ))}
        </select> */}
        {/* <button
          onClick={() =>
            edges.length > 0 && removeEdge(edges[edges.length - 1].id)
          }
          className="px-3 py-1 rounded bg-pink-600 text-white font-bold shadow hover:bg-pink-700 transition-colors"
        >
          Remove Last Edge
        </button> */}

        {/* Edit Edge Weight */}
        {false && (
          <>
            <select
              value={editEdgeId}
              onChange={(e) => setEditEdgeId(e.target.value)}
              className="ml-2 p-1 rounded border border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-900 text-blue-900 dark:text-blue-200"
            >
              <option value="">Select Edge</option>
              {edges.map((e) => {
                const sourceLabel =
                  nodes.find((n) => n.id === e.source)?.label || e.source;
                const targetLabel =
                  nodes.find((n) => n.id === e.target)?.label || e.target;
                return (
                  <option key={e.id} value={e.id}>
                    {sourceLabel} → {targetLabel} (wt: {e.weight})
                  </option>
                );
              })}
            </select>
            <input
              type="number"
              min="0"
              value={editEdgeWeight}
              onChange={(e) => setEditEdgeWeight(e.target.value)}
              placeholder="New weight"
              className="p-1 rounded border border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-900 text-blue-900 dark:text-blue-200 w-24"
            />
            <button
              onClick={handleEditEdgeWeight}
              className="px-3 py-1 rounded bg-yellow-500 text-white font-bold shadow hover:bg-yellow-600 transition-colors"
            >
              Edit Edge Weight
            </button>
          </>
        )}

        {/* Speed Control */}
        <label className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-200">
          Speed:
          <input
            type="range"
            min="50"
            max="3000"
            step="10"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="accent-blue-600"
            style={{ width: 220 }} // Increased width
          />
          <span className="w-10 text-center text-xs">{speed}ms</span>
        </label>

        {/* Edge Type Toggle */}
        <button
          onClick={() => {
            if (edgeType === "directed") {
              // Switch to undirected: add reverse edges if missing
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
              // Switch to directed: remove reverse edges that don't have a matching forward edge
              setEdges((eds) =>
                eds.filter(
                  (e) =>
                    !eds.some(
                      (ee) =>
                        ee.source === e.target &&
                        ee.target === e.source &&
                        ee.id !== e.id
                    ) || e.source < e.target // keep only one direction if both exist
                )
              );
              setEdgeType("directed");
            }
          }}
          className={
            "px-3 py-1 rounded font-bold shadow transition-colors " +
            (edgeType === "directed"
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-purple-500 text-white hover:bg-purple-600")
          }
        >
          {edgeType === "directed" ? "Directed" : "Undirected"} Edge
        </button>

        {path.length > 0 && (
          <span className="ml-4 font-mono text-blue-700 dark:text-blue-300">
            Path: {path.join(" → ")}
            {/* Calculate and show total cost if path exists */}
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
                <span className="ml-2 text-blue-900 dark:text-blue-200 font-semibold">
                  (Cost: {cost})
                </span>
              );
            })()}
          </span>
        )}
      </div>

      <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900">
        <svg
          ref={svgRef}
          width="600"
          height="400"
          className="cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseMoveCapture={handleSvgMouseMove}
          onMouseUpCapture={(e) => {
            // If edge drag is in progress and mouseup is not on a node, cancel drag
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
                stroke={isDark ? "#374151" : "#e5e7eb"}
                strokeWidth="1"
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
                dy="2"
                stdDeviation="2"
                floodColor={isDark ? "#000" : "#888"}
                floodOpacity="0.18"
              />
            </filter>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Render edges */}
          {edges.map((edge) => {
            const sourceNode = nodes.find((n) => n.id === edge.source);
            const targetNode = nodes.find((n) => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;

            // Highlight logic for simulation steps and final path
            let isFinalPath = false;
            let edgeColor = edgeColorBase;
            let edgeClass = "";
            if (path.length > 1) {
              for (let i = 0; i < pathStep + 1; i++) {
                if (path[i] === edge.source && path[i + 1] === edge.target) {
                  isFinalPath = true;
                  edgeColor = "#2563eb"; // blue for final path
                  edgeClass = "animate-path-pulse";
                  break;
                }
              }
            }
            if (!isFinalPath) {
              if (highlight.updateEdge === edge.id) {
                edgeColor = "#22c55e"; // green for update
                edgeClass = "animate-path-pulse";
              } else if (highlight.relaxEdge === edge.id) {
                edgeColor = "#06b6d4"; // teal for relax
                edgeClass = "animate-path-pulse";
              }
            }

            // For the arrowhead, keep using getArrowHead for now (it will still point to the end node)
            const edgeControl = getEdgeControl(edge, sourceNode, targetNode);
            // Use new path and arrowhead logic for tangency
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
            // Arrowhead tangent at end
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

            // --- Compute label position on the curve at t=0.5 ---
            // Quadratic Bezier: B(t) = (1-t)^2*P0 + 2*(1-t)*t*C + t^2*P2
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

            // Label color for final path and others
            const labelBg = isFinalPath
              ? "#2563eb"
              : isDark
              ? "#1e293b"
              : "#f3f4f6";
            const labelStroke = isFinalPath
              ? "#1e40af"
              : isDark
              ? "#f3f4f6"
              : "#d1d5db";
            const labelText = isFinalPath
              ? "#fff"
              : isDark
              ? "#f3f4f6"
              : "#334155";

            // Bend handle position
            // const control = getEdgeControl(edge, sourceNode, targetNode);

            return (
              <g key={edge.id}>
                <path
                  d={edgePath}
                  stroke={edgeColor}
                  strokeWidth={isFinalPath || edgeClass ? 7 : 4} // Increased thickness
                  opacity={isFinalPath || edgeClass ? 0.95 : 0.7}
                  fill="none"
                  className={edgeClass}
                  style={{ cursor: "grab" }}
                  onMouseDown={(e) =>
                    handleBendDragStart(e, edge, sourceNode, targetNode)
                  }
                />
                <path
                  d={arrow}
                  fill={edgeColor}
                  opacity={isFinalPath || edgeClass ? 0.95 : 0.7}
                  className={edgeClass}
                  style={{
                    stroke: edgeColor,
                    strokeWidth: isFinalPath || edgeClass ? 3.5 : 2.2, // Arrow border thickness
                  }}
                />
                {inlineEditEdgeId === edge.id ? (
                  <foreignObject
                    x={labelX - 18}
                    y={labelY - 14}
                    width={36}
                    height={28}
                  >
                    <input
                      type="number"
                      min="0"
                      value={inlineEditValue}
                      autoFocus
                      style={{
                        width: 34,
                        height: 26,
                        fontSize: 14,
                        textAlign: "center",
                        borderRadius: 6,
                        border: "2px solid #fbbf24",
                        background: isDark ? "#1e293b" : "#fffbe6",
                        color: isDark ? "#f3f4f6" : "#334155",
                        fontWeight: 600,
                        outline: "none",
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
                      r="13"
                      fill={labelBg}
                      stroke={labelStroke}
                      strokeWidth={isFinalPath ? 2 : 1}
                      opacity={0.95}
                      className={isFinalPath ? "animate-path-pulse" : ""}
                    />
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="13"
                      fontWeight={isFinalPath ? "bold" : "500"}
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

          {/* Render temporary edge during drag */}
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
                  strokeWidth={3}
                  opacity={0.7}
                  fill="none"
                  strokeDasharray="6 4"
                />
              );
            })()}

          {/* Render nodes */}
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
              nodeColor = "#f59e42"; // orange for visit
              nodeStrokeColor = "#f59e42";
              nodeTextColor = "#fff";
              nodeClass = "animate-path-pulse";
            }
            return (
              <g key={node.id}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="27"
                  fill={nodeColor}
                  stroke={nodeStrokeColor}
                  strokeWidth={isFinalPath || nodeClass ? 4 : 2}
                  filter="url(#nodeShadow)"
                  className={
                    "cursor-move hover:fill-blue-50" +
                    (nodeClass ? " animate-path-pulse" : "")
                  }
                  onMouseDown={(e) => {
                    if (e.button === 2) {
                      handleMouseDown(e, node.id); // Right click: move node
                    } else if (e.button === 0) {
                      handleEdgeDragStart(e, node.id); // Left click: start edge drag
                    }
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  onMouseUpCapture={(e) => {
                    // Only handle edge drop if an edge drag is in progress and left click
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
                  fontSize="16"
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
      </div>

      {edgeToDelete && deleteMenuPos && (
        <div
          style={{
            position: "fixed",
            left: deleteMenuPos.x,
            top: deleteMenuPos.y,
            zIndex: 1000,
            background: isDark ? "#1e293b" : "#fff",
            border: "1px solid #fbbf24",
            borderRadius: 8,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            padding: 8,
            minWidth: 90,
            color: isDark ? "#f3f4f6" : "#334155",
          }}
          onMouseLeave={() => {
            setEdgeToDelete("");
            setDeleteMenuPos(null);
          }}
        >
          <button
            className="px-3 py-1 rounded bg-red-600 text-white font-bold shadow hover:bg-red-700 transition-colors w-full"
            onClick={() => {
              setEdges((eds) => eds.filter((e) => e.id !== edgeToDelete));
              setEdgeToDelete("");
              setDeleteMenuPos(null);
            }}
          >
            Remove Edge
          </button>
        </div>
      )}

      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
        Drag nodes to reposition them
      </div>
    </div>
  );
}
