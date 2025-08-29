import type { Node } from "../scene/types";

export type PersistedScene = {
  id: string;
  title: string;
  root: Node;        
};

const KEY = "scene:v1";

export function loadLocal(): PersistedScene | null {
    try {
        const s = localStorage.getItem(KEY);
        return s ? JSON.parse(s) : null;
    } catch {
        return null;
    }
}

export function saveLocal(doc: PersistedScene) {
    try { 
        localStorage.setItem(KEY, JSON.stringify(doc));
    } catch { 

    }
}