export const theme = {
  name: "Acme",
  tagline: "Ship faster.",
  primaryColor: "#7C3AED",
  accentColor: "#7C3AED",
  pack: "minimal-mono",
  tone: "terse",
  symbols: {"success":"✓","error":"✗","warning":"!","info":"i"},
  divider: {"left":"── ","right":" ──","fill":"─"},
  tableBorders: "single",
  spinnerFrames: ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"],
  spinnerInterval: 80,
  microcopy: {
    success: ["Done","OK"],
    error: ["Failed","Error"],
    warning: ["Warning","Heads up"],
    info: ["Note","FYI"],
  },
} as const;

export type Theme = typeof theme;
