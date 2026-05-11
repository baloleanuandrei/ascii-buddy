import type { StylePack } from "@asciibuddy/core";

const pack: StylePack = {
  id: "candy",
  symbols: {
    success: "✿",
    error: "✖",
    warning: "▲",
    info: "◆",
    selected: "❤",
    unselected: "♡",
  },
  sectionDivider: {
    left: "✦ ",
    right: " ✦",
    fill: "·",
  },
  tableBorders: "rounded",
  spinnerFrames: ["◜", "◠", "◝", "◞", "◡", "◟"],
  spinnerInterval: 100,
  microcopy: {
    success: {
      terse: ["Yes!", "Done"],
      friendly: ["Beautifully done", "All wrapped up"],
      playful: ["Tada!", "Sparkles!"],
    },
    error: {
      terse: ["Oops", "Nope"],
      friendly: ["That didn't go well", "Something's off"],
      playful: ["Whoopsie", "Boom!"],
    },
    warning: {
      terse: ["Careful", "Watch out"],
      friendly: ["A little heads up", "Worth a peek"],
      playful: ["Uh-oh", "Hmmm"],
    },
    info: {
      terse: ["Note", "Hint"],
      friendly: ["Here's a thought", "Quick note"],
      playful: ["Pssst", "Hey hey"],
    },
  },
};

export default pack;
