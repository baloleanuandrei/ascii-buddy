export const ALL_PACK_IDS = [
  "minimal-mono",
  "retro-terminal",
  "candy",
  "nord",
  "solarized",
  "cyberpunk",
  "corporate",
] as const;
export type PackId = (typeof ALL_PACK_IDS)[number];
export type Tone = "terse" | "friendly" | "playful";

export const ALL_COMPONENTS = [
  "banner",
  "messages",
  "section",
  "table",
  "spinner",
  "prompts",
  "progress",
  "box",
  "logger",
  "errors",
  "heading",
  "alert",
  "badge",
  "defList",
  "tree",
  "steps",
  "stats",
  "code",
  "timeline",
  "emptyState",
  "rule",
  "columns",
  "sparkline",
  "barChart",
  "gauge",
  "json",
  "markdown",
  "link",
  "gradient",
  "qr",
  "multiProgress",
  "stopwatch",
] as const;
export type ComponentId = (typeof ALL_COMPONENTS)[number];

export type Renderer = "stdout" | "ink";
export type Target = "ts" | "py" | "both";

export interface BrandSpec {
  name: string;
  packageName: string;
  tagline?: string;
  primaryColor: string;
  accentColor?: string;
  pack: PackId;
  figletFont: string;
  tone: Tone;
  components?: ComponentId[];
  renderer?: Renderer;
  target?: Target;
}

export interface StylePackMicrocopy {
  success: Record<Tone, string[]>;
  error: Record<Tone, string[]>;
  warning: Record<Tone, string[]>;
  info: Record<Tone, string[]>;
}

export interface StylePack {
  id: PackId;
  symbols: {
    success: string;
    error: string;
    warning: string;
    info: string;
    selected?: string;
    unselected?: string;
  };
  sectionDivider: {
    left: string;
    right: string;
    fill: string;
  };
  tableBorders: "single" | "double" | "rounded" | "ascii";
  spinnerFrames: string[];
  spinnerInterval: number;
  microcopy: StylePackMicrocopy;
}
