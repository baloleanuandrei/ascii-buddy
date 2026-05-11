import * as p from "@clack/prompts";
import chalk from "chalk";
import figlet from "figlet";
import {
  ALL_COMPONENTS,
  CURATED_FIGLET_FONTS,
  type BrandSpec,
  type ComponentId,
  type PackId,
  type Renderer,
  type Target,
  type Tone,
} from "@asciibuddy/core";
import { PACK_CHOICES } from "./packs.js";
import { brandFromUrl } from "./brand-from-url.js";

function renderFigletSync(text: string, font: string): string {
  try {
    return figlet.textSync(text, { font: font as figlet.Fonts });
  } catch {
    return text;
  }
}

export async function runWizard(): Promise<{ spec: BrandSpec; outDir: string }> {
  p.intro(chalk.bgHex("#7C3AED").black(" asciibuddy ") + "  branding for your CLI tool");

  const suggestion = await maybeBrandFromUrl();

  const name = (await p.text({
    message: "Brand name?",
    placeholder: "Acme",
    initialValue: suggestion?.name,
    validate: (v) => (!v ? "Required" : v.length > 40 ? "Too long" : undefined),
  })) as string;
  if (p.isCancel(name)) cancel();

  const defaultPkg = `@${name.toLowerCase().replace(/[^a-z0-9-]/g, "")}/cli-ui`;
  const packageName = (await p.text({
    message: "Package name?",
    placeholder: defaultPkg,
    initialValue: defaultPkg,
    validate: (v) =>
      /^(@[a-z0-9-]+\/)?[a-z0-9][a-z0-9-]*$/.test(v) ? undefined : "Invalid npm name",
  })) as string;
  if (p.isCancel(packageName)) cancel();

  const tagline = (await p.text({
    message: "Tagline? (optional)",
    placeholder: "Ship faster.",
  })) as string | symbol;
  if (p.isCancel(tagline)) cancel();

  const primaryColor = (await p.text({
    message: "Primary color (hex)?",
    placeholder: "#7C3AED",
    initialValue: suggestion?.primaryColor ?? "#7C3AED",
    validate: (v) => (/^#[0-9a-fA-F]{6}$/.test(v) ? undefined : "Must be #RRGGBB"),
  })) as string;
  if (p.isCancel(primaryColor)) cancel();

  const pack = (await p.select({
    message: "Style pack?",
    options: PACK_CHOICES.map((c) => ({
      value: c.value,
      label: c.label + (suggestion?.pack === c.value ? " (suggested)" : ""),
      hint: c.hint,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialValue: (suggestion?.pack ?? "minimal-mono") as any,
  })) as PackId;
  if (p.isCancel(pack)) cancel();

  // Show figlet font previews
  p.note(
    CURATED_FIGLET_FONTS.slice(0, 4)
      .map((f) => chalk.dim(`── ${f} ──\n`) + renderFigletSync(name, f))
      .join("\n\n"),
    "Font previews (top 4)"
  );

  const figletFont = (await p.select({
    message: "FIGlet font for banner?",
    options: CURATED_FIGLET_FONTS.map((f) => ({ value: f, label: f })),
    initialValue: "ANSI Shadow",
  })) as string;
  if (p.isCancel(figletFont)) cancel();

  const tone = (await p.select({
    message: "Voice & tone?",
    options: [
      { value: "terse", label: "Terse", hint: "Short, direct. 'Done.' 'Failed.'" },
      { value: "friendly", label: "Friendly", hint: "Warm, conversational." },
      { value: "playful", label: "Playful", hint: "Fun, characterful." },
    ],
  })) as Tone;
  if (p.isCancel(tone)) cancel();

  const componentOpts = ALL_COMPONENTS.map((c) => ({ value: c, label: c }));
  const components = (await p.multiselect({
    message: "Which components do you want?",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: componentOpts as any,
    initialValues: [...ALL_COMPONENTS],
    required: true,
  })) as ComponentId[];
  if (p.isCancel(components)) cancel();

  const rendererOpts: { value: Renderer; label: string; hint: string }[] = [
    { value: "stdout", label: "Stdout (chalk/ora)", hint: "Default. Lightweight." },
    { value: "ink", label: "Ink (React)", hint: "Reactive TUI. Adds ink/react deps." },
  ];
  const renderer = (await p.select({
    message: "Renderer?",
    options: rendererOpts as Array<{ value: Renderer; label: string; hint: string }>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialValue: "stdout" as any,
  })) as Renderer;
  if (p.isCancel(renderer)) cancel();

  const targetOpts: { value: Target; label: string; hint: string }[] = [
    { value: "ts", label: "TypeScript only", hint: "Default." },
    { value: "py", label: "Python only", hint: "Rich-based proof of concept." },
    { value: "both", label: "Both (TS + Python)", hint: "Writes <out> and <out>-py." },
  ];
  const target = (await p.select({
    message: "Emit targets?",
    options: targetOpts as Array<{ value: Target; label: string; hint: string }>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialValue: "ts" as any,
  })) as Target;
  if (p.isCancel(target)) cancel();

  const outDir = (await p.text({
    message: "Output directory?",
    placeholder: "./cli-ui",
    initialValue: "./cli-ui",
  })) as string;
  if (p.isCancel(outDir)) cancel();

  const spec: BrandSpec = {
    name,
    packageName,
    tagline: typeof tagline === "string" && tagline.length > 0 ? tagline : undefined,
    primaryColor,
    pack,
    figletFont,
    tone,
    components,
    renderer,
    target,
  };

  return { spec, outDir };
}

function cancel(): never {
  p.cancel("Cancelled.");
  process.exit(0);
}

async function maybeBrandFromUrl() {
  const useUrl = (await p.confirm({
    message: "Auto-suggest brand from a URL?",
    initialValue: false,
  })) as boolean;
  if (p.isCancel(useUrl) || !useUrl) return undefined;
  const url = (await p.text({
    message: "Site URL?",
    placeholder: "https://stripe.com",
    validate: (v) => (!/^https?:\/\//.test(v) ? "Must start with http(s)://" : undefined),
  })) as string;
  if (p.isCancel(url)) return undefined;
  const s = p.spinner();
  s.start(`Fetching ${url}`);
  try {
    const result = await brandFromUrl(url);
    s.stop(
      `Suggested: ${result.name ?? "(no title)"} / ${result.primaryColor ?? "(no color)"} / ${result.pack}`
    );
    return result;
  } catch (err) {
    s.stop(`Could not fetch: ${(err as Error).message}`);
    return undefined;
  }
}
