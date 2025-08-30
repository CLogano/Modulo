import { useState, useRef, useEffect } from 'react'
import classes from "./App.module.css";
import { createNode, addChild, removeNode, updateNode, reparent, reorderAmongSiblings } from './model/tree';
import type { Node, Transform, Primitive } from './model/types';
import { loadLocal, saveLocal } from "./utils/persist";
import Hierarchy from './components/hierarchy/Hierarchy';
import Scene from './components/scene/Scene';
import Inspector from './components/inspector/Inspector';
import { clamp } from './utils/math';

function App() {

  // State representing the tree. We initialize the root only
  const [root, setRoot] = useState<Node | null>(
    () => createNode("Sample Scene", undefined, undefined, true)
  );
  // State representing the currently selected node
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Resizable layout state. Hierarchy / Inspector default widths of 400px each
  const [leftWidth, setLeftWidth] = useState<number>(400);  // Hierarchy width (px)
  const [rightWidth, setRightWidth] = useState<number>(400); // Inspector width (px)
  // Ref for storing gutter drag info
  const dragState = useRef<{ side: "left" | "right"; startX: number; startW: number } | null>(null);

  // Holds the id of the node that should auto-enter rename mode only ONCE upon creation
  const justCreatedIdRef = useRef<string | null>(null);

  // Load project from local storage on mount
  useEffect(() => {
    const saved = loadLocal();
    if (saved?.root) {
      setRoot(saved.root);
    }
  }, []);

  // Auto-save every time the root changes
  // Wait 500ms in between to prevent rapid saves
  useEffect(() => {
    if (!root) {
      return;
    }

    // Save after 500ms
    const timer = setTimeout(() => {
      saveLocal({ id: "local", title: "Scene", root });
    }, 500);

    // If root changes again within 500ms, cancel the previous save
    return () => clearTimeout(timer);
  }, [root]);

  // Handle a newly selected node
  const onSelectHandler = (id: string | null) => {
    setSelectedId(id);
  }

  // Handle adding a node
  const onAddHandler = (
    parentId: string | null,
    name: string = "New Node",
    transform?: Partial<Transform>,
    render?: { primitive: Primitive },
  ) => {

    // Create the node
    const newNode = createNode(name, transform, render);
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

  // Handle updating a node (rename, transform, etc.)
  const onUpdateHandler = (id: string, updates: Partial<Node>) => {
    setRoot((prev) => updateNode(prev, id, updates));
  };

  // Handle reparenting: drop dragged node ON a target node
  const onReparentHandler = (childId: string, newParentId: string) => {

    if (childId === newParentId) {
      return;
    }

    // Ask the Scene to do a view-side reparent (preserves world),
    // then Scene will call onUpdate(...) with the child's new local TRS,
    // and finally we do a structure-only reparent in the model.
    window.dispatchEvent(new CustomEvent("scene:request-reparent", {
      detail: { childId, newParentId }
    }));

    setRoot(prev => reparent(prev, childId, newParentId));
    setSelectedId(childId); // keep the moved node selected
  };

  // Handle reordering among siblings: drop dragged node above or below a target sibling
  const onReorderHandler = (childId: string, parentId: string, targetIndex: number) => {
    setRoot(prev => reorderAmongSiblings(prev, childId, parentId, targetIndex));
    setSelectedId(childId); // keep the moved node selected
  };

  // Begin dragging a gutter (left or right)
  // Gutters are used to adjust the width of one of the panes (hierarchy / center / inspector)
  const onGutterMouseDown = (side: "left" | "right") => (e: React.MouseEvent) => {
    e.preventDefault();
    if (side === "left") {
      dragState.current = { side, startX: e.clientX, startW: leftWidth }; // remember we are dragging from left gutter
    } else {
      dragState.current = { side, startX: e.clientX, startW: rightWidth }; // remember we are dragging from right gutter
    }
    // Attach listeners on window so drag continues outside gutter
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "col-resize"; // style cursor
    document.body.style.userSelect = "none";
  };

  // Update width of hierarchy / inspector when dragging the mouse over the gutter
  const onMouseMove = (e: MouseEvent) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;

    if (dragState.current.side === "left") {
      // Moving gutter: leftWidth = start + dx
      const next = clamp(dragState.current.startW + dx, 100, 600);
      setLeftWidth(next);
    } else {
      // Moving right gutter: rightWidth = start - dx (drag right shrinks inspector)
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
        <Scene 
          root={root}
          selectedId={selectedId}
          onSelect={onSelectHandler}
          onUpdate={onUpdateHandler}
        />
      </div>
      <div className={`${classes.gutter} ${classes.gutterRight}`} onMouseDown={onGutterMouseDown("right")} />
      <div className={classes.paneRight} style={{ flex: `0 0 ${rightWidth}px` }}>
        <Inspector 
          root={root}
          selectedId={selectedId}
          onUpdate={onUpdateHandler}
        />
      </div>
    </div>
  )
}

export default App;
