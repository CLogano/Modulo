export type Vec3 = [number, number, number];

// Store TRS transform data
export type Transform = {
    position: Vec3;
    scale: Vec3;
    rotation: Vec3;
};

// Primitive types
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