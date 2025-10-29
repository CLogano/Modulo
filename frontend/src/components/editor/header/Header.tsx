import classes from "./Header.module.css";
import logo from "../../../images/Logo.png";
import { useNavigate } from "react-router-dom";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

interface HeaderProps {

}

const Header = (props: HeaderProps) => {

  const navigate = useNavigate();

  return (
    <div
      className={classes.bar}
      role="banner"
    >
      <div className={classes.left}>
        <img className={classes.logo} src={logo} alt="Modulo" />
        <div className={classes.brand}>Modulo</div>
      </div>

      <div className={classes.right}>
        {/* Projects */}
        <button type="button" className={classes.btn} title="My Projects" onClick={() => navigate("/projects")}>
          <FolderOpenIcon fontSize="small" />
        </button>

        <div className={classes.divider} aria-hidden />

        {/* Account */}
        <button type="button" className={classes.btn} title="Account">
          <AccountCircleIcon fontSize="small" />
        </button>

      </div>
    </div>
  );
};

export default Header;