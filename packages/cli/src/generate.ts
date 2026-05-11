import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ejs from "ejs";
import figlet from "figlet";
import {
  ALL_COMPONENTS,
  brandSpecSchema,
  type BrandSpec,
  type ComponentId,
} from "@asciibuddy/core";
import { loadPack } from "./packs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// dist/generate.js → ../../templates  (when built)
// src/generate.ts  → ../../templates  (when run via tsx)
const TEMPLATES_DIR = path.resolve(__dirname, "..", "..", "..", "templates");

interface TemplateFile {
  src: string;
  dest: string;
  component?: ComponentId;
}

const TEMPLATE_FILES: TemplateFile[] = [
  { src: "package.json.ejs", dest: "package.json" },
  { src: "tsconfig.json.ejs", dest: "tsconfig.json" },
  { src: "README.md.ejs", dest: "README.md" },
  { src: "src/index.ts.ejs", dest: "src/index.ts" },
  { src: "src/theme.ts.ejs", dest: "src/theme.ts" },
  { src: "src/banner.ts.ejs", dest: "src/banner.ts", component: "banner" },
  { src: "src/messages.ts.ejs", dest: "src/messages.ts", component: "messages" },
  { src: "src/section.ts.ejs", dest: "src/section.ts", component: "section" },
  { src: "src/table.ts.ejs", dest: "src/table.ts", component: "table" },
  { src: "src/spinner.ts.ejs", dest: "src/spinner.ts", component: "spinner" },
  { src: "src/prompts.ts.ejs", dest: "src/prompts.ts", component: "prompts" },
  { src: "src/progress.ts.ejs", dest: "src/progress.ts", component: "progress" },
  { src: "src/box.ts.ejs", dest: "src/box.ts", component: "box" },
  { src: "src/logger.ts.ejs", dest: "src/logger.ts", component: "logger" },
  { src: "src/errors.ts.ejs", dest: "src/errors.ts", component: "errors" },
  { src: "src/heading.ts.ejs", dest: "src/heading.ts", component: "heading" },
  { src: "src/alert.ts.ejs", dest: "src/alert.ts", component: "alert" },
  { src: "src/badge.ts.ejs", dest: "src/badge.ts", component: "badge" },
  { src: "src/defList.ts.ejs", dest: "src/defList.ts", component: "defList" },
  { src: "src/tree.ts.ejs", dest: "src/tree.ts", component: "tree" },
  { src: "src/steps.ts.ejs", dest: "src/steps.ts", component: "steps" },
  { src: "src/stats.ts.ejs", dest: "src/stats.ts", component: "stats" },
  { src: "src/code.ts.ejs", dest: "src/code.ts", component: "code" },
  { src: "src/timeline.ts.ejs", dest: "src/timeline.ts", component: "timeline" },
  { src: "src/emptyState.ts.ejs", dest: "src/emptyState.ts", component: "emptyState" },
  { src: "src/rule.ts.ejs", dest: "src/rule.ts", component: "rule" },
  { src: "src/columns.ts.ejs", dest: "src/columns.ts", component: "columns" },
  { src: "src/sparkline.ts.ejs", dest: "src/sparkline.ts", component: "sparkline" },
  { src: "src/barChart.ts.ejs", dest: "src/barChart.ts", component: "barChart" },
  { src: "src/gauge.ts.ejs", dest: "src/gauge.ts", component: "gauge" },
  { src: "src/json.ts.ejs", dest: "src/json.ts", component: "json" },
  { src: "src/markdown.ts.ejs", dest: "src/markdown.ts", component: "markdown" },
  { src: "src/link.ts.ejs", dest: "src/link.ts", component: "link" },
  { src: "src/gradient.ts.ejs", dest: "src/gradient.ts", component: "gradient" },
  { src: "src/qr.ts.ejs", dest: "src/qr.ts", component: "qr" },
  { src: "src/multiProgress.ts.ejs", dest: "src/multiProgress.ts", component: "multiProgress" },
  { src: "src/stopwatch.ts.ejs", dest: "src/stopwatch.ts", component: "stopwatch" },
  { src: "src/preview.ts.ejs", dest: "src/preview.ts" },
];

const INK_FILES: TemplateFile[] = [
  { src: "src/ink/banner.tsx.ejs", dest: "src/ink/banner.tsx", component: "banner" },
  { src: "src/ink/messages.tsx.ejs", dest: "src/ink/messages.tsx", component: "messages" },
  { src: "src/ink/section.tsx.ejs", dest: "src/ink/section.tsx", component: "section" },
  { src: "src/ink/spinner.tsx.ejs", dest: "src/ink/spinner.tsx", component: "spinner" },
  { src: "src/ink/index.ts.ejs", dest: "src/ink/index.ts" },
  { src: "src/ink/preview.tsx.ejs", dest: "src/ink/preview.tsx" },
];

export interface GenerateResult {
  filesWritten: string[];
  outDir: string;
}

export async function generate(rawSpec: BrandSpec, outDirArg: string): Promise<GenerateResult> {
  const spec = brandSpecSchema.parse(rawSpec);
  const components = new Set<ComponentId>(spec.components ?? [...ALL_COMPONENTS]);
  const pack = loadPack(spec.pack);
  const outDir = path.resolve(process.cwd(), outDirArg);

  if (existsSync(outDir)) {
    throw new Error(`Output dir already exists: ${outDir}`);
  }

  const bannerArt = components.has("banner")
    ? figlet.textSync(spec.name, { font: spec.figletFont as figlet.Fonts })
    : "";

  const renderer = spec.renderer ?? "stdout";
  const has = (c: ComponentId) => components.has(c);
  const context = { spec, pack, bannerArt, components, has, renderer };
  const written: string[] = [];

  await mkdir(path.join(outDir, "src"), { recursive: true });

  const files = renderer === "ink" ? [...TEMPLATE_FILES, ...INK_FILES] : TEMPLATE_FILES;

  for (const file of files) {
    if (file.component && !components.has(file.component)) continue;
    const tmplPath = path.join(TEMPLATES_DIR, file.src);
    const tmpl = await readFile(tmplPath, "utf8");
    const rendered = ejs.render(tmpl, context, { filename: tmplPath });
    const destPath = path.join(outDir, file.dest);
    await mkdir(path.dirname(destPath), { recursive: true });
    await writeFile(destPath, rendered, "utf8");
    written.push(file.dest);
  }

  // Persist brand spec for re-generation
  await writeFile(
    path.join(outDir, "brand.json"),
    JSON.stringify({ ...spec, components: [...components] }, null, 2),
    "utf8"
  );
  written.push("brand.json");

  return { filesWritten: written, outDir };
}
