interface WorkspacePackage {
  readonly name: string;
  readonly dir: string;
  readonly deps: ReadonlyArray<string>;
}

export function readWorkspace(): Array<WorkspacePackage>;

export function decide(
  files: ReadonlyArray<string>,
  packages: ReadonlyArray<WorkspacePackage>,
): {
  affected: Array<string>;
};
