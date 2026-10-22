import { SHORT_DESCRIPTIONS } from "./conceptPresentation.js";
import { memo, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  BaseEdge,
  Handle,
  MarkerType,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  getViewportForBounds,
  useReactFlow,
  useViewport,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import { ArrowRightIcon, ChartBarIcon, CornersOutIcon, GraphIcon, ListBulletsIcon, MinusIcon, PlusIcon } from "@phosphor-icons/react";
import "@xyflow/react/dist/style.css";
import "./concept-map.css";

const NODE_WIDTH = 184;
const NODE_HEIGHT = 96;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 1.6;
const EMPTY_IDS = [];

// These marks identify mathematical topics; the labels remain the accessible names.
const CONCEPT_MARKS = {
  integer_arithmetic: "±",
  fractions: "½",
  decimals: "0.1",
  ratios_proportions: "a:b",
  percentages: "%",
  algebraic_simplification: "x+y",
  linear_equations: "x=",
  exponents: "xⁿ",
  polynomials: "axⁿ",
  quadratic_equations: "x²",
  geometry_area: "A",
  geometry_volume: "V",
  probability_basics: "P",
};

function ConceptMark({ id }) {
  return (
    <span className={`concept-map-mark${["decimals", "ratios_proportions", "algebraic_simplification", "polynomials"].includes(id) ? " is-wide" : ""}`} aria-hidden="true">
      {id === "data_interpretation" ? <ChartBarIcon size={24} weight="duotone" /> : CONCEPT_MARKS[id] ?? "x"}
    </span>
  );
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}

function StatusBadges({ recommended, primary, selected }) {
  return (
    <span className="concept-map-badges">
      {recommended && (
        <span className="concept-map-badge is-review">Suggested review</span>
      )}
      {primary && (
        <span className="concept-map-badge is-primary">Problem topic</span>
      )}
      {selected && <span className="concept-map-selected-label">Selected</span>}
    </span>
  );
}

const ConceptNode = memo(function ConceptNode({ id, data }) {
  const { zoom } = useViewport();
  const isOverview = zoom < 0.85;
  return (
    <div className={`concept-map-node${data.selected ? " is-selected" : ""}${data.onPath ? " is-on-path" : ""}${isOverview ? " is-overview" : ""}`}>
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <button
        type="button"
        className="concept-map-node-button nodrag nopan"
        aria-pressed={data.selected}
        aria-label={`${data.label}${data.recommended ? ", suggested review" : ""}${data.primary ? ", problem topic" : ""}. Show concept details.`}
        onClick={() => data.onSelect?.(id)}
      >
        <ConceptMark id={id} />
        <span className="concept-map-node-copy">
          <span className="concept-map-node-title">{data.label}</span>
          {!isOverview && (
            <span className="concept-map-node-description">
              {SHORT_DESCRIPTIONS[id] ?? data.description}
            </span>
          )}
        </span>
      </button>
      <StatusBadges
        recommended={data.recommended}
        primary={data.primary}
        selected={data.selected}
      />
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  );
});

// Dagre supplies waypoints that keep long prerequisite edges clear of intervening nodes.
// Round their corners while preserving the actual graph's direct connections.
function roundedPath(points) {
  if (points.length < 2) return "";
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    const next = points[index + 1];
    const incoming = Math.hypot(point.x - previous.x, point.y - previous.y);
    const outgoing = Math.hypot(next.x - point.x, next.y - point.y);
    const radius = Math.min(22, incoming / 2, outgoing / 2);
    if (!incoming || !outgoing) continue;
    const before = {
      x: point.x - ((point.x - previous.x) / incoming) * radius,
      y: point.y - ((point.y - previous.y) / incoming) * radius,
    };
    const after = {
      x: point.x + ((next.x - point.x) / outgoing) * radius,
      y: point.y + ((next.y - point.y) / outgoing) * radius,
    };
    path += ` L ${before.x} ${before.y} Q ${point.x} ${point.y} ${after.x} ${after.y}`;
  }
  const last = points[points.length - 1];
  return `${path} L ${last.x} ${last.y}`;
}

function PrerequisiteEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  markerEnd,
  style,
}) {
  const points = [
    { x: sourceX, y: sourceY },
    ...(data?.points?.slice(1, -1) ?? []),
    { x: targetX, y: targetY },
  ];
  return (
    <BaseEdge path={roundedPath(points)} markerEnd={markerEnd} style={style} />
  );
}

const nodeTypes = { concept: ConceptNode };
const edgeTypes = { prerequisite: PrerequisiteEdge };

function fitGraphViewport(container, bounds, padding) {
  const { width, height } = container.getBoundingClientRect();
  return getViewportForBounds(bounds, width, height, MIN_ZOOM, 1, padding);
}

function FitOnResize({ containerRef, fitPadding, graphBounds }) {
  const { setViewport, viewportInitialized } = useReactFlow();
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !viewportInitialized) return undefined;
    let { width: previousWidth, height: previousHeight } = container.getBoundingClientRect();
    const fit = () => setViewport(fitGraphViewport(container, graphBounds, fitPadding), { duration: 0 });
    fit();
    let timeout;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0 || (Math.abs(width - previousWidth) < 1 && Math.abs(height - previousHeight) < 1)) return;
      previousWidth = width;
      previousHeight = height;
      window.clearTimeout(timeout);
      // Observe the canvas box, not transformed graph contents, to avoid feedback loops.
      timeout = window.setTimeout(fit, 140);
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, [containerRef, setViewport, viewportInitialized, graphBounds, fitPadding]);
  return null;
}

function MapControls({ reducedMotion, fitPadding, containerRef, graphBounds }) {
  const { zoomIn, zoomOut, setViewport } = useReactFlow();
  const { zoom } = useViewport();
  const duration = reducedMotion ? 0 : 160;
  return (
    <Panel position="bottom-left" className="concept-map-controls">
      <div
        className="concept-map-zoom-group"
        role="group"
        aria-label="Map zoom"
      >
        <button
          type="button"
          title="Zoom out"
          aria-label="Zoom out"
          disabled={zoom <= MIN_ZOOM + 0.01}
          onClick={() => zoomOut({ duration })}
        >
          <MinusIcon size={16} aria-hidden="true" />
        </button>
        <output aria-label="Zoom level">{Math.round(zoom * 100)}%</output>
        <button
          type="button"
          title="Zoom in"
          aria-label="Zoom in"
          disabled={zoom >= MAX_ZOOM - 0.01}
          onClick={() => zoomIn({ duration })}
        >
          <PlusIcon size={16} aria-hidden="true" />
        </button>
      </div>
      <span className="concept-map-controls-divider" />
      <button
        type="button"
        className="concept-map-fit"
        onClick={() =>
          containerRef.current && setViewport(
            fitGraphViewport(containerRef.current, graphBounds, fitPadding),
            { duration: reducedMotion ? 0 : 220 },
          )
        }
        title="Fit all concepts in view"
      >
        <CornersOutIcon size={16} aria-hidden="true" /> Fit
      </button>
    </Panel>
  );
}

function getLayoutBounds(layout) {
  if (!layout.nodes.length) return { x: 0, y: 0, width: 1, height: 1 };
  // Dagre can route a direct edge outside all node boxes. Include every waypoint,
  // plus the badges below nodes, so Fit never cuts off a real connection.
  const points = layout.nodes.flatMap((node) => [
    { x: node.position.x - 15, y: node.position.y - 6 },
    { x: node.position.x + NODE_WIDTH + 15, y: node.position.y + NODE_HEIGHT + 60 },
  ]);
  layout.edges.forEach((edge) => {
    for (const point of edge.data.points) {
      points.push({ x: point.x - 6, y: point.y - 6 }, { x: point.x + 6, y: point.y + 6 });
    }
  });
  const x = Math.min(...points.map((point) => point.x));
  const y = Math.min(...points.map((point) => point.y));
  return {
    x,
    y,
    width: Math.max(...points.map((point) => point.x)) - x,
    height: Math.max(...points.map((point) => point.y)) - y,
  };
}

function MapLegend() {
  const { zoom } = useViewport();
  return (
    <Panel position="bottom-right" className="concept-map-legend">
      <ArrowRightIcon size={15} aria-hidden="true" />
      <span>Builds on an earlier skill{zoom < 0.85 && " · Zoom for detail"}</span>
    </Panel>
  );
}

function createLayout(concepts) {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({
    rankdir: "LR",
    ranksep: 38,
    nodesep: 72,
    edgesep: 22,
    marginx: 8,
    marginy: 12,
  });
  graph.setDefaultEdgeLabel(() => ({}));
  const ids = new Set(concepts.map((concept) => concept.id));
  concepts.forEach((concept) =>
    graph.setNode(concept.id, { width: NODE_WIDTH, height: NODE_HEIGHT }),
  );
  concepts.forEach((concept) => {
    (concept.prerequisites ?? []).forEach((prerequisite) => {
      if (ids.has(prerequisite)) graph.setEdge(prerequisite, concept.id);
    });
  });
  dagre.layout(graph);
  return {
    nodes: concepts.map((concept) => {
      const position = graph.node(concept.id);
      return {
        id: concept.id,
        type: "concept",
        position: {
          x: position.x - NODE_WIDTH / 2,
          y: position.y - NODE_HEIGHT / 2,
        },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        data: concept,
        draggable: false,
        selectable: false,
        focusable: false,
      };
    }),
    edges: graph.edges().map(({ v, w }) => ({
      id: `${v}->${w}`,
      source: v,
      target: w,
      type: "prerequisite",
      data: { points: graph.edge(v, w).points },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#7D8C81",
        width: 19,
        height: 19,
      },
      style: { stroke: "#7D8C81", strokeWidth: 1.9 },
      selectable: false,
      focusable: false,
    })),
  };
}

export default function ConceptMap({
  concepts = EMPTY_IDS,
  requiredConcepts = EMPTY_IDS,
  primaryConcepts = EMPTY_IDS,
  selectedId,
  recommendedId,
  onSelect,
}) {
  const isSmallScreen = useMediaQuery("(max-width: 699px)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [chosenView, setChosenView] = useState(null);
  const view = chosenView ?? (isSmallScreen ? "list" : "map");
  const headingId = useId();
  const panelId = useId();
  const instructionId = useId();
  const canvasRef = useRef(null);
  const conceptsById = useMemo(
    () => new Map(concepts.map((concept) => [concept.id, concept])),
    [concepts],
  );
  const includedConcepts = useMemo(() => {
    const included = new Set([...requiredConcepts, ...primaryConcepts]);
    return concepts.filter((concept) => included.has(concept.id));
  }, [concepts, requiredConcepts, primaryConcepts]);
  const primaryIds = useMemo(() => new Set(primaryConcepts), [primaryConcepts]);
  const prerequisitePath = useMemo(() => {
    const connected = new Set();
    const includedIds = new Set(includedConcepts.map((concept) => concept.id));
    const visit = (id) => {
      if (!includedIds.has(id) || connected.has(id)) return;
      connected.add(id);
      for (const prerequisite of conceptsById.get(id)?.prerequisites ?? []) visit(prerequisite);
    };
    visit(selectedId);
    return connected;
  }, [includedConcepts, selectedId, conceptsById]);
  const problemPath = useMemo(() => {
    const includedIds = new Set(includedConcepts.map((concept) => concept.id));
    const reachesProblem = new Set();
    const visitPrerequisites = (id) => {
      if (!includedIds.has(id) || reachesProblem.has(id)) return;
      reachesProblem.add(id);
      for (const prerequisite of conceptsById.get(id)?.prerequisites ?? []) visitPrerequisites(prerequisite);
    };
    primaryIds.forEach(visitPrerequisites);

    const successors = new Map(includedConcepts.map((concept) => [concept.id, []]));
    includedConcepts.forEach((concept) => {
      for (const prerequisite of concept.prerequisites ?? []) successors.get(prerequisite)?.push(concept.id);
    });
    const connected = new Set();
    const visitSuccessors = (id) => {
      // Keep only descendants on an actual path from the selection to a problem topic.
      if (!reachesProblem.has(id) || connected.has(id)) return;
      connected.add(id);
      for (const successor of successors.get(id) ?? []) visitSuccessors(successor);
    };
    visitSuccessors(selectedId);
    return connected;
  }, [includedConcepts, selectedId, conceptsById, primaryIds]);
  const graphKey = includedConcepts.map((concept) => concept.id).join("|");
  const fitPadding = useMemo(
    () => ({
      x: includedConcepts.length > 8 ? 0.07 : 0.04,
      top: 0.05,
      // Bounds include badges; reserve screen space for the bottom toolbar.
      bottom: "64px",
    }),
    [includedConcepts.length],
  );
  const layout = useMemo(
    () => createLayout(includedConcepts),
    [includedConcepts],
  );
  const graphBounds = useMemo(() => getLayoutBounds(layout), [layout]);
  const nodes = useMemo(
    () =>
      layout.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          selected: node.id === selectedId,
          recommended: node.id === recommendedId,
          primary: primaryIds.has(node.id),
          onPath: prerequisitePath.has(node.id) || problemPath.has(node.id),
          onSelect,
        },
      })),
    [layout.nodes, selectedId, recommendedId, primaryIds, prerequisitePath, problemPath, onSelect],
  );
  const edges = useMemo(
    () => layout.edges.map((edge) => {
      const onPath = (prerequisitePath.has(edge.source) && prerequisitePath.has(edge.target)) ||
        (problemPath.has(edge.source) && problemPath.has(edge.target));
      const color = onPath ? "#648873" : "#7D8C81";
      return {
        ...edge,
        className: onPath ? "concept-map-path-edge" : undefined,
        markerEnd: { ...edge.markerEnd, color },
        style: { stroke: color, strokeWidth: onPath ? 2.5 : 1.9, opacity: onPath ? 1 : 0.92 },
      };
    }),
    [layout.edges, prerequisitePath, problemPath],
  );

  return (
    <section
      className={`concept-map-section is-${view}-view`}
      aria-label="Concept map"
    >
      <div className="concept-map-heading">
        <div>
          <h1 id={headingId}>How the ideas connect</h1>
          <p>Follow the connections. Find your starting point.</p>
        </div>
        <div
          className="concept-map-view-switch"
          role="group"
          aria-label="Concept view"
        >
          {["map", "list"].map((option) => (
            <button
              type="button"
              key={option}
              aria-pressed={view === option}
              aria-controls={panelId}
              onClick={() => setChosenView(option)}
            >
              {option === "map" ? <GraphIcon size={16} weight={view === option ? "fill" : "regular"} aria-hidden="true" /> : <ListBulletsIcon size={16} aria-hidden="true" />}
              {option === "map" ? "Map" : "List"}
            </button>
          ))}
        </div>
      </div>

      {!includedConcepts.length ? (
        <div className="concept-map-empty" id={panelId}>
          <p>No concepts to show yet.</p>
          <span>
            Run a diagnosis to see the skills connected to your problem.
          </span>
        </div>
      ) : view === "list" ? (
        <div id={panelId} className="concept-map-list-panel">
          <p className="concept-map-list-intro">
            Choose a concept to see its details. Prerequisites are the skills
            that come directly before it.
          </p>
          <ul className="concept-map-list">
            {includedConcepts.map((concept) => (
              <li key={concept.id}>
                <button
                  type="button"
                  className={`concept-map-list-row${selectedId === concept.id ? " is-selected" : ""}`}
                  aria-pressed={selectedId === concept.id}
                  onClick={() => onSelect?.(concept.id)}
                >
                  <ConceptMark id={concept.id} />
                  <span className="concept-map-list-title">
                    {concept.label}
                  </span>
                  <span className="concept-map-list-description">
                    {concept.description}
                  </span>
                  <span className="concept-map-list-prerequisites">
                    <span>Prerequisites</span>
                    {(concept.prerequisites ?? []).length
                      ? concept.prerequisites
                          .map(
                            (id) =>
                              conceptsById.get(id)?.label ??
                              id.replaceAll("_", " "),
                          )
                          .join(", ")
                      : "None — foundational concept"}
                  </span>
                  <StatusBadges
                    recommended={concept.id === recommendedId}
                    primary={primaryIds.has(concept.id)}
                    selected={concept.id === selectedId}
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div
          ref={canvasRef}
          id={panelId}
          className="concept-map-canvas"
          aria-label="Prerequisite map"
          aria-describedby={instructionId}
        >
          <p id={instructionId} className="concept-map-sr-only">
            Arrows go from prerequisite skills to the concepts that use them.
            Select a concept to show its details. Tab moves between concepts and
            controls. Use the List view for a text description of each
            relationship.
          </p>
          <ReactFlowProvider key={graphKey}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              nodesDraggable={false}
              nodesConnectable={false}
              nodesFocusable={false}
              edgesFocusable={false}
              elementsSelectable={false}
              zoomOnDoubleClick={false}
              deleteKeyCode={null}
              selectionKeyCode={null}
              panOnDrag
              autoPanOnNodeFocus={false}
              ariaLabelConfig={{
                "edge.a11yDescription.default": "A prerequisite connection.",
              }}
            >
              <FitOnResize containerRef={canvasRef} fitPadding={fitPadding} graphBounds={graphBounds} />
              <MapControls
                reducedMotion={reducedMotion}
                fitPadding={fitPadding}
                containerRef={canvasRef}
                graphBounds={graphBounds}
              />
              <MapLegend />
            </ReactFlow>
          </ReactFlowProvider>
        </div>
      )}
    </section>
  );
}

export { ConceptMap };
