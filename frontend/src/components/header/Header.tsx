import classes from "./Header.module.css";
import logo from "../../images/Logo.png";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import SaveIcon from "@mui/icons-material/Save";
import UploadIcon from "@mui/icons-material/Upload";
import DownloadIcon from "@mui/icons-material/Download";

const Header = () => {
  return (
    <div className={classes.bar} role="banner">
      <div className={classes.left}>
        <img className={classes.logo} src={logo} alt="Modulo" />
        <div className={classes.brand}>Modulo</div>
      </div>

      <div className={classes.right}>
        {/* Edit group */}
        <button className={classes.btn} title="Undo">
          <UndoIcon fontSize="small" />
        </button>
        <button className={classes.btn} title="Redo">
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