import classes from "./ViewportToolbar.module.css";
import ViewIcon from '@mui/icons-material/BackHand';
import MoveIcon from '@mui/icons-material/OpenWith';
import RotateIcon from '@mui/icons-material/Cached';
import ScaleIcon from '@mui/icons-material/AspectRatio';

interface ViewportToolbarProps {
  selectedMode: "view" | "move" | "rotate" | "scale"; // different tool options
  onSelectMode: (mode: "view" | "move" | "rotate" | "scale") => void;
}

const ViewportToolbar = (props: ViewportToolbarProps) => {

  const { selectedMode, onSelectMode } = props;

  return (
    <div className={classes.container}>
      <button
        type="button"
        title="View Tool (q)"
        className={`${classes.btn} ${selectedMode === "view" ? classes.active : ""}`}
        onClick={() => onSelectMode("view")}
      >
        <ViewIcon fontSize="small" />
      </button>
      <button
        type="button"
        title="Move Tool (w)"
        className={`${classes.btn} ${selectedMode === "move" ? classes.active : ""}`}
        onClick={() => onSelectMode("move")}
      >
        <MoveIcon fontSize="small" />
      </button>
      <button
        type="button"
        title="Rotate Tool (e)"
        className={`${classes.btn} ${selectedMode === "rotate" ? classes.active : ""}`}
        onClick={() => onSelectMode("rotate")}
      >
        <RotateIcon fontSize="small" />
      </button>
      <button
        type="button"
        title="Scale Tool (r)"
        className={`${classes.btn} ${selectedMode === "scale" ? classes.active : ""}`}
        onClick={() => onSelectMode("scale")}
      >
        <ScaleIcon fontSize="small" />
      </button>
    </div>
  );
};

export default ViewportToolbar;