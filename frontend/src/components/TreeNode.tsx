import { useEffect, useRef, useState } from "react";
import classes from "./TreeNode.module.css";
import type { Node, Transform, Primitive } from "../scene/types";
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PrimitivePickerDropdown from "./PrimitivePickerDropdown";

interface TreeNodeProps {
  node: Node;
  parentId: string | null;
  indexInParent: number;
  justCreatedIdRef: React.RefObject<string | null>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (
    parentId: string | null,
    name: string,
    transform?: Partial<Transform>,
    render?: { primitive: Primitive }
  ) => void;
  onDelete: (targetId: string) => void;
  onUpdate: (id: string, updates: Partial<Node>) => void;
  onReparent: (childId: string, newParentId: string) => void;
  onReorder: (childId: string, parentId: string, targetIndex: number) => void;
}

// Global state to track the currently dragged node ID
let globalDraggedId: string | null = null;

const TreeNode = (props: TreeNodeProps) => {

  const { node, parentId, indexInParent, justCreatedIdRef, selectedId,
    onSelect, onAdd, onDelete, onUpdate, onReparent, onReorder } = props;

  const isSelected = selectedId === node.id;

  // State to monitor editing of node
  const [isEditing, setIsEditing] = useState(false);
  // State for styling a node that is being hovered over while another is being dragged. 
  // Top and bottom styles show dividers for reordering among siblings.
  // Middle styling indicates reparenting under hovered node.
  const [hoverZone, setHoverZone] = useState<"top" | "middle" | "bottom" | null>(null);
  // State for managing if we want to show the primitive picker dropdown
  const [showPickerDropdown, setShowPickerDropdown] = useState(false);
  // Input ref (so we can focus/select text and read the current value)
  const inputRef = useRef<HTMLInputElement>(null);
  // Counter ref to stabilize drag enter/leave. Browsers fire dragenter/leave for
  // *every* child element under the mouse, so we count enters/leaves and only
  // clear the highlight when the count returns to zero.
  const overCountRef = useRef(0);


  // Auto-enter edit only if this node was just created; consume the ref so it won't trigger after reparent/remount
  useEffect(() => {
    if (isSelected && node.name === "New Node" && justCreatedIdRef.current === node.id) {
      setIsEditing(true);
      justCreatedIdRef.current = null; // consume so future remounts don’t re-trigger
    }
  }, [isSelected, node.id, node.name, justCreatedIdRef]);

  // When we enter edit mode, focus and select the text
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // If this row was being edited and then loses selection, commit and exit edit mode
  useEffect(() => {
    if (isEditing && !isSelected) {
      const current = inputRef.current?.value ?? node.name;
      const next = current.trim();
      if (next && next !== node.name) {
        onUpdate(node.id, { name: next });
      }
      setIsEditing(false);
    }
  }, [isSelected]);

  // Rename helper (used by blur / Enter key)
  const commitRename = (value: string) => {
    setIsEditing(false);
    const next = value.trim();
    if (next && next !== node.name) onUpdate(node.id, { name: next });
  };

  // Helper to zoom to Scene via CustomEvent
  const zoomToNode = () => {
    // ensure selection syncs first
    //onSelect(node.id);
    window.dispatchEvent(
      new CustomEvent("scene:zoom-to-node", { detail: { id: node.id } })
    );
  };

  // Clear all drag hints (helper)
  const clearHints = () => {
    overCountRef.current = 0;
    setHoverZone(null);
  };

  // Global safety net: if the dragged node ends or a drop happens anywhere,
  // clear our hover highlight and reset the counter.
  useEffect(() => {

    window.addEventListener("dragend", clearHints);
    window.addEventListener("drop", clearHints);
    return () => {
      window.removeEventListener("dragend", clearHints);
      window.removeEventListener("drop", clearHints);
    };
  }, []);

  return (
    <div
      className={`${classes.container} ${node.id === "root" ? classes.root : ""}`}
    >
      <div
        className={[
          classes.row,
          isSelected ? classes.selectedRow : "",
          hoverZone === "middle" ? classes.dragOver : "",
          hoverZone === "top" ? classes.insertTop : "",
          hoverZone === "bottom" ? classes.insertBottom : "",
        ].join(" ")}
        draggable={!isEditing && node.id !== "root"}
        onMouseDown={(e) => {
          if (e.button !== 0) {
            return; // left mouse-button only
          }
          e.stopPropagation();
          onSelect(node.id); // select the node
        }}
        onDragStart={(e) => {
          // Put our node id on the dataTransfer so any drop target can read it.
          e.dataTransfer.setData("application/x-node-id", node.id);
          e.dataTransfer.setData("text/plain", node.id);
          e.dataTransfer.effectAllowed = "move";

          // Set global dragged ID
          globalDraggedId = node.id;

          // Remove ghost image when dragging
          const ghost = document.createElement('div');
          ghost.style.width = '1px';
          ghost.style.height = '1px';
          ghost.style.opacity = '0';
          ghost.style.position = 'fixed';
          ghost.style.top = '-1000px';
          document.body.appendChild(ghost);
          e.dataTransfer.setDragImage(ghost, 0, 0);
          (e.currentTarget as any).__ghost = ghost;
        }}
        onDragEnter={(e) => {
          // Only react to our custom drags
          if (!e.dataTransfer.types.includes("application/x-node-id") || !globalDraggedId) {
            return;
          }

          // Don't show hover effects on the node being dragged
          if (globalDraggedId === node.id) {
            return;
          }

          e.preventDefault();

          // First enter into this row (from 0 → 1) turns the highlight on
          if (++overCountRef.current === 1) {
            setHoverZone("middle");
          }
        }}
        onDragOver={(e) => {
          // Only react to our custom drags
          if (!e.dataTransfer.types.includes("application/x-node-id") || !globalDraggedId) {
            return;
          }

          // Don't show hover effects on the node being dragged
          if (globalDraggedId === node.id) {
            return;
          }

          e.preventDefault();
          e.dataTransfer.dropEffect = "move";

          // Decide if hovered node is in top, middle, or bottom section
          // Top: 0-20%. Middle: 20-80%. Bottom: 80-100%.
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const y = e.clientY - rect.top;
          const topBand = rect.height * 0.20;
          const botBand = rect.height * 0.80;

          if (y < topBand) {
            setHoverZone("top");
          }
          else if (y > botBand) {
            setHoverZone("bottom");
          }
          else {
            setHoverZone("middle");
          }
        }}
        onDragLeave={(e) => {
          // Only react to our custom drags
          if (!e.dataTransfer.types.includes("application/x-node-id") || !globalDraggedId) {
            return;
          }

          // Don't process drag leave for the node being dragged
          if (globalDraggedId === node.id) {
            return;
          }

          e.preventDefault();

          // We left *one* child area of the row. Only clear when the count
          // returns to zero (i.e., fully off the row and its children).
          if (overCountRef.current > 0 && --overCountRef.current === 0) {
            clearHints();
          }
        }}
        onDragEnd={(e) => {

          // Clear global dragged ID
          globalDraggedId = null;

          // Cleanup ghost image
          const ghost = (e.currentTarget as any).__ghost as HTMLDivElement | undefined;
          if (ghost) ghost.remove();
          (e.currentTarget as any).__ghost = undefined;

          // Clear any lingering hover state
          clearHints();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation(); // don't bubble to parent rows

          // Extract the hover zone
          const zone = hoverZone;
          clearHints(); // make sure to clear it for future

          const draggedId =
            e.dataTransfer.getData("application/x-node-id") ||
            e.dataTransfer.getData("text/plain"); // fallback

          // Ignore self-drops
          if (!draggedId || draggedId === node.id) return;

          // Reorder if we dropped on top/bottom bands of THIS row
          if (zone === "top" || zone === "bottom") {
            if (parentId !== null) {
              let targetIndex: number;

              if (zone === "top") {
                targetIndex = indexInParent;
              } else {
                targetIndex = indexInParent + 1;
              }

              // Adjust for dragging within the same parent
              // If dragging from above to below, we need to account for the removal
              const draggedElement = document.querySelector(`[data-node-id="${draggedId}"]`);
              if (draggedElement) {
                const draggedIndexAttr = draggedElement.getAttribute('data-index-in-parent');
                if (draggedIndexAttr && parentId === draggedElement.getAttribute('data-parent-id')) {
                  const draggedIndex = parseInt(draggedIndexAttr, 10);
                  if (draggedIndex < indexInParent) {
                    targetIndex--;
                  }
                }
              }

              onReorder(draggedId, parentId, targetIndex);
            }
            return;
          }

          // Otherwise, reparent under THIS node
          onReparent(draggedId, node.id);
        }}
        // Add data attributes to help with reorder calculations
        data-node-id={node.id}
        data-parent-id={parentId}
        data-index-in-parent={indexInParent}
      >
        <div
          className={`${classes.label} ${isSelected ? classes.selected : ""}`}
          onDoubleClick={(e) => {
            e.stopPropagation();
            zoomToNode(); // double click to zoom on selected node
          }}
        >
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
        {/* Add and delete buttons */}
        {(isSelected || node.id === "root") && <div className={classes.actions} onClick={(e) => e.stopPropagation()}>
          <span className={classes.addWrap}>
            <AddIcon className={classes.icon} onClick={() => setShowPickerDropdown(s => !s)} style={{ fontSize: "18px" }} />
            {showPickerDropdown && (
              <PrimitivePickerDropdown
                onPick={(choice) => {
                  setShowPickerDropdown(false);
                  onAdd(node.id, "New Node", undefined,
                    choice ? { primitive: choice } : undefined
                  );
                }}
                onDismiss={() => setShowPickerDropdown(false)}
              />
            )}
          </span>
          <EditIcon
            className={classes.icon}
            onClick={() => setIsEditing(true)}
            style={{ fontSize: "18px" }}
          />
          {node.id !== "root" && (
            <DeleteIcon className={classes.icon} onClick={() => onDelete(node.id)} style={{ fontSize: "18px" }} />
          )}
        </div>}
      </div>
      {/* Child nodes */}
      <div className={classes.children}>
        {node.children.map((child, i) => (
          <TreeNode
            key={child.id}
            node={child}
            parentId={node.id}
            indexInParent={i}
            justCreatedIdRef={justCreatedIdRef}
            selectedId={selectedId}
            onSelect={onSelect}
            onAdd={onAdd}
            onDelete={onDelete}
            onUpdate={onUpdate}
            onReparent={onReparent}
            onReorder={onReorder}
          />
        ))}
      </div>
    </div>
  );
};

export default TreeNode;