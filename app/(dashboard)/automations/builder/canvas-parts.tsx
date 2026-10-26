"use client";

import { createContext, memo, useContext } from "react";
import {
  BaseEdge, EdgeLabelRenderer, Handle, Position, getSmoothStepPath, useReactFlow,
  type Edge, type EdgeProps, type Node, type NodeProps,
} from "@xyflow/react";
import { AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { HANDLES, type FlowNode, type Handle as HandleId } from "@/lib/automation-flow";
import type { NodeStats } from "@/lib/automations";
import { STEP_LOOK, stepSummary, stepTitle } from "./step-meta";

export type StepNode = Node<{ step: FlowNode }, "step">;
export type StepEdge = Edge<{ label?: string }, "labeled">;

export const HANDLE_LABEL: Partial<Record<HandleId, string>> = { yes: "Yes", no: "No", a: "A", b: "B" };

// What the step cards need from the builder, without passing it through React Flow's node data.
export type BuilderInfo = {
  listName: (id: string) => string | undefined;
  emailName: (id: string) => string | undefined;
  issues: Map<string, string[]>;
  connected: Set<string>; // "nodeId:handle" of outputs that have a connection
  stats: Record<string, NodeStats> | null;
  readOnly: boolean;
};
export const BuilderContext = createContext<BuilderInfo | null>(null);
const useBuilder = () => useContext(BuilderContext)!;

const pct = (n = 0, base = 0) => (base > 0 ? `${Math.round((n / base) * 100)}%` : "—");
const HANDLE = "!size-3 !border-2 !border-background !bg-muted-foreground";

function StepCardView({ id, data, selected }: NodeProps<StepNode>) {
  const { listName, emailName, issues, connected, stats, readOnly } = useBuilder();
  const step = data.step;
  const look = STEP_LOOK[step.type];
  const problems = issues.get(id) ?? [];
  const s = stats?.[id];
  const outputs = HANDLES[step.type];

  return (
    <div
      className={cn(
        "w-60 rounded-xl border bg-card text-card-foreground shadow-sm transition-[border-color,box-shadow]",
        selected ? "border-primary ring-2 ring-primary/25" : problems.length > 0 ? "border-destructive/60" : "border-border"
      )}
    >
      {step.type !== "trigger" && (
        <Handle type="target" position={Position.Top} id="in" className={HANDLE} isConnectable={!readOnly} />
      )}

      <div className="flex items-center gap-2 px-3 pt-2.5">
        <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md", look.tint)}>
          <look.icon className="size-3.5" />
        </span>
        <span className="truncate text-xs font-medium">{stepTitle(step)}</span>
        {problems.length > 0 && (
          <span className="ml-auto text-destructive" title={problems.join("\n")}>
            <AlertCircle className="size-3.5" />
            <span className="sr-only">{problems.join(" ")}</span>
          </span>
        )}
      </div>
      <p className="line-clamp-2 px-3 pt-1 pb-2.5 text-xs text-muted-foreground">
        {stepSummary(step, { list: listName, email: emailName })}
      </p>

      {s && (s.waiting > 0 || s.sent !== undefined) && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground tabular-nums">
          {s.sent !== undefined && <span>{formatNumber(s.sent)} sent</span>}
          {!!s.sent && <span>{pct(s.opened, s.sent)} opened</span>}
          {!!s.sent && <span>{pct(s.clicked, s.sent)} clicked</span>}
          {s.waiting > 0 && <span className="font-medium text-foreground">{formatNumber(s.waiting)} here now</span>}
        </div>
      )}

      {outputs.length === 1 && (
        <Handle type="source" position={Position.Bottom} id="out" className={HANDLE} isConnectable={!readOnly} />
      )}
      {outputs.length === 2 &&
        outputs.map((h, i) => (
          <Handle
            key={h}
            type="source"
            position={Position.Bottom}
            id={h}
            style={{ left: i === 0 ? "28%" : "72%" }}
            className={cn(HANDLE, (h === "yes" || h === "a") && "!bg-emerald-500", (h === "no" || h === "b") && "!bg-rose-500")}
            isConnectable={!readOnly}
          >
            {/* Once connected, the line carries the label. */}
            {!connected.has(`${id}:${h}`) && (
              <span className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 text-[10px] font-medium text-muted-foreground">
                {HANDLE_LABEL[h]}
              </span>
            )}
          </Handle>
        ))}
    </div>
  );
}

function LabeledEdgeView({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, style, selected, data,
}: EdgeProps<StepEdge>) {
  const { deleteElements } = useReactFlow();
  const { readOnly } = useBuilder();
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 14,
  });

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={{ ...style, strokeWidth: selected ? 2.5 : 1.5 }} />
      {(data?.label || (selected && !readOnly)) && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-auto absolute flex items-center gap-1"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {data?.label && (
              <span className="rounded-full border border-border bg-background px-1.5 py-px text-[10px] font-medium">
                {data.label}
              </span>
            )}
            {selected && !readOnly && (
              <button
                type="button"
                aria-label="Delete connection"
                onClick={() => deleteElements({ edges: [{ id }] })}
                className="flex size-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-xs hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

// Outside any component, so React Flow does not re-create them on every render.
export const NODE_TYPES = { step: memo(StepCardView) };
export const EDGE_TYPES = { labeled: memo(LabeledEdgeView) };
