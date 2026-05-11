import chalk from "chalk";
import { theme } from "./theme.js";

export function section(title: string, width = 60): void {
  const inner = `${theme.divider.left}${title}${theme.divider.right}`;
  const remaining = Math.max(0, width - inner.length);
  const line = inner + theme.divider.fill.repeat(remaining);
  process.stdout.write("\n" + chalk.hex(theme.primaryColor).bold(line) + "\n");
}
