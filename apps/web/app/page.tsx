"use client";
import { useMemo, useState } from "react";
import Convert from "ansi-to-html";
import { ALL_PACK_IDS, type PackId, type Tone } from "@asciibuddy/core";
import minimalMono from "@asciibuddy/pack-minimal-mono";
import retroTerminal from "@asciibuddy/pack-retro-terminal";
import candy from "@asciibuddy/pack-candy";
import nord from "@asciibuddy/pack-nord";
import solarized from "@asciibuddy/pack-solarized";
import cyberpunk from "@asciibuddy/pack-cyberpunk";
import corporate from "@asciibuddy/pack-corporate";

const PACKS = {
  "minimal-mono": minimalMono,
  "retro-terminal": retroTerminal,
  candy,
  nord,
  solarized,
  cyberpunk,
  corporate,
} as const;

function hex(color: string, text: string): string {
  // 24-bit ANSI foreground.
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `\u001b[38;2;${r};${g};${b}m${text}\u001b[0m`;
}
const dim = (s: string) => `\u001b[2m${s}\u001b[22m`;
const green = (s: string) => hex("#22c55e", s);
const red = (s: string) => hex("#ef4444", s);
const amber = (s: string) => hex("#f59e0b", s);

function renderPreview(name: string, color: string, packId: PackId, tone: Tone): string {
  const pack = PACKS[packId];
  const lines: string[] = [];
  lines.push(hex(color, `=== ${name} ===`));
  lines.push("");
  const div = pack.sectionDivider;
  const sect = (t: string) => `${hex(color, div.left + t + div.right)} ${dim(div.fill.repeat(40))}`;
  lines.push(sect("Messages"));
  lines.push(`${green(pack.symbols.success)} ${pack.microcopy.success[tone][0]}`);
  lines.push(`${red(pack.symbols.error)} ${pack.microcopy.error[tone][0]}`);
  lines.push(`${amber(pack.symbols.warning)} ${pack.microcopy.warning[tone][0]}`);
  lines.push(`${hex(color, pack.symbols.info)} ${pack.microcopy.info[tone][0]}`);
  lines.push("");
  lines.push(sect("Spinner"));
  lines.push(`${hex(color, pack.spinnerFrames[0])} Doing important work...`);
  return lines.join("\n");
}

export default function Page() {
  const [name, setName] = useState("Acme");
  const [color, setColor] = useState("#7c3aed");
  const [pack, setPack] = useState<PackId>("minimal-mono");
  const [tone, setTone] = useState<Tone>("terse");

  const html = useMemo(() => {
    const conv = new Convert({ fg: "#e2e2e2", bg: "#0b0b10", newline: true });
    return conv.toHtml(renderPreview(name, color, pack, tone));
  }, [name, color, pack, tone]);

  function download() {
    const spec = {
      name,
      packageName: `@${name.toLowerCase().replace(/[^a-z0-9-]/g, "")}/cli-ui`,
      primaryColor: color,
      pack,
      figletFont: "ANSI Shadow",
      tone,
    };
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brand.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main style={{ padding: 24, maxWidth: 920, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>asciibuddy playground</h1>
      <p style={{ opacity: 0.7 }}>Pick a pack, tweak the brand, download a brand.json.</p>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "16px 0" }}>
        <label>
          Brand
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        </label>
        <label>
          Color
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={inputStyle} />
        </label>
        <label>
          Pack
          <select value={pack} onChange={(e) => setPack(e.target.value as PackId)} style={inputStyle}>
            {ALL_PACK_IDS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          Tone
          <select value={tone} onChange={(e) => setTone(e.target.value as Tone)} style={inputStyle}>
            <option value="terse">terse</option>
            <option value="friendly">friendly</option>
            <option value="playful">playful</option>
          </select>
        </label>
      </section>

      <pre
        style={{ background: "#0b0b10", border: "1px solid #222", padding: 16, borderRadius: 8, overflow: "auto", fontFamily: "ui-monospace, Menlo, monospace" }}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <button onClick={download} style={buttonStyle}>Download brand.json</button>
      <p style={{ opacity: 0.6, marginTop: 12 }}>
        Then run: <code>npx asciibuddy init --config brand.json</code>
      </p>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  background: "#16161e",
  color: "#e2e2e2",
  border: "1px solid #222",
  borderRadius: 6,
  padding: 8,
};
const buttonStyle: React.CSSProperties = {
  marginTop: 16,
  background: "#7c3aed",
  color: "white",
  border: 0,
  padding: "10px 16px",
  borderRadius: 6,
  cursor: "pointer",
};
