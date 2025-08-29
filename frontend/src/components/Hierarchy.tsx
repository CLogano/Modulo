import classes from "./Hierarchy.module.css";
import type { Node, Transform, Primitive } from "../scene/types";
import Tree from "./Tree";
import { AccountTree } from "@mui/icons-material";

interface HierarchyProps {
    root: Node;
    justCreatedIdRef: React.RefObject<string | null>;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    onAdd: (
        parentId: string | null,
        name: string,
        transform?: Partial<Transform>,
        render?: { primitive: Primitive }
    ) => void;
    onDelete: (targetId: string) => void;
    onUpdate: (id: string, updates: Partial<Node>) => void;
    onReparent: (childId: string, parentId: string) => void;
    onReorder: (childId: string, parentId: string, targetIndex: number) => void;
}

const Hierarchy = (props: HierarchyProps) => {

    const { root, justCreatedIdRef, selectedId, onSelect, onAdd, onDelete, onUpdate, onReparent, onReorder } = props;

    return (
        <div className={classes.container}>
            <header className={classes.header}>
                <AccountTree className={classes.icon} />
                <div className={classes.title}>Hierarchy</div>
            </header>
            <Tree
                root={root}
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
    )
};

export default Hierarchy;