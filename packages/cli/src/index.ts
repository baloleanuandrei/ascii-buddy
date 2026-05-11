#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { brandSpecSchema, type BrandSpec, type Target } from "@asciibuddy/core";
import { runWizard } from "./wizard.js";
import { generate } from "./generate.js";
import { generatePython } from "./generate-python.js";
import { addPack, cacheDir, listCachedPacks } from "./registry.js";

interface ParsedArgs {
  cmd: string;
  config?: string;
  outDir?: string;
  target?: Target;
  renderer?: "stdout" | "ink";
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  const cmd = args[0] ?? "init";
  const parsed: ParsedArgs = { cmd };
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--config" && args[i + 1]) parsed.config = args[++i];
    else if (args[i] === "--out" && args[i + 1]) parsed.outDir = args[++i];
    else if (args[i] === "--target" && args[i + 1]) parsed.target = args[++i] as Target;
    else if (args[i] === "--renderer" && args[i + 1]) parsed.renderer = args[++i] as "stdout" | "ink";
  }
  return parsed;
}

async function runOne(spec: BrandSpec, outDir: string): Promise<void> {
  const target = spec.target ?? "ts";
  if (target === "ts" || target === "both") {
    const result = await generate(spec, outDir);
    console.log(`TS: wrote ${result.filesWritten.length} files to ${result.outDir}`);
  }
  if (target === "py" || target === "both") {
    const pyOut = target === "both" ? `${outDir}-py` : outDir;
    const result = await generatePython(spec, pyOut);
    console.log(`PY: wrote ${result.filesWritten.length} files to ${result.outDir}`);
  }
}

async function runFromConfig(configPath: string, outDirArg?: string, override?: Partial<BrandSpec>) {
  const raw = await readFile(path.resolve(configPath), "utf8");
  const merged = { ...JSON.parse(raw), ...override };
  const parsed = brandSpecSchema.parse(merged);
  const out = outDirArg ?? "./cli-ui";
  await runOne(parsed, out);
}

async function main() {
  const { cmd, config, outDir, target, renderer } = parseArgs(process.argv);

  if (cmd === "--help" || cmd === "-h" || cmd === "help") {
    console.log(`asciibuddy — branding for your CLI tool

Usage:
  asciibuddy init                          Run the interactive wizard
  asciibuddy init --config <file> [--out <dir>] [--target ts|py|both] [--renderer stdout|ink]
                                           Generate from a brand.json (no prompts)
  asciibuddy add pack <id>                 Install a community pack from the registry
  asciibuddy list packs                    List cached community packs
  asciibuddy --help                        Show this help

Env:
  ASCIIBUDDY_REGISTRY                      Override registry index URL
`);
    return;
  }

  if (cmd === "add") {
    const sub = process.argv[3];
    const id = process.argv[4];
    if (sub !== "pack" || !id) {
      console.error("Usage: asciibuddy add pack <id>");
      process.exit(1);
    }
    const pack = await addPack(id);
    console.log(`Installed pack '${pack.id}' to ${cacheDir()}/${pack.id}.json`);
    return;
  }

  if (cmd === "list") {
    const sub = process.argv[3];
    if (sub !== "packs") {
      console.error("Usage: asciibuddy list packs");
      process.exit(1);
    }
    const packs = await listCachedPacks();
    if (packs.length === 0) {
      console.log(`No cached packs in ${cacheDir()}`);
      return;
    }
    for (const p of packs) console.log(`- ${p.id}`);
    return;
  }

  if (cmd !== "init") {
    console.error(`Unknown command: ${cmd}`);
    process.exit(1);
  }

  if (config) {
    const override: Partial<BrandSpec> = {};
    if (target) override.target = target;
    if (renderer) override.renderer = renderer;
    await runFromConfig(config, outDir, override);
    return;
  }

  const { spec, outDir: wizardOut } = await runWizard();
  const s = p.spinner();
  s.start("Generating your kit");
  try {
    await runOne(spec, wizardOut);
    s.stop("Done");
    p.outro(
      chalk.green("Done! ") +
        `Next: ${chalk.cyan(`cd ${wizardOut} && npm install && npm run preview`)}`
    );
  } catch (err) {
    s.stop("Generation failed");
    p.cancel((err as Error).message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
