import { useState, useRef } from 'react'
import classes from "./App.module.css";
import { createNode, addChild, removeNode, updateNode, reparent, reorderAmongSiblings } from './scene/tree';
import type { Node, Transform, Primitive } from './scene/types';
import Hierarchy from './components/Hierarchy';
import Scene from './components/Scene';
import Inspector from './components/Inspector';

function App() {

  // State representing the tree. We initialize the root only
  const [root, setRoot] = useState<Node | null>(
    () => createNode("Root", undefined, undefined, true)
  );
  // State representing the currently selected node
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const onReorderHandler = (childId: string, parentId: string, targetIndex: number) => {
    setRoot(prev => reorderAmongSiblings(prev, childId, parentId, targetIndex));
    setSelectedId(childId);
  };

  return (
    <div className={classes.container}>
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
      <Scene

      />
      <Inspector
      
      />
    </div>
  )
}

export default App;
