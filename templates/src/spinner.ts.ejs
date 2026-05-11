import ora, { type Ora } from "ora";
import chalk from "chalk";
import { theme } from "./theme.js";

export function spinner(text: string): () => void {
  const instance: Ora = ora({
    text,
    spinner: { frames: [...theme.spinnerFrames], interval: theme.spinnerInterval },
    color: "white",
  }).start();
  // Recolor spinner frames via prefixText hack — ora renders frames in its own color,
  // so we instead style the text and rely on the frame glyphs themselves for brand feel.
  instance.text = chalk.hex(theme.primaryColor)(text);
  return () => instance.stop();
}
