import type { PackId, StylePack } from "@asciibuddy/core";
import minimalMono from "@asciibuddy/pack-minimal-mono";
import retroTerminal from "@asciibuddy/pack-retro-terminal";
import candy from "@asciibuddy/pack-candy";
import nord from "@asciibuddy/pack-nord";
import solarized from "@asciibuddy/pack-solarized";
import cyberpunk from "@asciibuddy/pack-cyberpunk";
import corporate from "@asciibuddy/pack-corporate";

const PACKS: Record<PackId, StylePack> = {
  "minimal-mono": minimalMono,
  "retro-terminal": retroTerminal,
  candy,
  nord,
  solarized,
  cyberpunk,
  corporate,
};

export function loadPack(id: PackId): StylePack {
  return PACKS[id];
}

export const PACK_CHOICES: { value: PackId; label: string; hint: string }[] = [
  { value: "minimal-mono", label: "Minimal Mono", hint: "Clean, dev-tool default. Single-line borders, terse glyphs." },
  { value: "retro-terminal", label: "Retro Terminal", hint: "80s mainframe. ASCII borders, [OK]/[ERR] tags." },
  { value: "candy", label: "Candy", hint: "Playful & soft. Rounded borders, sparkle glyphs." },
  { value: "nord", label: "Nord", hint: "Cool, frost-tone palette. Snowflake glyphs." },
  { value: "solarized", label: "Solarized", hint: "Warm sun palette. Solar glyphs." },
  { value: "cyberpunk", label: "Cyberpunk", hint: "Neon & double borders. Tech-noir vibe." },
  { value: "corporate", label: "Corporate", hint: "Polished, slightly playful biz-speak." },
];
