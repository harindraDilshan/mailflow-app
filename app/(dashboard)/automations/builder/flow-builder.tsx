"use client";

import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useEffectEvent, useMemo, useState, useTransition, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Background, BackgroundVariant, ConnectionLineType, Controls, MarkerType, MiniMap, Panel, ReactFlow,
  ReactFlowProvider, useEdgesState, useNodesState, useReactFlow,
  type Connection, type EdgeChange, type NodeChange, type OnSelectionChangeParams, type XYPosition,
} from "@xyflow/react";
import {
  ArrowLeft, ChevronDown, Copy, LayoutGrid, Loader2, MoreHorizontal, MousePointerClick, Pause, Play, Plus, Save, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/components/confirm-dialog";
import { runAction } from "@/components/run-action";
import { AutomationStatusBadge } from "@/components/automations/automation-status-badge";
import { AutomationNav } from "@/components/automations/automation-nav";
import {
  HANDLES, TRIGGER_ID, autoLayout, defaultData, flowIssues, keyOf, makesLoop, nodeId,
  type Flow, type FlowEdge, type FlowIssue, type FlowNode, type Handle,
} from "@/lib/automation-flow";
import type { NodeStats } from "@/lib/automations";
import { isValidEmail, normalizeEmail } from "@/lib/contact-rules";
import { deleteAutomation, duplicateAutomation, saveAutomation, setAutomationStatus } from "../actions";
import { BuilderContext, EDGE_TYPES, HANDLE_LABEL, NODE_TYPES, type BuilderInfo, type StepEdge, type StepNode } from "./canvas-parts";
import { AutomationSettings, StepInspector, type Settings } from "./inspector";
import { PALETTE, type PaletteItem } from "./step-meta";

export type FlowBuilderProps = {
  automation: { id: string; name: string; status: string; fromName: string; fromEmail: string };
  flow: Flow;
  lists: { id: string; name: string }[];
  stats: Record<string, NodeStats> | null;
  domainIssue: { email: string; message: string } | null; // checked on the server for the saved sender
  canActivate: boolean; // the account email is verified
};

const MIME = "application/x-mailflow-step";
const NODE_WIDTH = 240;
const itemKey = (i: PaletteItem) => `${i.type}:${i.kind ?? ""}`;

// ---------- Flow <-> React Flow ----------
function toNodes(flow: Flow): StepNode[] {
  return flow.nodes.map((n) => ({
    id: n.id,
    type: "step",
    position: { x: n.x, y: n.y },
    data: { step: n },
    deletable: n.type !== "trigger",
  }));
}

function toEdge(e: FlowEdge): StepEdge {
  return {
    id: `${e.source}:${e.handle}`,
    source: e.source,
    sourceHandle: e.handle,
    target: e.target,
    targetHandle: "in",
    type: "labeled",
    data: { label: HANDLE_LABEL[e.handle] },
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
  };
}

const fromEdge = (e: StepEdge): FlowEdge => ({ source: e.source, handle: (e.sourceHandle ?? "out") as Handle, target: e.target });

function toFlow(nodes: StepNode[], edges: StepEdge[], nextKey: number): Flow {
  return {
    version: 2,
    nextKey,
    nodes: nodes.map((n) => ({ ...n.data.step, id: n.id, x: Math.round(n.position.x), y: Math.round(n.position.y) }) as FlowNode),
    edges: edges.map(fromEdge),
  };
}

export function FlowBuilder(props: FlowBuilderProps) {
  return (
    <ReactFlowProvider>
      <Builder {...props} />
    </ReactFlowProvider>
  );
}

function Builder({ automation, flow, lists, stats, domainIssue, canActivate }: FlowBuilderProps) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const { screenToFlowPosition, fitView, deleteElements, setCenter, getZoom } = useReactFlow();
  const [nodes, setNodes, applyNodeChanges] = useNodesState<StepNode>(toNodes(flow));
  const [edges, setEdges, applyEdgeChanges] = useEdgesState<StepEdge>(flow.edges.map(toEdge));
  const [nextKey, setNextKey] = useState(flow.nextKey);
  const [settings, setSettings] = useState<Settings>({
    name: automation.name,
    fromName: automation.fromName,
    fromEmail: automation.fromEmail,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, startBusy] = useTransition();
  const [confirmDialog, confirm] = useConfirm();
  const readOnly = automation.status === "active";

  // ----- live view of the workflow -----
  const current = useMemo(() => toFlow(nodes, edges, nextKey), [nodes, edges, nextKey]);
  const listName = useMemo(() => new Map(lists.map((l) => [l.id, l.name])), [lists]);
  const emailSteps = useMemo(
    () =>
      current.nodes
        .filter((n) => n.type === "email")
        .map((n) => ({ value: n.id, label: (n.type === "email" && n.data.subject) || `Email step ${keyOf(n.id) + 1}` })),
    [current]
  );

  const issues = useMemo(() => {
    const list: FlowIssue[] = flowIssues(current, lists);
    const email = normalizeEmail(settings.fromEmail);
    if (!settings.name.trim()) list.push({ message: "Give the automation a name." });
    if (!isValidEmail(email)) list.push({ message: "Enter a valid sender email in the automation settings." });
    else if (domainIssue && domainIssue.email === email) list.push({ message: domainIssue.message });
    return list;
  }, [current, lists, settings, domainIssue]);

  const info: BuilderInfo = useMemo(() => {
    const byNode = new Map<string, string[]>();
    for (const i of issues) if (i.nodeId) byNode.set(i.nodeId, [...(byNode.get(i.nodeId) ?? []), i.message]);
    const emailName = new Map(emailSteps.map((e) => [e.value, e.label]));
    return {
      listName: (id) => listName.get(id),
      emailName: (id) => emailName.get(id),
      issues: byNode,
      connected: new Set(current.edges.map((e) => `${e.source}:${e.handle}`)),
      stats,
      readOnly,
    };
  }, [issues, emailSteps, listName, current, stats, readOnly]);

  // ----- changes from the canvas -----
  const onNodesChange = useCallback(
    (changes: NodeChange<StepNode>[]) => {
      applyNodeChanges(changes);
      if (changes.some((c) => c.type === "position" || c.type === "remove" || c.type === "add" || c.type === "replace")) {
        setDirty(true);
      }
    },
    [applyNodeChanges]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<StepEdge>[]) => {
      applyEdgeChanges(changes);
      if (changes.some((c) => c.type !== "select")) setDirty(true);
    },
    [applyEdgeChanges]
  );

  const onSelectionChange = useCallback(({ nodes: picked }: OnSelectionChangeParams) => {
    setSelectedId(picked.length === 1 ? picked[0].id : null);
  }, []);

  // One connection per output. A new connection from a used output replaces the old one.
  const withoutOutput = (source: string, handle: Handle) =>
    edges.filter((e) => !(e.source === source && (e.sourceHandle ?? "out") === handle));

  function connectionProblem(source: string, target: string, handle: Handle) {
    if (source === target) return "A step cannot connect to itself.";
    if (target === TRIGGER_ID) return "Nothing can connect to the trigger.";
    if (makesLoop(withoutOutput(source, handle).map(fromEdge), source, target)) {
      return "This connection makes a loop. A step cannot lead back to an earlier step.";
    }
    return null;
  }

  function onConnect(c: Connection) {
    const handle = (c.sourceHandle ?? "out") as Handle;
    const problem = connectionProblem(c.source, c.target, handle);
    if (problem) return void toast.error(problem);
    setEdges([...withoutOutput(c.source, handle), toEdge({ source: c.source, handle, target: c.target })]);
    setDirty(true);
  }

  // ----- adding steps -----
  function select(id: string, center = false) {
    setNodes((ns) => ns.map((n) => ({ ...n, selected: n.id === id })));
    setEdges((es) => es.map((e) => (e.selected ? { ...e, selected: false } : e)));
    setSelectedId(id);
    const node = nodes.find((n) => n.id === id);
    if (center && node) setCenter(node.position.x + NODE_WIDTH / 2, node.position.y + 60, { zoom: getZoom(), duration: 300 });
  }

  function addStep(item: PaletteItem, dropAt?: XYPosition) {
    if (readOnly) return;
    const id = nodeId(nextKey);
    let position: XYPosition;
    let from: { source: string; handle: Handle } | null = null;

    if (dropAt) {
      position = { x: dropAt.x - NODE_WIDTH / 2, y: dropAt.y - 30 };
    } else {
      // Clicked in the palette: put it under the selected (or the lowest) step, on its free output.
      const base = nodes.find((n) => n.id === selectedId) ?? nodes.reduce((low, n) => (n.position.y > low.position.y ? n : low));
      const free = HANDLES[base.data.step.type].find((h) => !edges.some((e) => e.source === base.id && e.sourceHandle === h));
      const side = free === "yes" || free === "a" ? -1 : free === "no" || free === "b" ? 1 : 0;
      position = { x: base.position.x + side * 150, y: base.position.y + 170 };
      if (free) from = { source: base.id, handle: free };
    }

    const step = { id, type: item.type, x: position.x, y: position.y, data: defaultData(item.type, item.kind) } as FlowNode;
    setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), { id, type: "step", position, data: { step }, selected: true }]);
    if (from) setEdges((es) => [...es, toEdge({ ...from, target: id })]);
    setNextKey((k) => k + 1);
    setSelectedId(id);
    setDirty(true);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    const item = PALETTE.flatMap((g) => g.items).find((i) => itemKey(i) === e.dataTransfer.getData(MIME));
    if (item) addStep(item, screenToFlowPosition({ x: e.clientX, y: e.clientY }));
  }

  function updateStep(id: string, data: FlowNode["data"]) {
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { step: { ...n.data.step, data } as FlowNode } } : n)));
    setDirty(true);
  }

  function arrange() {
    const laid = new Map(autoLayout(current).nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
    setNodes((ns) => ns.map((n) => ({ ...n, position: laid.get(n.id) ?? n.position })));
    setDirty(true);
    requestAnimationFrame(() => fitView({ duration: 300, padding: 0.2, maxZoom: 1 }));
  }

  // ----- saving and status -----
  async function save() {
    const res = await runAction(saveAutomation, {
      id: automation.id,
      name: settings.name,
      fromName: settings.fromName,
      fromEmail: settings.fromEmail,
      flow: JSON.stringify(current),
    });
    if (res?.ok) setDirty(false);
    return Boolean(res?.ok);
  }

  function turnOn() {
    const trigger = current.nodes.find((n) => n.type === "trigger");
    confirm({
      title: automation.status === "paused" ? "Resume this automation?" : "Turn on this automation?",
      description:
        trigger?.type === "trigger" && trigger.data.triggerType === "tag_added"
          ? `People who get the tag "${trigger.data.triggerValue}" from now on enter it. While it is on, you cannot change the workflow.`
          : "People who join the list from now on enter it. While it is on, you cannot change the workflow.",
      confirmLabel: automation.status === "paused" ? "Resume" : "Turn on",
      onConfirm: async () => {
        if (dirty && !(await save())) return;
        await runAction(setAutomationStatus, { id: automation.id, to: "active" });
      },
    });
  }

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      if (!readOnly && dirty && !busy) startBusy(async () => void (await save()));
    }
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const selected = current.nodes.find((n) => n.id === selectedId) ?? null;

  return (
    <BuilderContext.Provider value={info}>
      <div className="flex h-[calc(100dvh-8.5rem)] min-h-[640px] flex-col gap-3">
        {/* ----- toolbar ----- */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" className="-ml-2" render={<Link href="/automations" />}>
            <ArrowLeft />
            Automations
          </Button>
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="max-w-64 truncate text-base font-semibold tracking-tight">{settings.name || "Untitled automation"}</h1>
            <AutomationStatusBadge status={automation.status} />
          </div>
          <AutomationNav id={automation.id} active="workflow" />

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {readOnly ? "On: pause it to make changes" : dirty ? "Unsaved changes" : "All changes saved"}
            </span>
            {!readOnly && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="lg:hidden" />}>
                    <Plus />
                    Add step
                    <ChevronDown />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    {PALETTE.map((g) => (
                      <div key={g.group}>
                        <DropdownMenuLabel>{g.group}</DropdownMenuLabel>
                        {g.items.map((i) => (
                          <DropdownMenuItem key={itemKey(i)} onClick={() => addStep(i)}>
                            <i.icon />
                            {i.label}
                          </DropdownMenuItem>
                        ))}
                      </div>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" onClick={arrange}>
                  <LayoutGrid />
                  Arrange
                </Button>
                <Button variant="outline" size="sm" disabled={!dirty || busy} onClick={() => startBusy(async () => void (await save()))}>
                  {busy ? <Loader2 className="animate-spin" /> : <Save />}
                  Save
                </Button>
              </>
            )}
            {readOnly ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => startBusy(async () => void (await runAction(setAutomationStatus, { id: automation.id, to: "paused" })))}
              >
                <Pause />
                Pause
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={busy || issues.length > 0 || !canActivate}
                title={!canActivate ? "Verify your account email first." : issues.length > 0 ? "Fix the problems in the settings panel first." : undefined}
                onClick={turnOn}
              >
                <Play />
                {automation.status === "paused" ? "Resume" : "Turn on"}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="icon-sm" aria-label="More actions" />}>
                <MoreHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={() =>
                    startBusy(async () => {
                      const res = await runAction(duplicateAutomation, { id: automation.id });
                      if (res?.ok && res.id) router.push(`/automations/${res.id}`);
                    })
                  }
                >
                  <Copy />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() =>
                    confirm({
                      title: `Delete "${automation.name}"?`,
                      description: "People who are in it now leave at their next step. Its results are deleted. You cannot undo this.",
                      confirmLabel: "Delete automation",
                      destructive: true,
                      onConfirm: async () => {
                        const res = await runAction(deleteAutomation, { id: automation.id });
                        if (res?.ok) {
                          setDirty(false);
                          router.push("/automations");
                        }
                      },
                    })
                  }
                >
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {readOnly && (
          <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            This automation is on. The numbers on the steps are live. To change the workflow, pause it first.
          </p>
        )}
        {!readOnly && !canActivate && (
          <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            You can build and save now. To turn the automation on, verify your account email first.
          </p>
        )}

        {/* ----- palette | canvas | settings ----- */}
        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
          {!readOnly && (
            <aside className="hidden w-52 shrink-0 space-y-4 overflow-y-auto rounded-xl border border-border bg-card p-3 lg:block" aria-label="Steps">
              {PALETTE.map((g) => (
                <div key={g.group} className="space-y-1.5">
                  <div className="text-[11px] font-medium text-muted-foreground uppercase">{g.group}</div>
                  {g.items.map((i) => (
                    <button
                      key={itemKey(i)}
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(MIME, itemKey(i));
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={() => addStep(i)}
                      title="Drag onto the canvas, or click to add after the selected step"
                      className="flex w-full cursor-grab items-start gap-2 rounded-lg border border-border bg-background p-2 text-left transition-colors hover:border-foreground/30 hover:bg-muted/50 active:cursor-grabbing"
                    >
                      <i.icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="block text-xs font-medium">{i.label}</span>
                        <span className="block text-[11px] text-muted-foreground">{i.hint}</span>
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </aside>
          )}

          <div className="relative min-h-[420px] flex-1 overflow-hidden rounded-xl border border-border bg-card">
            <ReactFlow<StepNode, StepEdge>
              nodes={nodes}
              edges={edges}
              nodeTypes={NODE_TYPES}
              edgeTypes={EDGE_TYPES}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              isValidConnection={(c) => connectionProblem(c.source, c.target, (c.sourceHandle ?? "out") as Handle) === null}
              onSelectionChange={onSelectionChange}
              onDrop={onDrop}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              nodesDraggable={!readOnly}
              nodesConnectable={!readOnly}
              deleteKeyCode={readOnly ? null : ["Backspace", "Delete"]}
              connectionLineType={ConnectionLineType.SmoothStep}
              colorMode={resolvedTheme === "dark" ? "dark" : "light"}
              fitView
              fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
              minZoom={0.2}
              maxZoom={1.5}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
              <Controls showInteractive={false} />
              <MiniMap pannable zoomable className="hidden md:block" />
              {!readOnly && nodes.length === 1 && (
                <Panel position="top-center">
                  <p className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground shadow-xs">
                    <MousePointerClick className="size-3.5" />
                    Drag a step from the left onto the canvas, then connect it to the trigger.
                  </p>
                </Panel>
              )}
            </ReactFlow>
          </div>

          <aside className="max-h-[60vh] w-full shrink-0 overflow-y-auto rounded-xl border border-border bg-card p-4 lg:max-h-none lg:w-80" aria-label="Settings">
            {selected ? (
              <StepInspector
                key={selected.id}
                step={selected}
                readOnly={readOnly}
                lists={lists.map((l) => ({ value: l.id, label: l.name }))}
                emailSteps={emailSteps.filter((e) => e.value !== selected.id)}
                problems={info.issues.get(selected.id) ?? []}
                stats={stats?.[selected.id]}
                sender={settings}
                onChange={(data) => updateStep(selected.id, data)}
                onDelete={() => deleteElements({ nodes: [{ id: selected.id }] })}
              />
            ) : (
              <AutomationSettings
                settings={settings}
                readOnly={readOnly}
                issues={issues}
                domainNote={
                  domainIssue && domainIssue.email === normalizeEmail(settings.fromEmail) ? domainIssue.message : null
                }
                onChange={(patch) => {
                  setSettings((s) => ({ ...s, ...patch }));
                  setDirty(true);
                }}
                onPick={(id) => select(id, true)}
              />
            )}
          </aside>
        </div>
      </div>
      {confirmDialog}
    </BuilderContext.Provider>
  );
}

