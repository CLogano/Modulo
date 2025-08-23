import classes from "./Tree.module.css";
import type { Node, Transform, Primitive } from "../scene/types";
import TreeNode from "./TreeNode";

interface TreeProps {
    root: Node;
    selectedId: string | null;
    onSelect: (targetId: string) => void;
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

const Tree = (props: TreeProps) => {

    const { root, selectedId, onSelect, onAdd, onDelete, onUpdate } = props;

    return (
        <div className={classes.container}>
            <TreeNode
                node={root}
                selectedId={selectedId}
                onSelect={onSelect}
                onAdd={onAdd}
                onDelete={onDelete}
                onUpdate={onUpdate}
            />
        </div>
    );
};

export default Tree;