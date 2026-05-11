import chalk from "chalk";
import { theme } from "./theme.js";

const SUCCESS_COLOR = "#22c55e";
const ERROR_COLOR = "#ef4444";
const WARNING_COLOR = "#f59e0b";
const INFO_COLOR = theme.primaryColor;

function pickDefault(list: readonly string[]): string {
  return list[0] ?? "";
}

export function success(message?: string): void {
  const text = message ?? pickDefault(theme.microcopy.success);
  process.stdout.write(
    chalk.hex(SUCCESS_COLOR)(theme.symbols.success) + " " + text + "\n"
  );
}

export function error(message?: string): void {
  const text = message ?? pickDefault(theme.microcopy.error);
  process.stderr.write(
    chalk.hex(ERROR_COLOR)(theme.symbols.error) + " " + text + "\n"
  );
}

export function warning(message?: string): void {
  const text = message ?? pickDefault(theme.microcopy.warning);
  process.stdout.write(
    chalk.hex(WARNING_COLOR)(theme.symbols.warning) + " " + text + "\n"
  );
}

export function info(message?: string): void {
  const text = message ?? pickDefault(theme.microcopy.info);
  process.stdout.write(
    chalk.hex(INFO_COLOR)(theme.symbols.info) + " " + text + "\n"
  );
}
