import classes from "./ActionBar.module.css";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import SaveIcon from "@mui/icons-material/Save";

interface ActionBarProps {
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    onSave: () => void;
}

const ActionBar = (props: ActionBarProps) => {

    const { onUndo, onRedo, canUndo, canRedo, onSave } = props;

    return (
        <div className={classes.container} role="toolbar" aria-label="Scene actions">
            <button
                type="button"
                className={classes.btn}
                title="Undo (Ctrl/Cmd+Z)"
                onClick={onUndo}
                disabled={!canUndo}
                aria-disabled={!canUndo}
            >
                <UndoIcon fontSize="small" />
            </button>

            <button
                type="button"
                className={classes.btn}
                title="Redo (Ctrl/Cmd+Shift+Z)"
                onClick={onRedo}
                disabled={!canRedo}
                aria-disabled={!canRedo}
            >
                <RedoIcon fontSize="small" />
            </button>

            <div className={classes.divider} aria-hidden />

            <button
                type="button"
                className={classes.btn}
                title="Save (Ctrl/Cmd+S)"
                onClick={onSave}
            >
                <SaveIcon fontSize="small" />
            </button>
        </div>
    );
};

export default ActionBar;