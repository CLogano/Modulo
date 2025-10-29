import classes from "./Project.module.css";

export type ProjectCardData = {
    id: string;
    title: string;
    description?: string;
    thumbnail?: string; // data URL or normal URL
    updatedAt?: number;
};

interface ProjectProps {
    project: ProjectCardData;
    onOpen: (id: string) => void;
}

const Project = (props: ProjectProps) => {

    const { project, onOpen } = props;
    const { id, title, description, thumbnail, updatedAt } = project;

    // pass the bg as a CSS var so we can use it in :hover states too
    const style =
        thumbnail
            ? ({ ["--bg-url" as any]: `url("${thumbnail}")` } as React.CSSProperties)
            : undefined;

    return (
        <button
            className={`${classes.card} ${thumbnail ? classes.hasBg : classes.noBg}`}
            onClick={() => onOpen(id)}
            title="Open project"
            style={style}
        >
            {/* image layer (uses CSS background) */}
            <div className={classes.image} aria-hidden />

            {/* subtle gradient for readability */}
            <div className={classes.scrim} aria-hidden />

            {/* text overlay */}
            <div className={classes.meta}>
                <div className={classes.title}>{title}</div>
                {description ? (
                    <div className={classes.desc}>{description}</div>
                ) : (
                    <div className={classes.descDim}>No description</div>
                )}
                {updatedAt !== undefined && (
                    <div className={classes.stamp}>
                        Updated {new Date(updatedAt).toLocaleString()}
                    </div>
                )}
            </div>
        </button>
    );
};

export default Project;