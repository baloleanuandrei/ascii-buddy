import {
  banner,
  success,
  error,
  warning,
  info,
  section,
  table,
  spinner,
} from "./index.js";

async function main() {
  banner();

  section("Messages");
  success();
  success("Deployed to acme.com");
  error();
  error("Build failed: missing env var");
  warning();
  warning("Using deprecated API");
  info();
  info("Tip: run --help for usage");

  section("Table");
  table(
    ["Service", "Status", "Region"],
    [
      ["api", "ready", "iad1"],
      ["worker", "ready", "sfo1"],
      ["queue", "pending", "fra1"],
    ]
  );

  section("Spinner");
  const stop = spinner("Doing important work...");
  await new Promise((r) => setTimeout(r, 1500));
  stop();
  success("Work complete");

  process.stdout.write("\n");
}

main();
