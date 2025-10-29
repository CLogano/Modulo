import { useEffect, useRef, useState } from "react";
import classes from "./NewProjectModal.module.css";

interface NewProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string, description?: string) => void;
}

const NewProjectModal = (props: NewProjectModalProps) => {

    const { isOpen, onClose, onSubmit } = props;

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const nameRef = useRef<HTMLInputElement | null>(null); // ref to the name field to focus on open

    useEffect(() => {

        if (!isOpen) {
            return;
        }

        // Reset fields
        setName("");
        setDescription("");

        const onKey = (e: KeyboardEvent) => {

            if (e.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", onKey);
        // focus the name field when opened
        setTimeout(() => nameRef.current?.focus(), 0);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    const canCreate = name.trim().length > 0;

    const submit = () => {
        if (!canCreate) {
            return;
        }
        onSubmit(name.trim(), description.trim() ? description.trim() : undefined);
    };

    return (
        <div className={classes.backdrop} onMouseDown={onClose} role="dialog" aria-modal="true" aria-labelledby="np-title">
            <div className={classes.modal} onMouseDown={(e) => e.stopPropagation()}>
                <div className={classes.header}>
                    <h2 id="np-title" className={classes.title}>New Project</h2>
                </div>

                <div className={classes.body}>
                    <label className={classes.label}>
                        <span>Name <span className={classes.req}>*</span></span>
                        <input
                            ref={nameRef}
                            className={classes.input}
                            placeholder="e.g., My first model"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" ? submit() : null}
                        />
                    </label>

                    <label className={classes.label}>
                        <span>Description <span className={classes.dim}>(optional)</span></span>
                        <textarea
                            className={`${classes.input} ${classes.textarea}`}
                            placeholder="Short note…"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </label>
                </div>

                <div className={classes.footer}>
                    <button className={classes.ghost} onClick={onClose}>Cancel</button>
                    <button
                        className={`${classes.primary} ${canCreate ? classes.enabled : classes.disabled}`}
                        disabled={!canCreate}
                        onClick={submit}
                    >
                        Create
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewProjectModal;