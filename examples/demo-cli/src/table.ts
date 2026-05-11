import chalk from "chalk";
import Table from "cli-table3";
import { theme } from "./theme.js";

const BORDER_CHARS = {
  single: {
    top: "─", "top-mid": "┬", "top-left": "┌", "top-right": "┐",
    bottom: "─", "bottom-mid": "┴", "bottom-left": "└", "bottom-right": "┘",
    left: "│", "left-mid": "├", mid: "─", "mid-mid": "┼",
    right: "│", "right-mid": "┤", middle: "│",
  },
  rounded: {
    top: "─", "top-mid": "┬", "top-left": "╭", "top-right": "╮",
    bottom: "─", "bottom-mid": "┴", "bottom-left": "╰", "bottom-right": "╯",
    left: "│", "left-mid": "├", mid: "─", "mid-mid": "┼",
    right: "│", "right-mid": "┤", middle: "│",
  },
  double: {
    top: "═", "top-mid": "╦", "top-left": "╔", "top-right": "╗",
    bottom: "═", "bottom-mid": "╩", "bottom-left": "╚", "bottom-right": "╝",
    left: "║", "left-mid": "╠", mid: "═", "mid-mid": "╬",
    right: "║", "right-mid": "╣", middle: "║",
  },
  ascii: {
    top: "-", "top-mid": "+", "top-left": "+", "top-right": "+",
    bottom: "-", "bottom-mid": "+", "bottom-left": "+", "bottom-right": "+",
    left: "|", "left-mid": "+", mid: "-", "mid-mid": "+",
    right: "|", "right-mid": "+", middle: "|",
  },
} as const;

export function table(headers: string[], rows: string[][]): void {
  const chars = BORDER_CHARS[theme.tableBorders];
  const t = new Table({
    head: headers.map((h) => chalk.hex(theme.primaryColor).bold(h)),
    chars,
    style: { head: [], border: [] },
  });
  for (const row of rows) t.push(row);
  process.stdout.write(t.toString() + "\n");
}
