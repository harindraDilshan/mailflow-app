"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { FlowBuilderProps } from "./flow-builder";

// The canvas measures the screen and follows the color theme, so it renders only in the browser.
const FlowBuilder = dynamic(() => import("./flow-builder").then((m) => m.FlowBuilder), {
  ssr: false,
  loading: () => <Skeleton className="h-[calc(100dvh-8.5rem)] min-h-[640px] w-full rounded-xl" />,
});

export function FlowBuilderLoader(props: FlowBuilderProps) {
  return <FlowBuilder {...props} />;
}
