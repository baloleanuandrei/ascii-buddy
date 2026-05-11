import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ejs from "ejs";
import { ALL_COMPONENTS, type BrandSpec, type PackId } from "@asciibuddy/core";
import minimalMono from "@asciibuddy/pack-minimal-mono";
import retroTerminal from "@asciibuddy/pack-retro-terminal";
import candy from "@asciibuddy/pack-candy";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, "..", "templates");

const PACKS = {
  "minimal-mono": minimalMono,
  "retro-terminal": retroTerminal,
  candy,
} as const;

const TEMPLATES = [
  "src/index.ts.ejs",
  "src/theme.ts.ejs",
  "src/messages.ts.ejs",
  "src/prompts.ts.ejs",
  "src/progress.ts.ejs",
  "src/box.ts.ejs",
  "src/preview.ts.ejs",
  "package.json.ejs",
];

async function render(tmpl: string, ctx: Record<string, unknown>) {
  const p = path.join(TEMPLATES_DIR, tmpl);
  const src = await readFile(p, "utf8");
  return ejs.render(src, ctx, { filename: p });
}

function specFor(pack: PackId): BrandSpec {
  return {
    name: "Acme",
    packageName: "@acme/cli-ui",
    primaryColor: "#7C3AED",
    pack,
    figletFont: "ANSI Shadow",
    tone: "terse",
    components: [...ALL_COMPONENTS],
  };
}

describe("template rendering", () => {
  for (const packId of Object.keys(PACKS) as PackId[]) {
    describe(`pack: ${packId}`, () => {
      const spec = specFor(packId);
      const pack = PACKS[packId];
      const components = new Set(spec.components!);
      const has = (c: string) => components.has(c as (typeof ALL_COMPONENTS)[number]);
      const ctx = { spec, pack, bannerArt: "ACME", components, has, renderer: "stdout" };

      for (const tmpl of TEMPLATES) {
        it(`renders ${tmpl}`, async () => {
          const out = await render(tmpl, ctx);
          expect(out).toMatchSnapshot();
        });
      }
    });
  }

  it("omits unselected components from index", async () => {
    const spec = { ...specFor("minimal-mono"), components: ["banner", "messages"] as const };
    const components = new Set<string>(spec.components);
    const has = (c: string) => components.has(c);
    const out = await render("src/index.ts.ejs", {
      spec,
      pack: minimalMono,
      bannerArt: "",
      components,
      has,
      renderer: "stdout",
    });
    expect(out).toContain("banner");
    expect(out).toContain("messages");
    expect(out).not.toContain("./prompts.js");
    expect(out).not.toContain("./progress.js");
    expect(out).not.toContain("./box.js");
  });
});
