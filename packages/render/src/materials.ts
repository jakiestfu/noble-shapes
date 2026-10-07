import type { Vec3 } from "@noble-polyhedra/core";

/** Surface lighting is independent of the selected edge/face view. */
export type MaterialName = "studio" | "clay" | "marble" | "cel";
/** `cel` remains a compatibility alias for the original Studio lighting. */
export const MATERIAL_NAMES: readonly MaterialName[] = ["studio", "clay", "marble", "cel"];

type RGB = readonly [number, number, number];
const clamp = (value: number): number => Math.max(0, Math.min(255, value));

/** Shared face lighting for the CPU and WebGL renderers. */
export function shadeFace(base: RGB, normal: Vec3, faceIndex: number, material: MaterialName, isolated: boolean): RGB {
  const key = Math.abs(normal[0] * -0.42 + normal[1] * 0.55 + normal[2] * 0.72);
  if (material === "clay") {
    // Broad key and cool fill give the matte surface a softer, sculpted look.
    const diffuse = Math.max(0, normal[0] * -0.48 + normal[1] * 0.62 + normal[2] * 0.62);
    const fill = isolated ? 0.7 + diffuse * 0.27 : 0.38 + diffuse * 0.53;
    const ambient = Math.max(0, normal[0] * 0.35 - normal[1] * 0.25 - normal[2] * 0.6) * 0.08;
    const highlight = Math.pow(diffuse, 5) * 0.07;
    return [0, 1, 2].map(channel => clamp(base[channel]! * (fill + ambient) + (255 - base[channel]!) * highlight)) as unknown as RGB;
  }
  const fill = isolated ? 0.88 + key * 0.12 : 0.42 + key * 0.47 + Math.pow(1 - Math.abs(normal[2]), 2) * 0.1;
  const variation = isolated ? 1 : 0.96 + ((faceIndex * 73) % 11) / 135;
  const highlight = Math.pow(key, 8) * 0.15;
  return [0, 1, 2].map(channel => clamp(base[channel]! * fill * variation + (255 - base[channel]!) * highlight)) as unknown as RGB;
}

const smoothstep = (low: number, high: number, value: number): number => {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
};

/** Object-space mineral bands. Kept in step with the WebGL fragment shader. */
export function marbleTone(x: number, y: number, z: number): number {
  const phase = x * 10 + y * 7 + z * 5 + Math.sin(y * 6 + z * 12) * 2.2 + Math.sin(x * 9 - z * 7) * 1.8;
  const wave = Math.sin(phase);
  const secondary = Math.sin(y * 12 - z * 10 + x * 3 + Math.sin(x * 6 + z * 3) * 1.8);
  const cloud = 0.5 + 0.5 * Math.sin(x * 3.1 - y * 4.7 + z * 5.3 + Math.sin(y * 4 + z * 3));
  const vein = Math.max(smoothstep(0.94, 0.98, wave), smoothstep(0.97, 0.995, secondary) * 0.5);
  return 0.78 + 0.32 * cloud + 0.12 * smoothstep(0.78, 0.9, wave) - 0.38 * vein;
}
