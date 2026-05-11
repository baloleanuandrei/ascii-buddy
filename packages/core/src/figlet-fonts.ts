export const CURATED_FIGLET_FONTS = [
  "ANSI Shadow",
  "Big",
  "Block",
  "Bloody",
  "Colossal",
  "Doom",
  "Larry 3D",
  "Slant",
  "Small",
  "Standard",
  "Star Wars",
  "Sub-Zero",
] as const;

export type CuratedFiglet = (typeof CURATED_FIGLET_FONTS)[number];
