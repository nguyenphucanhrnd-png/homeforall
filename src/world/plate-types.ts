import type { PlateId } from "./world.config";

// Shared by the server (which reads manifests) and the client engine.
// Widths come from manifest.json: never assume 1920 (today the master is 720p).
export type PlateSource = {
  id: PlateId;
  base: string; // URL prefix, e.g. /assets/plates/s01
  frames: number;
  width: number;
  height: number;
  pattern: string;
  bytes: number;
};

export type PlateSources = Partial<Record<PlateId, PlateSource>>;
