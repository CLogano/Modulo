import { Routes, Route, useLocation } from "react-router-dom";
import Header from "./components/editor/header/Header";
import Editor from "./components/editor/Editor";
import Projects from "./components/projects/Projects";
import classes from "./Layout.module.css";

const Layout = () => {

  const location = useLocation();
  const hideHeader = location.pathname === "/signin";

  // Remove later
  const demoProjects = [
  { id: "p1", title: "Room Mock", description: "Lighting test", thumbnail: undefined, updatedAt: Date.now() - 10000 },
  { id: "p2", title: "City Block", description: "LOD + perf pass", thumbnail: undefined, updatedAt: Date.now() - 500000 },
  ];

  return (
    <>
      {!hideHeader && <Header />}
      <div
        className={`${classes.container} ${hideHeader ? classes.fullHeight : ""}`}
      >
        <Routes>
          {/* <Route path="/signin" element={<SignIn />} /> */}
          <Route path="/projects" element={<Projects projects={demoProjects} />} />
          <Route path="/editor/:projectId" element={<Editor />} />
          {/* <Route path="/account" element={<Account />} /> */}
          <Route path="*" element={<Projects projects={demoProjects} />} /> {/* fallback */}
        </Routes>
      </div>
    </>
  );
}

export default Layout;