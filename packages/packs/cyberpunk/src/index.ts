import type { StylePack } from "@asciibuddy/core";

const pack: StylePack = {
  id: "cyberpunk",
  symbols: {
    success: "▰",
    error: "▱",
    warning: "▲",
    info: "▶",
    selected: "◉",
    unselected: "◯",
  },
  sectionDivider: {
    left: "▰▱ ",
    right: " ▱▰",
    fill: "▬",
  },
  tableBorders: "double",
  spinnerFrames: ["▖", "▘", "▝", "▗"],
  spinnerInterval: 90,
  microcopy: {
    success: {
      terse: ["JACKED IN", "ONLINE"],
      friendly: ["Connection secure", "Data flowing"],
      playful: ["Neon glow", "Wired up"],
    },
    error: {
      terse: ["FLATLINE", "REJECTED"],
      friendly: ["ICE breach", "System rejected"],
      playful: ["Glitched", "Burned out"],
    },
    warning: {
      terse: ["BREACH", "ALERT"],
      friendly: ["Anomaly detected", "Heads up, choomba"],
      playful: ["Sketchy", "Static"],
    },
    info: {
      terse: ["TRANSMIT", "PING"],
      friendly: ["Incoming data", "Note"],
      playful: ["Wire hum", "Signal"],
    },
  },
};

export default pack;
