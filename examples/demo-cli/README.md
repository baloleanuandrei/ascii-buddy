# @acme/cli-ui

Acme's branded CLI UI components. _Ship faster._

Generated with [asciibuddy](https://asciibuddy.dev) · pack: `minimal-mono` · tone: `terse`

## Install

```bash
npm install @acme/cli-ui
```

## Usage

```ts
import {
  banner,
  success,
  error,
  warning,
  info,
  section,
  table,
  spinner,
} from "@acme/cli-ui";

banner();
section("Configuration");
const stop = spinner("Deploying...");
// ... do work
stop();
success("Deployed");
error("Build failed");
warning("Using deprecated API");
info("Tip: run --help");
table(
  ["Name", "Status"],
  [
    ["api", "ready"],
    ["worker", "ready"],
  ]
);
```

## Preview

```bash
npm run preview
```
