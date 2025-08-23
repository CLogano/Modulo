export type Vec3 = [number, number, number];

export type Transform = {
    position: Vec3;
    scale: Vec3;
    rotation: Vec3;
};

export type Primitive = "box" | "cylinder" | "cone" | "sphere";

// Node definition
export type Node = {
    id: string;
    name: string;
    transform: Transform;
    children: Node[];
    render?: {               // present => draws a mesh; absent => empty
        primitive: Primitive;
    };
}