import * as THREE from "three";
import type { Node } from "./types";

// Helper function to map primitive type to its corresponding 3D object
// Returns unit shapes
function makeGeometry(primitive: string): THREE.BufferGeometry {

  switch (primitive) {
    case "box": return new THREE.BoxGeometry(1, 1, 1);
    case "cylinder": return new THREE.CylinderGeometry(0.5, 0.5, 1, 24);
    case "cone": return new THREE.ConeGeometry(0.5, 1, 24);
    case "sphere": return new THREE.SphereGeometry(0.5, 24, 16);
    default: return new THREE.BoxGeometry(1, 1, 1);
  }
}

// Helper that returns a standard mesh material (gray)
function defaultMaterial() {
    return new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.1, roughness: 0.8 });
}

// Recursive converter: Node → THREE.Object3D
// Recursion helps us render the entire subtree in one go
export function buildObject(node: Node): THREE.Object3D {

    // Create empty "game object", assign name and id
    const group = new THREE.Group();
    group.name = node.name;
    group.userData.nodeId = node.id;

    // Apply transform data
    group.position.fromArray(node.transform.position);
    group.scale.fromArray(node.transform.scale);
    const [rx, ry, rz] = node.transform.rotation;
    group.rotation.set(rx, ry, rz);

    // Add mesh if render exists
    // Nodes are either empty objects or meshes
    if (node.render) {

        // Extract unit shape
        const geometry = makeGeometry(node.render.primitive);

        // Apply mesh to shape
        const mesh = new THREE.Mesh(geometry, defaultMaterial());
        mesh.userData.nodeId = node.id;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Finally add mesh to the group
        group.add(mesh);
    }

    // Recurse children
    for (const child of node.children) {
        group.add(buildObject(child));
    }

  return group;
}

// Dispose helper to avoid GPU leaks when we replace content
export function disposeObject(obj: THREE.Object3D) {

  obj.traverse((o) => {

    const mesh = o as THREE.Mesh;

    if (mesh.geometry) {
      mesh.geometry.dispose();
    }

    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;

    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else if (mat) {
      mat.dispose();
    }
  });
};

