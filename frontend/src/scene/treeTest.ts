import { createNode, addChild, deleteNode, updateNode, findNode } from "./tree.ts";
import { printTree } from "./tree.ts";
import type { Node } from "./types.ts";

// Step 1: create a root
let root: Node | null = createNode("root", undefined, undefined, true);

// Step 2: create some children
const child1: Node = createNode("child1");
const child2: Node = createNode("child2", { position: [1, 0, 0], scale: [1,1,1], rotation: [0,0,0] });
const child3: Node = createNode("child3", { position: [2, 0, 0], scale: [1,1,1], rotation: [0,0,0] });
const child4: Node = createNode("child4", { position: [3, 0, 0], scale: [1,1,1], rotation: [0,0,0] });
const child5: Node = createNode("child5", { position: [4, 0, 0], scale: [1,1,1], rotation: [0,0,0] });

// Step 3: build tree
root = addChild(root, "root", child1)!;
root = addChild(root, "root", child3)!;
root = addChild(root, child1.id, child2)!;   // c2 under c1
root = addChild(root, child3.id, child4)!;   // c4 under c3
root = addChild(root, child3.id, child5)!;   // c5 also under c3

console.log("==== After Adds ====");
printTree(root);

// Step 4: update a node
root = updateNode(root, child2.id, {
  name: "updated-child2",
  transform: { position: [5, 5, 5] }
})!;
console.log("\n==== After Update (child2) ====");
printTree(root);

// Step 5: find a node
const found = findNode(root, child2.id);
console.log("\n==== Find Node child2 ====");
console.log(found);

// Step 6: delete a node (leaf only: c5)
root = deleteNode(root, child5.id)!;
console.log("\n==== After Delete (leaf child5) ====");
printTree(root);

// Step 7: cascade delete a subtree (delete c3, which has c4 under it)
root = deleteNode(root, child3.id)!;
console.log("\n==== After Cascade Delete (child3 with child4) ====");
printTree(root);

// Step 8: delete the root
root = deleteNode(root, "root");
console.log("\n==== After Delete (root) ====");
printTree(root);