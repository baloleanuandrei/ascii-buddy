# asciibuddy

**Branding for your CLI tool.** Generate a complete, on-brand TypeScript SDK for your CLI in under a minute.

Run the wizard, answer a few brand questions, and asciibuddy hands you a ready-to-publish `@yourbrand/cli-ui` package with banner, success/error/warning/info messages, section headers, tables, and spinners — all themed to your brand.

```bash
npx asciibuddy init
```

## What you get

A self-contained TypeScript package you fully own. No runtime dependency on asciibuddy. Drop it into your CLI:

```ts
import { banner, success, error, info, warning, section, table, spinner }
  from "@yourbrand/cli-ui";

banner();
section("Configuration");
const stop = spinner("Deploying...");
// ... do work
stop();
success("Deployed");
```

## v1 components

- Banner / splash (FIGlet, pre-rendered, colored)
- Success / error / warning / info messages
- Section headers
- Tables
- Spinners

## Style packs

- **Minimal Mono** — clean, dev-tool default
- **Retro Terminal** — 80s mainframe
- **Candy** — playful, rounded

## Develop

```bash
pnpm install
pnpm build
pnpm --filter @asciibuddy/cli dev init
```

## Status

v1, MVP. Web editor, multi-language SDKs, hosted assets, and interactive components (prompts/menus) all on the roadmap.
