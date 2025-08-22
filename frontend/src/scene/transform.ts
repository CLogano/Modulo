// Helper functions for applying transform operations on each shape (translate, scale, rotate)

import type { Transform } from "./types";

export function translate(
    transform: Transform,
    dx: number,
    dy: number,
    dz: number
): Transform {

    return {
        ...transform,
        position: [
            transform.position[0] + dx,
            transform.position[1] + dy,
            transform.position[2] + dz
        ]
    };
}

export function scale(
    transform: Transform,
    sx: number,
    sy: number,
    sz: number
): Transform {

    return {
        ...transform,
        scale: [
            transform.scale[0] * sx,
            transform.scale[1] * sy,
            transform.scale[2] * sz
        ]
    };
}

export function rotate(
    transform: Transform,
    rx: number,
    ry: number,
    rz: number
): Transform {
  return {
    ...transform,
    rotation: [
      transform.rotation[0] + rx,
      transform.rotation[1] + ry,
      transform.rotation[2] + rz
    ]
  };
}