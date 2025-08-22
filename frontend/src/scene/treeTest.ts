import { createRoot, addChild, deleteNode, updateNode, findNode } from "./tree.ts";
import { printTree } from "./tree.ts";
import type { Node } from "./types.ts";

// Step 1: create a root
let root: Node | null = createRoot("root");

// Step 2: create some children
const child1: Node = {
  id: "c1",
  name: "child1",
  transform: { position: [0, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0] },
  children: []
};

const child2: Node = {
  id: "c2",
  name: "child2",
  transform: { position: [1, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0] },
  children: []
};

const child3: Node = {
  id: "c3",
  name: "child3",
  transform: { position: [2, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0] },
  children: []
};

const child4: Node = {
  id: "c4",
  name: "child4",
  transform: { position: [3, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0] },
  children: []
};

const child5: Node = {
  id: "c5",
  name: "child5",
  transform: { position: [4, 0, 0], scale: [1, 1, 1], rotation: [0, 0, 0] },
  children: []
};

// Step 3: build tree
root = addChild(root, "root", child1)!;
root = addChild(root, "root", child3)!;
root = addChild(root, "c1", child2)!;   // c2 is under c1
root = addChild(root, "c3", child4)!;   // c4 is under c3
root = addChild(root, "c3", child5)!;   // c5 is also under c3

console.log("==== After Adds ====");
printTree(root);

// Step 4: update a node
root = updateNode(root, "c2", {
  name: "updated-child2",
  transform: { position: [5, 5, 5] }
})!;
console.log("\n==== After Update (c2) ====");
printTree(root);

// Step 5: find a node
const found = findNode(root, "c2");
console.log("\n==== Find Node c2 ====");
console.log(found);

// Step 6: delete a node (leaf only: c5)
root = deleteNode(root, "c5")!;
console.log("\n==== After Delete (leaf c5) ====");
printTree(root);

// Step 7: cascade delete a subtree (delete c3, which has c4 under it)
root = deleteNode(root, "c3")!;
console.log("\n==== After Cascade Delete (c3 with child c4) ====");
printTree(root);

// Step 8: delete the root
root = deleteNode(root, "root");
console.log("\n==== After Delete (root) ====");
printTree(root);