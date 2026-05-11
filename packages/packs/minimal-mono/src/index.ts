import type { StylePack } from "@asciibuddy/core";

const pack: StylePack = {
  id: "minimal-mono",
  symbols: {
    success: "✓",
    error: "✗",
    warning: "!",
    info: "i",
    selected: "●",
    unselected: "○",
  },
  sectionDivider: {
    left: "── ",
    right: " ──",
    fill: "─",
  },
  tableBorders: "single",
  spinnerFrames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
  spinnerInterval: 80,
  microcopy: {
    success: {
      terse: ["Done", "OK"],
      friendly: ["All set", "Done — looking good"],
      playful: ["Nailed it", "Shipped"],
    },
    error: {
      terse: ["Failed", "Error"],
      friendly: ["Something went wrong", "That didn't work"],
      playful: ["Yikes", "Broke it"],
    },
    warning: {
      terse: ["Warning", "Heads up"],
      friendly: ["Just so you know", "Heads up"],
      playful: ["Careful", "Uh oh"],
    },
    info: {
      terse: ["Note", "FYI"],
      friendly: ["Just so you know", "Quick note"],
      playful: ["Psst", "Hey"],
    },
  },
};

export default pack;
