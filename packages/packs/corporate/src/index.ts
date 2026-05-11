import type { StylePack } from "@asciibuddy/core";

const pack: StylePack = {
  id: "corporate",
  symbols: {
    success: "✓",
    error: "✗",
    warning: "!",
    info: "i",
    selected: "▣",
    unselected: "▢",
  },
  sectionDivider: {
    left: "█ ",
    right: " █",
    fill: "─",
  },
  tableBorders: "single",
  spinnerFrames: ["▏", "▎", "▍", "▌", "▋", "▊", "▉", "▊", "▋", "▌", "▍", "▎"],
  spinnerInterval: 100,
  microcopy: {
    success: {
      terse: ["Success", "Complete"],
      friendly: ["Task completed successfully", "Operation succeeded"],
      playful: ["Synergy achieved", "KPI met"],
    },
    error: {
      terse: ["Failed", "Error"],
      friendly: ["Operation failed", "An error occurred"],
      playful: ["Action item: investigate", "Suboptimal outcome"],
    },
    warning: {
      terse: ["Warning", "Notice"],
      friendly: ["Please review", "Action required"],
      playful: ["Stakeholder alert", "Flag for review"],
    },
    info: {
      terse: ["Info", "Note"],
      friendly: ["For your information", "Status update"],
      playful: ["Circle back later", "Heads-up memo"],
    },
  },
};

export default pack;
