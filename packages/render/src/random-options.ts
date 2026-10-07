import { createPolyhedron, SHAPES } from "@noble-polyhedra/core";
import type { DesignOptions } from "./options-code.js";
import { PALETTES } from "./palettes.js";
import type { PaletteName, RenderView, SceneOptions } from "./index.js";

/** An unseeded draw can still be captured as a reproducible seed or design code. */
export function randomSeed(): string {
  const bytes = new Uint32Array(4);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 0x1_0000_0000);
  return [...bytes].map(value => value.toString(16).padStart(8, "0")).join("");
}

/** A deterministic form and appearance from an application-provided identity. */
export function randomOptions(seed: string | number = randomSeed()): DesignOptions {
  const input = String(seed);
  let stateA = 0x9e3779b9, stateB = 0x243f6a88, stateC = 0xb7e15162, stateD = 0xdeadbeef;
  for (let i = 0; i < input.length; i++) {
    const character = input.charCodeAt(i);
    stateA = Math.imul(stateA ^ character, 0x01000193);
    stateB = Math.imul(stateB ^ character, 0x85ebca6b);
    stateC = Math.imul(stateC ^ character, 0xc2b2ae35);
    stateD = Math.imul(stateD ^ character, 0x27d4eb2f);
  }
  const next = (): number => {
    let value = (stateA + stateB) | 0;
    stateA = stateB ^ stateB >>> 9;
    stateB = (stateC + (stateC << 3)) | 0;
    stateC = (stateC << 21 | stateC >>> 11);
    stateD = (stateD + 1) | 0;
    value = (value + stateD) | 0;
    stateC = (stateC + value) | 0;
    return (value >>> 0) / 0x1_0000_0000;
  };
  const pick = <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)]!;
  const between = (min: number, max: number): number => Math.round((min + next() * (max - min)) * 100) / 100;
  const shape = pick(SHAPES).id;
  const palette = pick(Object.keys(PALETTES) as PaletteName[]);
  const colors = PALETTES[palette];
  const view = pick<RenderView>(["solid", "solid", "solid-wireframe", "solid-wireframe", "wireframe", "face", "face-context"]);
  // These crown parameters work for both variants if an explicit shape overrides the draw.
  const n = pick([7, 9]), p = 3, q = 1;
  const crownHeight = between(0.5, 1.1);
  const a = between(0.7, 1.4), b = between(0.7, 1.4), c = between(0.7, 1.4);
  const faces = createPolyhedron({ shape, n, p, q, crownHeight, a, b, c }).faces.length;
  const color = colors.color;
  const background = next() < 0.18 ? "transparent" : colors.background;
  // Preserve the face choice for existing identity seeds after removing camera draws.
  next(); if (view !== "face") next(); next();
  return {
    shape, view, palette, paletteLinked: true,
    color, background,
    faceIndex: Math.floor(next() * faces),
    n, p, q, crownHeight, a, b, c,
  };
}

/** Explicit options win; an inherited face index is fitted to an overridden form. */
export function resolveSceneOptions(options: SceneOptions): SceneOptions {
  const { random, ...explicit } = options;
  if (random === undefined || random === false) return explicit;
  const base = randomOptions(random === true || random === "" ? randomSeed() : random);
  const overrides = Object.fromEntries(Object.entries(explicit).filter(([, value]) => value !== undefined)) as SceneOptions;
  const merged: SceneOptions = { ...base, ...overrides };
  if (explicit.view === "face" && explicit.pitch === undefined) merged.pitch = 0;
  if (explicit.faceIndex === undefined) {
    merged.faceIndex = base.faceIndex % createPolyhedron(merged).faces.length;
  }
  return merged;
}
