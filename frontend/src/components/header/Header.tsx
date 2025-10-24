import classes from "./Header.module.css";
import logo from "../../images/Logo.png";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import SaveIcon from "@mui/icons-material/Save";
import UploadIcon from "@mui/icons-material/Upload";
import DownloadIcon from "@mui/icons-material/Download";

interface HeaderProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onClearSelection: () => void;
}

const Header = (props: HeaderProps) => {

  const { onUndo, onRedo, canUndo, canRedo, onClearSelection } = props;

  const handleBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // If a click lands on a <button> (or inside one), don't clear selection
    if (target.closest("button")) {
      return;
    }
    onClearSelection();
  };

  return (
    <div 
      className={classes.bar} 
      role="banner"
      onMouseDown={handleBarMouseDown}
    >
      <div className={classes.left}>
        <img className={classes.logo} src={logo} alt="Modulo" />
        <div className={classes.brand}>Modulo</div>
      </div>

      <div className={classes.right}>
        {/* Edit group */}
        <button 
          type="button"
          className={classes.btn}
          title="Undo (Ctrl/Cmd+Z)"
          onClick={onUndo}
          disabled={!canUndo}
          aria-disabled={!canUndo}
          aria-label="Undo"
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
          aria-label="Redo"
        >
          <RedoIcon fontSize="small" />
        </button>

        <div className={classes.divider} aria-hidden />

        {/* File group */}
        <button className={classes.btn} title="Save">
          <SaveIcon fontSize="small" />
        </button>
        <button className={classes.btn} title="Import project">
          <UploadIcon fontSize="small" />
        </button>
        <button className={classes.btn} title="Export project">
          <DownloadIcon fontSize="small" />
        </button>
      </div>
    </div>
  );
};

export default Header;