import { ComputerUnavailableError, OrchestratorMcpFailure } from "@t3tools/contracts";
import * as Effect from "effect/Effect";

import * as ComputerService from "../../../computer/ComputerService.ts";
import * as McpInvocationContext from "../../McpInvocationContext.ts";
import * as McpToolAccess from "../../McpToolAccess.ts";
import { loadCaller } from "../../threadAccess.ts";
import {
  ComputerActionToolkit,
  ComputerGetStateToolkit,
  ComputerStandardToolkit,
} from "./tools.ts";

const access = Effect.gen(function* () {
  const scope = yield* McpInvocationContext.requireThreadMcpCapability("computer").pipe(
    Effect.mapError(
      () =>
        new ComputerUnavailableError({
          message:
            "Computer access is unavailable to this caller. Enable agent computer access in Settings > Browser > Computer control for the local Windows desktop, then start a new agent session.",
        }),
    ),
  );
  return { threadId: scope.thread.threadId, service: yield* ComputerService.ComputerService };
});

export const layerStandard = McpToolAccess.toLayer(ComputerStandardToolkit, {
  computer_status: McpToolAccess.readsAsCaller(() =>
    Effect.gen(function* () {
      const { service } = yield* access;
      return yield* service.status;
    }),
  ),
  computer_list_apps: McpToolAccess.readsAsCaller(() =>
    Effect.gen(function* () {
      const { service } = yield* access;
      return yield* service.listApps;
    }),
  ),
  computer_list_windows: McpToolAccess.readsAsCaller((input) =>
    Effect.gen(function* () {
      const { service } = yield* access;
      return yield* service.listWindows(input);
    }),
  ),
});

export const layerGetState = McpToolAccess.toLayer(ComputerGetStateToolkit, {
  computer_get_state: McpToolAccess.readsAsCaller((input) =>
    Effect.gen(function* () {
      const { threadId, service } = yield* access;
      return yield* service.getState(threadId, input);
    }),
  ),
});

export const layerAction = McpToolAccess.toLayer(ComputerActionToolkit, {
  computer_action: McpToolAccess.actsAsCaller((input) =>
    Effect.gen(function* () {
      const { threadId, service } = yield* access;
      const caller = yield* loadCaller();
      if (caller.limits.interactionMode === "plan") {
        return yield* new OrchestratorMcpFailure({
          code: "capability_denied",
          message:
            "Computer actions are unavailable in plan mode. Read the screen with computer_get_state instead.",
        });
      }
      return yield* service.action(threadId, input);
    }),
  ),
});
