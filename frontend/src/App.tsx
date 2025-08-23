import { useState } from 'react'
import classes from "./App.module.css";
import { createNode, addChild, deleteNode, updateNode } from './scene/tree';
import type { Node, Transform, Primitive } from './scene/types';
import Hierarchy from './components/Hierarchy';
import Scene from './components/Scene';
import Inspector from './components/Inspector';

function App() {

  // State representing the tree
  const [root, setRoot] = useState<Node | null>(null);
  // State representing the currently selected node
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
    isRoot: boolean = false
  ) => {

    // Create the node
    const newNode = createNode(name, transform, render, isRoot);

    if (isRoot) {
      setRoot(newNode); // create root
    } else if (parentId) {
      setRoot(prev => addChild(prev, parentId, newNode)); // add child
    }

    setSelectedId(newNode.id);
  };

  // Handle deleting a node
  const onDeleteHandler = (targetId: string) => {
    setRoot(prev => deleteNode(prev, targetId));
    if (selectedId === targetId) {
      setSelectedId(null); // unselect if the deleted node was selected
    }
  };

  // Handle updating a node (rename, transform, render, etc.)
  const onUpdateHandler = (id: string, updates: Partial<Node>) => {
    setRoot((prev) => updateNode(prev, id, updates));
  };

  return (
    <div className={classes.container}>
      <Hierarchy
        root={root}
        selectedId={selectedId}
        onSelect={onSelectHandler}
        onAdd={onAddHandler}
        onDelete={onDeleteHandler}
        onUpdate={onUpdateHandler}
      />
      <Scene

      />
      <Inspector
      
      />
    </div>
  )
}

export default App;
