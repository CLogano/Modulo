// Clamp function between min and max
export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// Rounding number to 3 decimals
export const round3 = (n: number) => Number(n.toFixed(3));

// Converting degrees to degrees / radians
export const toDeg = (r: number) => (r * 180) / Math.PI;
export const toRad = (d: number) => (d * Math.PI) / 180;

// Convert string to number (with default value)
export const toNum = (s: string, fb = 0) => {
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : fb;
};