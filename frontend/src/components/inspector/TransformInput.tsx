import classes from "./TransformInput.module.css";

interface TransformInputProps {
    label: string;                                      // e.g., "Position" | "Rotation" | "Scale"
    values: [string, string, string];                   // controlled values as strings
    onChange: (next: [string, string, string]) => void; // update local state in parent
    onCommit: () => void;                               // parent commits to model
    disabled?: boolean;
}

const TransformInput = (props: TransformInputProps) => {

    const { label, values, onChange, onCommit, } = props;

    // Update one of pos / rot / scale
    const handleChange = (i: 0 | 1 | 2, v: string) => {
        const next = [...values] as [string, string, string];
        next[i] = v;
        onChange(next);
    };

    return (
        <div className={classes.row}>
            <div className={classes.label}>{label}</div>
            <div className={classes.inputs}>
                {(["X", "Y", "Z"] as const).map((axis, i) => ( // map each X, Y, Z to input field
                    <div className={classes.axisGroup} key={axis}>
                        <span className={classes.axisBadge}>{axis}</span>
                        <input
                            type="number"
                            className={classes.input}
                            value={values[i]}
                            onChange={(e) => handleChange(i as 0 | 1 | 2, e.currentTarget.value)}
                            onBlur={onCommit} // commit changes when user clicks away
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    onCommit(); // commit changes when user clicks enter key
                                    e.currentTarget.blur(); // defocus on Enter
                                }
                            }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TransformInput;