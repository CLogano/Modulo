import { useState, useCallback } from "react";
import type { Node } from "../model/types";

// Hook for keeping track of tree history and providing functionality for undo / redo actions
// Keep track of history state with past, present, and future arrays
// Apply --> push to past, clear future
// Undo --> pop from past, set present to past, push to future
// Redo --> push to past, set present to future, pop from future

type History = { past: Node[]; present: Node; future: Node[] };

// Set a limit to how much we can undo / redo
const MAX_HISTORY = 100;

export function useUndoRedo(initial: Node) {

    const [history, setHistory] = useState<History>({
        past: [],
        present: initial,
        future: [],
    });

    const apply = useCallback((fn: (prev: Node) => Node) => {

        setHistory(h => {

            const next = fn(h.present);
            if (next === h.present) { // no-op guard
                return h;
            }

            const cappedPast =
                h.past.length >= MAX_HISTORY ? h.past.slice(1) : h.past;

            return {
                past: [...cappedPast, h.present], // push to end
                present: next,
                future: [],                       // clear redo on new branch
            };
        });
    }, []);

    const undo = useCallback(() => {

        setHistory(h => {
            
            if (h.past.length === 0) {
                return h;
            }

            const prev = h.past[h.past.length - 1]; // pop from end

            return {
                past: h.past.slice(0, -1),
                present: prev,
                future: [...h.future, h.present],     // push current to end
            };
        });
    }, []);

    const redo = useCallback(() => {

        setHistory(h => {

            if (h.future.length === 0) {
                return h;
            }

            const next = h.future[h.future.length - 1]; // pop from end
            
            return {
                past: [...h.past, h.present],             // push current to end
                present: next,
                future: h.future.slice(0, -1),
            };
        });
    }, []);

    const replace = useCallback((next: Node) => {
        setHistory({ past: [], present: next, future: [] });
    }, []);

    return {
        root: history.present,
        apply,
        undo,
        redo,
        canUndo: history.past.length > 0,
        canRedo: history.future.length > 0,
        replace,
    };
}