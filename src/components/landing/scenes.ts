// Landing section ids (`scene-…`); v4 says do not rename them.
export const SCENES = [
  "hero",
  "doors",
  "pets",
  "journey",
  "trust",
  "facts",
  "network",
  "stories",
  "partners",
  "final",
] as const;
export type SceneId = (typeof SCENES)[number];
