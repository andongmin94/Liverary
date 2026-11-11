// @effect-diagnostics nodeBuiltinImport:off - standalone Vite+ task launcher.
import * as NodeChildProcess from "node:child_process";
import { vitePlusCommand } from "./check-changed-command.ts";

const [command, args] = vitePlusCommand(["run", "--cache", ...process.argv.slice(2)]);
const result = NodeChildProcess.spawnSync(command, args, {
  stdio: "inherit",
  // vp staged supplies this default before running the commit hook's tasks.
  env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? "development" },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
