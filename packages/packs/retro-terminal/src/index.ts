import type { StylePack } from "@asciibuddy/core";

const pack: StylePack = {
  id: "retro-terminal",
  symbols: {
    success: "[OK]",
    error: "[ERR]",
    warning: "[!!]",
    info: "[..]",
    selected: "[X]",
    unselected: "[ ]",
  },
  sectionDivider: {
    left: "=[ ",
    right: " ]=",
    fill: "=",
  },
  tableBorders: "ascii",
  spinnerFrames: ["|", "/", "-", "\\"],
  spinnerInterval: 120,
  microcopy: {
    success: {
      terse: ["COMPLETE", "OK"],
      friendly: ["Operation complete", "Task complete"],
      playful: ["MISSION ACCOMPLISHED", "ALL SYSTEMS GO"],
    },
    error: {
      terse: ["FAILED", "FAULT"],
      friendly: ["Operation failed", "Process halted"],
      playful: ["SYSTEM MALFUNCTION", "CRITICAL FAULT"],
    },
    warning: {
      terse: ["WARN", "CAUTION"],
      friendly: ["Caution advised", "Notice"],
      playful: ["ANOMALY DETECTED", "PROCEED WITH CAUTION"],
    },
    info: {
      terse: ["INFO", "LOG"],
      friendly: ["Information", "Log entry"],
      playful: ["TRANSMISSION", "INCOMING"],
    },
  },
};

export default pack;
