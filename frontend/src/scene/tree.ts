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
// Returns the updated root.
export function addChild(
    root: Node | null,
    parentId: string,
    node: Node | null
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

// Removes a node (cascade delete).
// If root node is removed, return null.
// If leaf node is removed, remove from parent's children.
// If middle node is removed, remove entire subtree.
// If 'targetId' doesnt exist, tree remains unchanged.
// Returns the updated root, along with the removed node.
export function removeNode(
    root: Node | null,
    targetId: string
): { newRoot: Node | null, removed: Node | null } {

    // If root doesnt exist we simply return nothing
    if (!root) {
        return { newRoot: null, removed: null };
    }

    // If target node is found, then return only removed root
    if (root.id === targetId) {
        return { newRoot: null, removed: root };
    }

    // Recurse
    let modified = false;
    let removed: Node | null = null;
    const newChildren = root.children.map(child => {

        const { newRoot: updatedChild, removed: r } = removeNode(child, targetId); // try to delete from each child
        if (r) {
            removed = r;
            modified = true; // child deleted OR subtree changed
        }

        return updatedChild;

    }).filter((child): child is Node => child !== null); // throw away deleted ones

    // Return unchanged root if no modifications found down this path
    if (!modified) {
        return { newRoot: root, removed: null };
    }

    // Clone node with updated children
    return {
        newRoot: {
            ...root,
            transform: { ...root.transform },
            children: newChildren,
            render: root.render ? { ...root.render } : undefined,
        },
        removed
    };
}

// Finds a node in the tree by 'targetId'.
// Returns the node reference if found, otherwise null.
export function findNode(
    root: Node | null,
    targetId: string
): Node | null {

    // If root doesnt exist we simply return nothing
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
// Returns the updated root.
export function updateNode(
    root: Node | null,
    targetId: string,
    updates: Partial<Omit<Node, "id" | "children" | "transform">> & {
        transform?: Partial<Transform>;
    } // can't update id or children
): Node | null {

    // If root doesnt exist we simply return nothing
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

// Assign a node under a new parent.
// Appends the child node at the end of the parent's children array.
// Cannot reparent under itself or a descendant node.
// Returns the updated root.
export function reparent(
    root: Node | null,
    childId: string,
    parentId: string
): Node | null {

    // If root doesnt exist we simply return nothing
    if (!root) {
        return null;
    }

    // Prevent reparenting under itself
    if (childId === parentId) {
        return root;
    }

    // Remove the node
    const { newRoot, removed } = removeNode(root, childId);
    if (!newRoot || !removed) {
        return root; // could not remove child
    }

    // Prevent reparenting under a descendant
    if (findNode(removed, parentId)) {
        console.warn("Cannot reparent a node under its own descendant");
        return root;
    }

    // Add the child under the new parent
    return addChild(newRoot, parentId, removed);
}

// Reorder a node among its siblings.
// Parent node remains the same.
// Returns the updated root.
export function reorderAmongSiblings(
    root: Node | null,
    childId: string,
    parentId: string,
    targetIndex: number
): Node | null {

    // If root doesnt exist we simply return nothing
    if (!root) {
        return null;
    }

    // If we're trying to reorder the root itself, do nothing
    if (root.id === childId) {
        return root;
    }

    // We found the parent node, so reorder the child to 'targetIndex'
    if (root.id === parentId) {

        // Find the child in the parent's children array
        const childIndex = root.children.findIndex(child => child.id === childId);

        // If the child is not in the parent, return unchanged
        if (childIndex === -1 || childIndex === targetIndex) {
            return root;
        }

        // Remove the child
        const newChildren = [...root.children];
        const [childToMove] = newChildren.splice(childIndex, 1);

        // Clamp target index to [0, newChildren.length]
        let clampedIndex = Math.max(0, Math.min(targetIndex, newChildren.length));

        // Insert at the clampedIndex
        newChildren.splice(clampedIndex, 0, childToMove);

        // Return updated parent
        return {
            ...root,
            transform: { ...root.transform },
            children: newChildren,
            render: root.render ? { ...root.render } : undefined,
        };
    }

    // Recurse
    let modified = false;
    const newChildren = root.children.map(child => {
        const updated = reorderAmongSiblings(child, childId, parentId, targetIndex);
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