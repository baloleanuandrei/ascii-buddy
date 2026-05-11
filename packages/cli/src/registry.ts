import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { stylePackSchema, type StylePack } from "@asciibuddy/core";

const DEFAULT_INDEX_URL =
  process.env.ASCIIBUDDY_REGISTRY ?? "https://asciibuddy.dev/packs/index.json";

const CACHE_DIR = path.join(os.homedir(), ".asciibuddy", "packs");

interface RegistryIndex {
  packs: Array<{ id: string; url: string; description?: string }>;
}

async function fetchJson<T>(url: string): Promise<T> {
  // Allow file:// URLs for local registries (testing).
  if (url.startsWith("file://")) {
    const raw = await readFile(new URL(url), "utf8");
    return JSON.parse(raw) as T;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch ${url} failed: ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchIndex(indexUrl: string = DEFAULT_INDEX_URL): Promise<RegistryIndex> {
  return fetchJson<RegistryIndex>(indexUrl);
}

export async function addPack(id: string, indexUrl: string = DEFAULT_INDEX_URL): Promise<StylePack> {
  const index = await fetchIndex(indexUrl);
  const entry = index.packs.find((p) => p.id === id);
  if (!entry) throw new Error(`Pack not found in registry: ${id}`);

  const raw = await fetchJson<unknown>(entry.url);
  const pack = stylePackSchema.parse(raw) as unknown as StylePack;

  await mkdir(CACHE_DIR, { recursive: true });
  const dest = path.join(CACHE_DIR, `${id}.json`);
  await writeFile(dest, JSON.stringify(pack, null, 2), "utf8");
  return pack;
}

export async function listCachedPacks(): Promise<StylePack[]> {
  if (!existsSync(CACHE_DIR)) return [];
  const files = await readdir(CACHE_DIR);
  const out: StylePack[] = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    try {
      const raw = await readFile(path.join(CACHE_DIR, f), "utf8");
      out.push(stylePackSchema.parse(JSON.parse(raw)) as unknown as StylePack);
    } catch {
      // skip invalid cached entries
    }
  }
  return out;
}

export function cacheDir(): string {
  return CACHE_DIR;
}
