import {
  ComputerActionInput,
  ComputerAppInput,
  ComputerAppsResult,
  ComputerError,
  ComputerGetStateInput,
  ComputerStateResult,
  ComputerStatus,
  ComputerWindowsResult,
  OrchestratorMcpFailure,
} from "@t3tools/contracts";
import * as Schema from "effect/Schema";
import { McpSchema, Tool, Toolkit } from "effect/ai";

import * as ComputerService from "../../../computer/ComputerService.ts";
import * as ThreadManagementService from "../../../orchestration-v2/ThreadManagementService.ts";
import * as McpInvocationContext from "../../McpInvocationContext.ts";

const shared = {
  failure: Schema.Union([ComputerError, OrchestratorMcpFailure]),
  dependencies: [
    ComputerService.ComputerService,
    ThreadManagementService.ThreadManagementService,
    McpInvocationContext.McpInvocationContext,
  ],
};

const ComputerStatusTool = Tool.make("computer_status", {
  ...shared,
  description:
    "Check this environment's native Windows computer control. Only the local Liverary desktop can provide it; remote environments and WSL cannot reach the user's desktop.",
  parameters: Schema.Record(Schema.String, Schema.Never),
  success: ComputerStatus,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(McpSchema.EnabledWhen, McpInvocationContext.hiddenFromOutsideClients);

const ComputerListAppsTool = Tool.make("computer_list_apps", {
  ...shared,
  description:
    "List running Windows apps with visible windows. Use the returned pid:<number> to select the exact app before reading or controlling it.",
  parameters: Schema.Record(Schema.String, Schema.Never),
  success: ComputerAppsResult,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(McpSchema.EnabledWhen, McpInvocationContext.hiddenFromOutsideClients);

const ComputerListWindowsTool = Tool.make("computer_list_windows", {
  ...shared,
  description:
    "List controllable windows of a running Windows app. Use its window id with computer_get_state.",
  parameters: ComputerAppInput,
  success: ComputerWindowsResult,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(McpSchema.EnabledWhen, McpInvocationContext.hiddenFromOutsideClients);

export const ComputerGetStateTool = Tool.make("computer_get_state", {
  ...shared,
  description:
    "Read a Windows app's accessibility tree and screenshot without raising its window. Returns this thread's latest snapshotId. Use element indexes from its tree, or coordinates in the returned screenshot, with computer_action.",
  parameters: ComputerGetStateInput,
  success: ComputerStateResult,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(McpSchema.EnabledWhen, McpInvocationContext.hiddenFromOutsideClients);

export const ComputerActionTool = Tool.make("computer_action", {
  ...shared,
  description:
    "Control the app in this thread's latest snapshot and return its new tree and screenshot. Every action except launch_app requires snapshotId. Prefer elementIndex; x/y are pixels in that screenshot. foreground:true allows bringing the target in front for mouse and keyboard input. A failed action is never retried automatically; read fresh state before deciding whether to act again.",
  parameters: ComputerActionInput,
  success: ComputerStateResult,
})
  .annotate(Tool.Readonly, false)
  .annotate(Tool.Destructive, true)
  .annotate(McpSchema.EnabledWhen, McpInvocationContext.hiddenFromOutsideClients);

export const ComputerStandardToolkit = Toolkit.make(
  ComputerStatusTool,
  ComputerListAppsTool,
  ComputerListWindowsTool,
);
export const ComputerGetStateToolkit = Toolkit.make(ComputerGetStateTool);
export const ComputerActionToolkit = Toolkit.make(ComputerActionTool);
export const ComputerToolkit = Toolkit.make(
  ComputerStatusTool,
  ComputerListAppsTool,
  ComputerListWindowsTool,
  ComputerGetStateTool,
  ComputerActionTool,
);
