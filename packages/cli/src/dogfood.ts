import { generate } from "./generate.js";
import type { BrandSpec, PackId } from "@asciibuddy/core";

const pack = (process.argv[2] as PackId) ?? "minimal-mono";
const outDir = process.argv[3] ?? `./tmp-kit-${pack}`;

const spec: BrandSpec = {
  name: "Acme",
  packageName: "@acme/cli-ui",
  tagline: "Ship faster.",
  primaryColor: "#7C3AED",
  pack,
  figletFont: "ANSI Shadow",
  tone: "playful",
};

const result = await generate(spec, outDir);
console.log(`Wrote ${result.filesWritten.length} files to ${result.outDir}`);
