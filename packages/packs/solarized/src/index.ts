import type { StylePack } from "@asciibuddy/core";

const pack: StylePack = {
  id: "solarized",
  symbols: {
    success: "✓",
    error: "✗",
    warning: "⚠",
    info: "☀",
    selected: "◆",
    unselected: "◇",
  },
  sectionDivider: {
    left: "☀ ",
    right: " ☀",
    fill: "─",
  },
  tableBorders: "single",
  spinnerFrames: ["◐", "◓", "◑", "◒"],
  spinnerInterval: 120,
  microcopy: {
    success: {
      terse: ["Done", "OK"],
      friendly: ["All set", "Looking bright"],
      playful: ["Solar!", "Sunny"],
    },
    error: {
      terse: ["Failed", "Error"],
      friendly: ["Something went wrong", "Eclipsed"],
      playful: ["Burnt", "Solar flare"],
    },
    warning: {
      terse: ["Warning", "Caution"],
      friendly: ["Heads up", "Worth a look"],
      playful: ["Squint", "UV high"],
    },
    info: {
      terse: ["Note", "Info"],
      friendly: ["Quick note", "FYI"],
      playful: ["Ray of light", "Hint"],
    },
  },
};

export default pack;
