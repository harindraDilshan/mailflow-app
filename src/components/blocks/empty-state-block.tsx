import * as React from "react";
import { Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { placeholders } from "@/src/lib/placeholders";

interface EmptyStateBlockProps {
  title?: string;
  description?: string;
  buttonText?: string;
  onAction?: () => void;
}

export function EmptyStateBlock({
  title = placeholders.emptyState.title,
  description = placeholders.emptyState.description,
  buttonText = placeholders.emptyState.button,
  onAction,
}: EmptyStateBlockProps) {
  return (
    <Card className="flex flex-col items-center justify-center border-dashed py-12 text-center">
      <CardContent className="flex flex-col items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-full border border-border bg-muted">
          <Inbox className="size-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
        </div>
        <Button size="sm" onClick={onAction} className="mt-2">
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );
}
