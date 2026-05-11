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
const TEMPLATES_DIR = path.resolve(__dirname, "..", "..", "..", "templates", "python");

// Python supports a subset for the proof-of-concept emitter.
const PY_COMPONENTS: ComponentId[] = ["banner", "messages", "section", "table", "spinner", "prompts"];

interface PyTemplateFile {
  src: string;
  dest: string;
  component?: ComponentId;
}

function toPyModuleName(packageName: string): string {
  return packageName
    .replace(/^@/, "")
    .replace(/[/-]/g, "_")
    .replace(/[^a-z0-9_]/gi, "")
    .toLowerCase();
}

export async function generatePython(rawSpec: BrandSpec, outDirArg: string): Promise<{ filesWritten: string[]; outDir: string }> {
  const spec = brandSpecSchema.parse(rawSpec);
  const components = new Set<ComponentId>(
    (spec.components ?? [...ALL_COMPONENTS]).filter((c) => PY_COMPONENTS.includes(c))
  );
  const pack = loadPack(spec.pack);
  const outDir = path.resolve(process.cwd(), outDirArg);

  if (existsSync(outDir)) {
    throw new Error(`Output dir already exists: ${outDir}`);
  }

  const pyModuleName = toPyModuleName(spec.packageName);
  const pyPackageName = pyModuleName.replace(/_/g, "-");
  const bannerArt = components.has("banner")
    ? figlet.textSync(spec.name, { font: spec.figletFont as figlet.Fonts })
    : "";

  const has = (c: ComponentId) => components.has(c);
  const pyLiteral = (v: unknown): string => {
    if (v === null || v === undefined) return "None";
    if (typeof v === "boolean") return v ? "True" : "False";
    if (typeof v === "number") return String(v);
    if (typeof v === "string") return JSON.stringify(v);
    if (Array.isArray(v)) return "[" + v.map(pyLiteral).join(", ") + "]";
    if (typeof v === "object") {
      const entries = Object.entries(v as Record<string, unknown>).map(
        ([k, val]) => `${JSON.stringify(k)}: ${pyLiteral(val)}`
      );
      return "{" + entries.join(", ") + "}";
    }
    return "None";
  };
  const context = { spec, pack, bannerArt, components, has, pyModuleName, pyPackageName, py: pyLiteral };
  const written: string[] = [];

  const srcDir = path.join(outDir, "src", pyModuleName);
  await mkdir(srcDir, { recursive: true });

  const FILES: PyTemplateFile[] = [
    { src: "pyproject.toml.ejs", dest: "pyproject.toml" },
    { src: "README.md.ejs", dest: "README.md" },
    { src: "__init__.py.ejs", dest: `src/${pyModuleName}/__init__.py` },
    { src: "theme.py.ejs", dest: `src/${pyModuleName}/theme.py` },
    { src: "banner.py.ejs", dest: `src/${pyModuleName}/banner.py`, component: "banner" },
    { src: "messages.py.ejs", dest: `src/${pyModuleName}/messages.py`, component: "messages" },
    { src: "section.py.ejs", dest: `src/${pyModuleName}/section.py`, component: "section" },
    { src: "table.py.ejs", dest: `src/${pyModuleName}/table.py`, component: "table" },
    { src: "spinner.py.ejs", dest: `src/${pyModuleName}/spinner.py`, component: "spinner" },
    { src: "prompts.py.ejs", dest: `src/${pyModuleName}/prompts.py`, component: "prompts" },
    { src: "preview.py.ejs", dest: `src/${pyModuleName}/preview.py` },
  ];

  for (const file of FILES) {
    if (file.component && !components.has(file.component)) continue;
    const tmplPath = path.join(TEMPLATES_DIR, file.src);
    const tmpl = await readFile(tmplPath, "utf8");
    const rendered = ejs.render(tmpl, context, { filename: tmplPath });
    const destPath = path.join(outDir, file.dest);
    await mkdir(path.dirname(destPath), { recursive: true });
    await writeFile(destPath, rendered, "utf8");
    written.push(file.dest);
  }

  return { filesWritten: written, outDir };
}

// Future: Go/Rust emitters can be added here following the same pattern —
// load `templates/go/` or `templates/rust/`, map pack tokens to lipgloss/ratatui equivalents.
