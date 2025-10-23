import classes from "./Header.module.css";
import logo from "../../images/Logo.png";

const Header = () => {
  return (
    <div className={classes.bar} role="banner">
      <div className={classes.left}>
        <img className={classes.logo} src={logo} alt="Modulo" />
        <div className={classes.brand}>Modulo</div>
      </div>
      <div className={classes.spacer} />
    </div>
  );
};

export default Header;