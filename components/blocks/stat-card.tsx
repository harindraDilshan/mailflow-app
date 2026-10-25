import * as React from "react";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { placeholders } from "@/src/lib/placeholders";

interface StatCardProps {
  title?: string;
  value?: string;
  delta?: string;
  description?: string;
}

export function StatCard({
  title = placeholders.statCard.title,
  value = placeholders.statCard.value,
  delta = placeholders.statCard.delta,
  description = placeholders.statCard.description,
}: StatCardProps) {
  return (
    <Card className="flex flex-col justify-between">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        <Badge variant="outline" className="gap-0.5 font-mono text-[11px] font-normal">
          <ArrowUpRight className="size-3" />
          {delta}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
          {value}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
