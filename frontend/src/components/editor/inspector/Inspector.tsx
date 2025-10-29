import { useEffect, useMemo, useState } from "react";
import classes from "./Inspector.module.css";
import { findNode } from "../../../model/tree";
import type { Node } from "../../../model/types";
import TransformInput from "./TransformInput";
import InfoIcon from '@mui/icons-material/Info';
import { round3, toDeg, toRad, toNum } from "../../../utils/math";

interface InspectorProps {
    root: Node | null;
    selectedId: string | null;
    onUpdate: (id: string, updates: Partial<Node>) => void;
}

const Inspector = (props: InspectorProps) => {

    const { root, selectedId, onUpdate } = props;

    // Local editable state: name, transform (TRS)
    const [name, setName] = useState<string>("");
    const [position, setPosition] = useState<[string, string, string]>(["0", "0", "0"]);
    const [rotation, setRotation] = useState<[string, string, string]>(["0", "0", "0"]); // In degrees
    const [scale, setScale] = useState<[string, string, string]>(["1", "1", "1"]);

    // Access the selected node by its id
    // Memoize to reduce unnecessary recomputations
    const selectedNode = useMemo(() => (
        selectedId ? findNode(root, selectedId) : null
    ), [root, selectedId]);

    // Load from selected node
    useEffect(() => {

        // Default values
        if (!selectedNode) {
            setName("");
            setPosition(["0", "0", "0"]);
            setRotation(["0", "0", "0"]);
            setScale(["1", "1", "1"]);
            return;
        }

        // Set name and transform in inspector
        setName(selectedNode.name);
        setPosition(selectedNode.transform.position.map((n) => String(round3(n))) as [string, string, string]);
        setRotation(selectedNode.transform.rotation.map((r) => String(round3(toDeg(r)))) as [string, string, string]);
        setScale(selectedNode.transform.scale.map((n) => String(round3(n))) as [string, string, string]);
    }, [selectedNode]); // eslint-disable-line react-hooks/exhaustive-deps

    // Commit name to the model
    const commitName = () => {

        if (!selectedNode) {
            return;
        }
        const newName = name.trim();
        if (newName && newName !== selectedNode.name) {
            onUpdate(selectedNode.id, { name: newName });
        }
    };

    // Commit transform to model
    const commitTransform = () => {

        if (!selectedNode) {
            return;
        }

        onUpdate(selectedNode.id, {
            transform: {
                position: [toNum(position[0]), toNum(position[1]), toNum(position[2])],
                rotation: [toRad(toNum(rotation[0])), toRad(toNum(rotation[1])), toRad(toNum(rotation[2]))], // Convert rotation back to radians
                scale: [toNum(scale[0], 1), toNum(scale[1], 1), toNum(scale[2], 1)],
            },
        });
    };

    // Resetting transform to default values
    const resetTransform = () => {

        if (!selectedNode) {
            return;
        }

        // Update local UI
        setPosition(["0", "0", "0"]);
        setRotation(["0", "0", "0"]);
        setScale(["1", "1", "1"]);

        // Commit to model
        onUpdate(selectedNode.id, {
            transform: {
                position: [0, 0, 0],
                rotation: [toRad(0), toRad(0), toRad(0)],
                scale: [1, 1, 1],
            },
        });
    };

    return (
        <div className={classes.container}>
            <header className={classes.header}>
                <InfoIcon className={classes.icon} />
                <div className={classes.title}>Inspector</div>
            </header>
            {selectedNode && selectedNode.id !== "root" && (
                <div className={classes.body}>
                    <div className={classes.section}>
                        <div className={classes.sectionTitle}>Name</div>
                        <input
                            className={classes.nameInput}
                            value={name}
                            onChange={(e) => setName(e.currentTarget.value)}
                            onBlur={commitName}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    commitName();
                                    e.currentTarget.blur();
                                }
                            }}
                        />
                    </div>
                    <div className={classes.section}>
                        <div className={classes.sectionTitle}>Transform</div>
                        <TransformInput
                            label="Position"
                            values={position}
                            onChange={setPosition}
                            onCommit={commitTransform}
                        />
                        <TransformInput
                            label="Rotation"
                            values={rotation}
                            onChange={setRotation}
                            onCommit={commitTransform}
                        />
                        <TransformInput
                            label="Scale"
                            values={scale}
                            onChange={setScale}
                            onCommit={commitTransform}
                        />
                        <div className={classes.sectionFooter}>
                            <button className={classes.resetButton} onClick={resetTransform}>
                                Reset
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
};

export default Inspector;