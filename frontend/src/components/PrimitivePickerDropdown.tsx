import { useEffect, useRef } from "react";
import classes from "./PrimitivePickerDropdown.module.css";
import type { Primitive } from "../scene/types";
import CropFreeIcon from '@mui/icons-material/CropFree';
import { Box, Cone, Cylinder, Circle } from 'lucide-react';

interface PrimitivePickerDropdownProps {
    onPick: (choice: Primitive | null) => void;
    onDismiss?: () => void;                 // called if user clicks outside / presses Esc
}

const PrimitivePickerDropdown = (props: PrimitivePickerDropdownProps) => {

    const { onPick, onDismiss } = props;

    // Ref to track outside clicks and focus / position if needed
    const ref = useRef<HTMLDivElement | null>(null);

    // Close on outside click or escape key
    useEffect(() => {
        const onDocDown = (e: MouseEvent) => {
            if (!ref.current) {
                return;
            }
            if (!ref.current.contains(e.target as Node)) {
                onDismiss?.();
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onDismiss?.();
            }
        };
        document.addEventListener("mousedown", onDocDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDocDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [onDismiss]);

    // Keep clicks inside the popup from triggering the outside-click handler
    const stop = (e: React.MouseEvent) => e.stopPropagation();

    // Map each primitive
    const items: { label: string; value: Primitive | null; Icon: React.ElementType }[] = [
        { label: "Empty", value: null, Icon: CropFreeIcon },
        { label: "Box", value: "box", Icon: Box },
        { label: "Cylinder", value: "cylinder", Icon: Cylinder },
        { label: "Cone", value: "cone", Icon: Cone },
        { label: "Sphere", value: "sphere", Icon: Circle },
    ];

    return (
        <div className={classes.container} ref={ref} onMouseDown={stop} onClick={stop}>
            <div className={classes.row}>
                {items.map((item) => (
                    <div key={item.label} className={classes.item} title={item.label}
                        onClick={() => { onPick(item.value); onDismiss?.(); }}>
                        <item.Icon className={classes.icon} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PrimitivePickerDropdown;