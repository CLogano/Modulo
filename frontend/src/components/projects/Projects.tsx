import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Project, { type ProjectCardData } from "./Project";
import classes from "./Projects.module.css";
import NewProjectModal from "./NewProjectModal";

interface ProjectsProps {
    projects: ProjectCardData[]; // pass this from parent for now
    onCreate?: (name: string, description?: string) => void;
}

const Projects = (props: ProjectsProps) => {

    const { projects, onCreate } = props;

    const [showModal, setShowModal] = useState(false);

    const navigate = useNavigate();

    const openProject = (id: string) => {
        navigate(`/editor/${id}`);
    };

    return (
        <div className={classes.wrap}>
            <div className={classes.inner}>
                <div className={classes.headerRow}>
                    <h1 className={classes.h1}>Projects</h1>
                    <button
                        className={classes.primaryBig}
                        onClick={() => setShowModal(true)}
                        title="Create a new project"
                        aria-label="Create a new project"
                    >
                        + New Project
                    </button>
                </div>

                {projects.length === 0 ? (
                    <div className={classes.empty}>
                        <div
                            className={classes.emptyCard}
                            onClick={() => setShowModal(true)}
                            role="button"
                            tabIndex={0}
                        >
                            <div className={classes.plus}>＋</div>
                            <div className={classes.emptyTitle}>Create your first project</div>
                            <div className={classes.emptyHint}>Start from an empty scene</div>
                        </div>
                    </div>
                ) : (
                    <div className={classes.grid}>
                        {projects.map((p) => (
                            <Project key={p.id} project={p} onOpen={openProject} />
                        ))}
                    </div>
                )}
            </div>

            <NewProjectModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSubmit={(name, description) => {
                    setShowModal(false);
                    onCreate?.(name, description);
                    // (If you prefer: create here, get new id, then navigate(`/editor/${newId}`))
                }}
            />
        </div>
    );
};

export default Projects;