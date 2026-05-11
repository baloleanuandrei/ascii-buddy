import type { StylePack } from "@asciibuddy/core";

const pack: StylePack = {
  id: "nord",
  symbols: {
    success: "✓",
    error: "✗",
    warning: "⚠",
    info: "❄",
    selected: "■",
    unselected: "□",
  },
  sectionDivider: {
    left: "❄ ",
    right: " ❄",
    fill: "─",
  },
  tableBorders: "single",
  spinnerFrames: ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"],
  spinnerInterval: 80,
  microcopy: {
    success: {
      terse: ["Done", "Frozen"],
      friendly: ["All clear", "Smooth sailing"],
      playful: ["Cool", "Glacial"],
    },
    error: {
      terse: ["Error", "Failed"],
      friendly: ["Something cracked", "Hit an iceberg"],
      playful: ["Brrr", "Avalanche"],
    },
    warning: {
      terse: ["Caution", "Heads up"],
      friendly: ["Worth noting", "Tread carefully"],
      playful: ["Thin ice", "Chilly"],
    },
    info: {
      terse: ["Note", "FYI"],
      friendly: ["Just so you know", "Quick note"],
      playful: ["Snowflake", "Hint"],
    },
  },
};

export default pack;
