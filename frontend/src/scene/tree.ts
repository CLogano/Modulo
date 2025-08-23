// Helper functions for managing a tree of type <Node>
import type { Node } from './types';
import type { Transform } from './types';
import type { Primitive } from './types';
import { v4 as uuidv4 } from "uuid";

// Creating the root node
// Starts with default transform (0 pos, 1 scale, 0 rot)
export function createNode(
  name: string,
  transform: Transform = {
    position: [0,0,0],
    scale: [1,1,1],
    rotation: [0,0,0]
  },
  render?: { primitive: Primitive },
  isRoot: boolean = false
): Node {
  return {
    id: isRoot ? "root" : uuidv4(),
    name,
    transform,
    children: [],
    ...(render ? { render } : {})
  };
}

// Adds current node as a child of node with id 'parentId'.
// Appends to end of the children list.
// Avoids unneccessary cloning of nodes if subtree doesn't contain parentId.
export function addChild(
    root: Node | null | undefined,
    parentId: string,
    node: Node | null | undefined
): Node | null {

    if (!root || !node) {
        return root ?? null; // if root doesn't exist, return null
    }

    // Found the parent node
    if (root.id === parentId) {
        return {
            ...root,
            transform: { ...root.transform },
            children: [...root.children, node], // Aopend the desired node as a child of parent
            render: root.render ? { ...root.render } : undefined,
        };
    }

    // Recurse
    let modified = false;
    const newChildren = root.children.map(child => {

        const updated = addChild(child, parentId, node); // try adding from each child
        if (updated !== child) {
            modified = true; // only true if child was changed
        }
            
        return updated ?? child;
    });

    // Return unchanged root if no modifications found down this path
    if (!modified) {
        return root;
    }

    // Clone node with updated children
    return {
        ...root,
        transform: { ...root.transform },
        children: newChildren,
        render: root.render ? { ...root.render } : undefined,
    }
}

// Deletes a node (cascade delete).
// If root node is deleted, return null.
// If leaf node is deleted, remove from parent's children.
// If middle node is deleted, delete entire subtree.
// If 'targetId' doesnt exist, tree remains unchanged.
export function deleteNode(
    root: Node | null | undefined,
    targetId: string
): Node | null {

    // If root doesnt exist we simply return nothing
    if (!root) {
        return null;
    }

    // If target node is found, then return nothing
    if (root.id === targetId) {
        return null;
    }

    // Recurse
    let modified = false;
    const newChildren = root.children.map(child => {
        const updated = deleteNode(child, targetId); // try to delete from each child
        if (updated !== child) {
            modified = true; // child deleted OR subtree changed
        }
        return updated;
    }).filter((child): child is Node => child !== null); // throw away deleted ones

    // Return unchanged root if no modifications found down this path
    if (!modified) {
        return root;
    }

    // Clone node with updated children
    return {
        ...root,
        transform: { ...root.transform },
        children: newChildren,
        render: root.render ? { ...root.render } : undefined,
    }
}

// Finds a node in the tree by 'targetId'
// Returns the node reference if found, otherwise null
export function findNode(
    root: Node | null | undefined,
    targetId: string
): Node | null {

    if (!root) {
        return null;
    }

    // Found target node
    if (root.id === targetId) {
        return root;
    }

    // Recurse
    for (const child of root.children) {
        const found = findNode(child, targetId);
        if (found) {
            return found;
        }
    }

    // If target node is not found, return nothing
    return null;
}

// Update a node's values by 'targetId'
// Takes a "patch" object with the fields you want to overwrite
export function updateNode(
    root: Node | null | undefined,
    targetId: string,
    updates: Partial<Omit<Node, "id" | "children" | "transform">> & {
        transform?: Partial<Transform>;
    } // can't update id or children
): Node | null {

    if (!root) {
        return null;
    }

    // Update target node
    if (root.id === targetId) {
        return {
            ...root,
            name: updates.name ?? root.name,
            transform: updates.transform
                ? { ...root.transform, ...(updates.transform as Partial<Transform>) }
                : root.transform,
            children: root.children,
            render: updates.render
                ? { ...(root.render ?? {}), ...updates.render }
                : root.render
        };
    }

    // Recurse
    let modified = false;
    const newChildren = root.children.map(child => {
        const updated = updateNode(child, targetId, updates); // try to update each child
        if (updated !== child) {
            modified = true;
        }
        return updated ?? child;
    });

    // Return unchanged root if no modifications found down this path
    if (!modified) {
        return root;
    }

    // Clone node with updated children
    return {
        ...root,
        transform: { ...root.transform },
        children: newChildren,
        render: root.render ? { ...root.render } : undefined,
    };
}

// Assign a node under a new parent
// TODO
// export function reparent(root: Node, id: string, parentId: string): Node | null {

// }

// Print tree for debugging purposes
export function printTree(root: Node | null | undefined, depth: number = 0): void {

    if (!root) {
        console.log("(empty tree)");
        return;
    }

    const indent = "  ".repeat(depth);
    console.log(
        `${indent}- ${root.name}`,
        root.render ? ` [${root.render.primitive}]` : ""
    );

    root.children.forEach(child => printTree(child, depth + 1));
}