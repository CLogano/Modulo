import { useState, useRef, useCallback } from 'react'
import classes from "./App.module.css";
import { createNode, addChild, removeNode, updateNode, reparent, reorderAmongSiblings } from './scene/tree';
import type { Node, Transform, Primitive } from './scene/types';
import Hierarchy from './components/Hierarchy';
import Scene from './components/Scene';
import Inspector from './components/Inspector';

// Clamp function for resizing
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function App() {

  // State representing the tree. We initialize the root only
  const [root, setRoot] = useState<Node | null>(
    () => createNode("Root", undefined, undefined, true)
  );
  // State representing the currently selected node
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Resizable layout state
  const [leftWidth, setLeftWidth] = useState<number>(320);  // Hierarchy width (px)
  const [rightWidth, setRightWidth] = useState<number>(320); // Inspector width (px)
  const dragState = useRef<{ side: "left" | "right"; startX: number; startW: number } | null>(null);

  // Holds the id of the node that should auto-enter rename mode only ONCE upon creation
  const justCreatedIdRef = useRef<string | null>(null);

  // Handle a newly selected node
  const onSelectHandler = (id: string) => {
    setSelectedId(id);
  }

  // Handle adding a node
  const onAddHandler = (
    parentId: string | null,
    name: string = "New Node",
    transform?: Transform,
    render?: { primitive: Primitive },
  ) => {

    // Create the node
    const newNode = createNode(name, transform, render, false);
    if (parentId) {
      setRoot(prev => addChild(prev, parentId, newNode)); // Attach the node under the parent
      setSelectedId(newNode.id); // Select this node
      justCreatedIdRef.current = newNode.id; // Mark for one-time auto-edit
    }
  };

  // Handle deleting a node
  const onDeleteHandler = (targetId: string) => {
    setRoot(prev => removeNode(prev, targetId).newRoot);
    if (selectedId === targetId) {
      setSelectedId(null); // Unselect if the deleted node was selected
    }
  };

  // Handle updating a node (rename, transform, render, etc.)
  const onUpdateHandler = (id: string, updates: Partial<Node>) => {
    setRoot((prev) => updateNode(prev, id, updates));
  };

  // Handle reparenting: drop dragged node ON a target node
  const onReparentHandler = (childId: string, newParentId: string) => {

    if (childId === newParentId) {
      return;
    }
    setRoot(prev => reparent(prev, childId, newParentId));
    setSelectedId(childId); // keep the moved node selected
  };

  // Handle reordering among siblings: drop dragged node above or below a target sibling
  const onReorderHandler = (childId: string, parentId: string, targetIndex: number) => {
    setRoot(prev => reorderAmongSiblings(prev, childId, parentId, targetIndex));
    setSelectedId(childId);
  };

  // Start a drag on the specified gutter ("left" or "right") and capture initial mouse/width
  const onGutterMouseDown = useCallback((side: "left" | "right") => (e: React.MouseEvent) => {
    e.preventDefault();
    if (side === "left") {
      dragState.current = { side, startX: e.clientX, startW: leftWidth };
    } else {
      dragState.current = { side, startX: e.clientX, startW: rightWidth };
    }
    // attach listeners on window so drag continues outside gutter
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [leftWidth, rightWidth]);

  // While dragging, compute delta and update the appropriate pane width (clamped)
  const onMouseMove = (e: MouseEvent) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;

    if (dragState.current.side === "left") {
      // moving gutter: leftWidth = start + dx
      const next = clamp(dragState.current.startW + dx, 200, 600);
      setLeftWidth(next);
    } else {
      // moving right gutter: rightWidth = start - dx (drag right shrinks inspector)
      const next = clamp(dragState.current.startW - dx, 100, 600);
      setRightWidth(next);
    }
  };

  // Finish drag: clear state, remove listeners, and restore cursor/selection
  const onMouseUp = () => {
    dragState.current = null;
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  return (
    <div className={classes.container}>
      <div className={classes.paneLeft} style={{ flex: `0 0 ${leftWidth}px` }}>
        <Hierarchy
          root={root!}
          justCreatedIdRef={justCreatedIdRef}
          selectedId={selectedId}
          onSelect={onSelectHandler}
          onAdd={onAddHandler}
          onDelete={onDeleteHandler}
          onUpdate={onUpdateHandler}
          onReparent={onReparentHandler}
          onReorder={onReorderHandler}
        />
      </div>
      <div className={`${classes.gutter} ${classes.gutterLeft}`} onMouseDown={onGutterMouseDown("left")} />
      <div className={classes.paneCenter}>
        <Scene root={root} selectedId={selectedId} onSelect={onSelectHandler} />
      </div>
      <div className={`${classes.gutter} ${classes.gutterRight}`} onMouseDown={onGutterMouseDown("right")} />
      <div className={classes.paneRight} style={{ flex: `0 0 ${rightWidth}px` }}>
        <Inspector />
      </div>
    </div>
  )
}

export default App;
