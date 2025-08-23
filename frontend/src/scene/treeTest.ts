import { createNode, addChild, removeNode, updateNode, findNode, reparent, reorderAmongSiblings } from "./tree.ts";
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
{
  const { newRoot, removed } = removeNode(root, child5.id);
  root = newRoot;
  console.log("\n==== After Delete (leaf child5) ====");
  console.log("Removed:", removed?.name);
  printTree(root);
}

// Step 7: cascade delete a subtree (delete c3, which has c4 under it)
{
  const { newRoot, removed } = removeNode(root, child3.id);
  root = newRoot;
  console.log("\n==== After Cascade Delete (child3 with child4) ====");
  console.log("Removed subtree root:", removed?.name);
  printTree(root);
}

// Step 8: reparent (move child2 from under child1 → under root)
{
  root = reparent(root, child2.id, "root");
  console.log("\n==== After Reparent (move child2 under root) ====");
  printTree(root);
}

// Step 9: add more root-level siblings, then move updated-child2 to the END
{
  const child6: Node = createNode("child6");
  const child7: Node = createNode("child7");
  root = addChild(root, "root", child6)!;
  root = addChild(root, "root", child7)!;

  console.log("\n==== Before Reorder (root level) ====");
  printTree(root);

  // Move updated-child2 to end (use an over-large target to test clamping/appending)
  root = reorderAmongSiblings(root, child2.id, "root", 999)!;

  console.log("\n==== After Reorder: move 'updated-child2' to END ====");
  printTree(root);
}

// Step 10: move updated-child2 to the FRONT at root level
{
  root = reorderAmongSiblings(root, child2.id, "root", -10)!; // clamps to 0

  console.log("\n==== After Reorder: move 'updated-child2' to FRONT ====");
  printTree(root);
}

// Step 11: deep reorder under child1 — create grandchildren and reorder within them
{
  const g1: Node = createNode("g1");
  const g2: Node = createNode("g2");
  const g3: Node = createNode("g3");

  root = addChild(root, child1.id, g1)!;
  root = addChild(root, child1.id, g2)!;
  root = addChild(root, child1.id, g3)!;

  console.log("\n==== Before Deep Reorder (under 'child1') ====");
  printTree(root);

  // Move g2 to index 0 (front)
  root = reorderAmongSiblings(root, g2.id, child1.id, 0)!;
  console.log("\n==== After Deep Reorder: move 'g2' → index 0 under 'child1' ====");
  printTree(root);

  // Move g1 to the end
  root = reorderAmongSiblings(root, g1.id, child1.id, 999)!;
  console.log("\n==== After Deep Reorder: move 'g1' → END under 'child1' ====");
  printTree(root);

  // Move g2 down to index 2 (exercise downward move)
  root = reorderAmongSiblings(root, g2.id, child1.id, 2)!;
  console.log("\n==== After Deep Reorder: move 'g2' → index 2 under 'child1' ====");
  printTree(root);
}

// Step 12: no-op — wrong parentId (was deleted earlier / not found)
{
  root = reorderAmongSiblings(root, child1.id, "non-existent-parent", 0)!;
  console.log("\n==== No-op Reorder (parent not found) ====");
  printTree(root);
  // (root should be unchanged)
}

// Step 13: no-op — trying to reorder the root itself
{
  root = reorderAmongSiblings(root, "root", "root", 1)!;
  console.log("\n==== No-op Reorder (cannot reorder root) ====");
  printTree(root);
}