"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_META, type StatusKey } from "./types";

interface StatusBadgeProps {
  status: StatusKey;
  className?: string;
  withDot?: boolean;
}

/**
 * Maps a status key → colored pill badge with label and optional dot.
 * Colors: done=#10b981, review=#f59e0b, prog=#38bdf8, todo=#94a3b8, block=#fb7185
 */
export function StatusBadge({ status, className, withDot = true }: StatusBadgeProps) {
  const meta = STATUS_META[status];
  return (
    <Badge
      variant="secondary"
      className={cn("gap-1.5 rounded-full font-semibold", className)}
      style={{ backgroundColor: meta.bg, color: meta.text }}
    >
      {withDot && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: meta.dot }}
        />
      )}
      {meta.label}
    </Badge>
  );
}
