import classes from "./Hierarchy.module.css";
import type { Node, Transform, Primitive } from "../scene/types";
import Tree from "./Tree";
import { AccountTree } from "@mui/icons-material";

interface HierarchyProps {
    root: Node | null;
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

const Hierarchy = (props: HierarchyProps) => {

    const { root, selectedId, onSelect, onAdd, onDelete, onUpdate } = props;

    return (
        <div className={classes.container}>
            <header className={classes.header}>
                <AccountTree className={classes.icon} />
                <div className={classes.title}>Hierarchy</div>
            </header>
            {!root ? (
                // If no root exists, show a "Create Root" button
                <button
                    onClick={() =>
                        onAdd(null, "New Node", undefined, undefined, true)
                    }
                >
                    Create Root
                </button>
            ) : (
                <Tree
                    root={root}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    onAdd={onAdd}
                    onDelete={onDelete}
                    onUpdate={onUpdate}
                />
            )}
        </div>
    )
};

export default Hierarchy;