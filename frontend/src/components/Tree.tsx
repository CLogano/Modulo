import { useEffect } from "react";
import classes from "./Tree.module.css";
import type { Node, Transform, Primitive } from "../scene/types";
import TreeNode from "./TreeNode";

interface TreeProps {
    root: Node;
    justCreatedIdRef: React.RefObject<string | null>;
    selectedId: string | null;
    onSelect: (targetId: string | null) => void;
    onAdd: (
        parentId: string | null,
        name: string,
        transform?: Transform,
        render?: { primitive: Primitive }
    ) => void;
    onDelete: (targetId: string) => void;
    onUpdate: (id: string, updates: Partial<Node>) => void;
    onReparent: (childId: string, parentId: string) => void;
    onReorder: (childId: string, parentId: string, targetIndex: number) => void;
}

const Tree = (props: TreeProps) => {

    const { root, justCreatedIdRef, selectedId, onSelect, onAdd, onDelete, onUpdate, onReparent, onReorder } = props;

    // Clear selection when clicking anywhere that isn't stopped (i.e., outside rows/actions/dropdowns)
    useEffect(() => {
        const handleDocDown = () => onSelect(null);
        document.addEventListener("mousedown", handleDocDown);
        return () => document.removeEventListener("mousedown", handleDocDown);
    }, [onSelect]);

    return (
        <div className={classes.container}>
            <TreeNode
                node={root}
                parentId={null}
                indexInParent={0}
                justCreatedIdRef={justCreatedIdRef}
                selectedId={selectedId}
                onSelect={onSelect}
                onAdd={onAdd}
                onDelete={onDelete}
                onUpdate={onUpdate}
                onReparent={onReparent}
                onReorder={onReorder}
            />
        </div>
    );
};

export default Tree;