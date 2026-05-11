import type { PackId } from "@asciibuddy/core";

export interface BrandSuggestion {
  name?: string;
  primaryColor?: string;
  pack: PackId;
  sources: { themeColor?: string; sampledColors: string[]; title?: string };
}

const HEX_RE = /#[0-9a-fA-F]{6}\b/g;

function clampHex(hex: string): string {
  return "#" + hex.replace("#", "").toLowerCase();
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function brightness(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function saturation(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

function suggestPack(color: string | undefined): PackId {
  if (!color) return "minimal-mono";
  const sat = saturation(color);
  const bri = brightness(color);
  if (sat < 0.15) return "minimal-mono";
  if (bri < 80 && sat > 0.5) return "cyberpunk";
  const [r, g, b] = hexToRgb(color);
  if (r > b && r > g && sat > 0.4) return "candy";
  if (b > r && b > g && sat > 0.3 && bri < 180) return "nord";
  if (r > 180 && g > 140 && sat > 0.3) return "solarized";
  return "corporate";
}

export async function brandFromUrl(url: string): Promise<BrandSuggestion> {
  const res = await fetch(url, { headers: { "user-agent": "asciibuddy/1.0" } });
  const html = await res.text();

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch?.[1]?.trim();

  const themeColorMatch = html.match(/<meta\s+name=["']theme-color["']\s+content=["']([^"']+)["']/i);
  const themeColor = themeColorMatch?.[1];
  const themeColorHex = themeColor && /^#[0-9a-f]{6}$/i.test(themeColor) ? clampHex(themeColor) : undefined;

  const sampled = Array.from(new Set((html.match(HEX_RE) ?? []).map(clampHex))).slice(0, 20);

  const primary =
    themeColorHex ??
    sampled
      .filter((c) => {
        const s = saturation(c);
        const b = brightness(c);
        return s > 0.2 && b > 30 && b < 230;
      })
      .sort((a, b) => saturation(b) - saturation(a))[0];

  return {
    name: title?.split(/[\|\-—–·]/)[0]?.trim(),
    primaryColor: primary,
    pack: suggestPack(primary),
    sources: { themeColor: themeColorHex, sampledColors: sampled, title },
  };
}
