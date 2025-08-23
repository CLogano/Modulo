import { useEffect, useRef, useState } from "react";
import classes from "./TreeNode.module.css";
import type { Node, Transform, Primitive } from "../scene/types";

interface TreeNodeProps {
    node: Node;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onAdd: (
        parentId: string | null,
        name: string,
        transform?: Transform,
        render?: { primitive: Primitive },
        isRoot?: boolean
    ) => void;
    onDelete: (targetId: string) => void;
    onUpdate: (id: string, updates: Partial<Node>) => void;
}

const TreeNode = (props: TreeNodeProps) => {

    const { node, selectedId, onSelect, onAdd, onDelete, onUpdate } = props;

    const isSelected = selectedId === node.id;

    // State to monitor editing of node
    const [isEditing, setIsEditing] = useState(false);
    // Ref for managing the node name
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-enter edit mode ONCE on mount if this node is selected and was just created with "New Node"
    // (App sets selectedId to the new node's id immediately after creation)
    useEffect(() => {
        if (isSelected && node.name === "New Node") {
            setIsEditing(true);
        }
        // run only on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Autofocus input when editing
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const commitRename = (value: string) => {
        setIsEditing(false);
        const next = value.trim();
        if (next && next !== node.name) onUpdate(node.id, { name: next });
    };

    return (
    <div
      className={`${classes.container} ${node.id === "root" ? classes.root : ""}`}
    >
      <div
        className={`${classes.row} ${isSelected ? classes.selectedRow : ""}`}
        onClick={() => onSelect(node.id)}
        onDoubleClick={() => setIsEditing(true)}
        title="Double-click to rename"
      >
        <div className={`${classes.label} ${isSelected ? classes.selected : ""}`}>
          {isEditing ? (
            <input
              ref={inputRef}
              className={classes.input}
              defaultValue={node.name}
              onBlur={(e) => commitRename(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  commitRename((e.target as HTMLInputElement).value);
                if (e.key === "Escape") setIsEditing(false);
              }}
            />
          ) : (
            node.name
          )}
        </div>

        <div className={classes.actions} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onAdd(node.id, "New Node")}>＋</button>
          {node.id !== "root" && (
            <button onClick={() => onDelete(node.id)}>🗑</button>
          )}
        </div>
      </div>
      <div className={classes.children}>
                {node.children.map((child) => (
                    <TreeNode
                        key={child.id}
                        node={child}
                        selectedId={selectedId}
                        onSelect={onSelect}
                        onAdd={onAdd}
                        onDelete={onDelete}
                        onUpdate={onUpdate}
                    />
                ))}
            </div>
        </div>
    );
};

export default TreeNode;