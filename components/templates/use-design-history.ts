"use client";

import { useCallback, useRef, useState } from "react";
import type { EmailDesign } from "@/lib/email-design";

const LIMIT = 100;
const MERGE_MS = 1000;

type History = { past: EmailDesign[]; present: EmailDesign | null; future: EmailDesign[] };

/**
 * A design with undo and redo. Fast changes with the same key (for example, typing in one field)
 * become one step, so one undo does not remove only one letter.
 */
export function useDesignHistory(initial: EmailDesign | null) {
  const [h, setH] = useState<History>({ past: [], present: initial, future: [] });
  const last = useRef({ key: "", at: 0 });

  const change = useCallback((next: EmailDesign, key = "") => {
    const now = Date.now();
    const merge = key !== "" && key === last.current.key && now - last.current.at < MERGE_MS;
    last.current = { key, at: now };
    setH((s) => ({
      past: merge || !s.present ? s.past : [...s.past, s.present].slice(-LIMIT),
      present: next,
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    last.current = { key: "", at: 0 };
    setH((s) =>
      s.past.length === 0
        ? s
        : { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: s.present ? [s.present, ...s.future] : s.future }
    );
  }, []);

  const redo = useCallback(() => {
    last.current = { key: "", at: 0 };
    setH((s) =>
      s.future.length === 0
        ? s
        : { past: s.present ? [...s.past, s.present] : s.past, present: s.future[0], future: s.future.slice(1) }
    );
  }, []);

  /** A new design without history, for example after "Choose a template". */
  const reset = useCallback((d: EmailDesign | null) => {
    last.current = { key: "", at: 0 };
    setH({ past: [], present: d, future: [] });
  }, []);

  return { design: h.present, change, undo, redo, reset, canUndo: h.past.length > 0, canRedo: h.future.length > 0 };
}

export type DesignHistory = ReturnType<typeof useDesignHistory>;
