import { DEFAULT_SERVER_SETTINGS, EnvironmentId, ProjectId } from "@t3tools/contracts";
import { resolveProjectSettings } from "@t3tools/shared/projectSettings";
import { describe, expect, it } from "vite-plus/test";

import { settingInheritanceLayers } from "./SettingInheritance";

const environmentId = EnvironmentId.make("laptop");
const projectId = ProjectId.make("project");

describe("worktree cleanup inheritance", () => {
  it("distinguishes project and environment worktree cleanup policies", () => {
    const settings = {
      ...DEFAULT_SERVER_SETTINGS,
      worktreeCleanup: {
        mode: "custom" as const,
        rules: DEFAULT_SERVER_SETTINGS.storageCleanup,
      },
      projectSettingsOverrides: {
        [projectId]: { worktreeCleanup: { mode: "off" as const } },
      },
    };
    const layers = settingInheritanceLayers(
      {
        environmentId,
        label: "Laptop",
        projectId,
        ...resolveProjectSettings(settings, projectId),
      },
      settings,
      "worktreeCleanup",
    );
    expect(layers.map((layer) => [layer.key, layer.value, layer.effective])).toEqual([
      ["project", "꺼짐", true],
      ["environment", "사용자 지정", false],
      ["built-in", "설정되지 않음", false],
    ]);
  });
});

describe("settingInheritanceLayers", () => {
  it("identifies the background activity profile supplied by each layer", () => {
    const settings = {
      ...DEFAULT_SERVER_SETTINGS,
      backgroundActivity: {
        schemaVersion: 1 as const,
        profile: "performance" as const,
        overrides: {},
      },
    };
    const layers = settingInheritanceLayers(
      {
        environmentId,
        label: "Laptop",
        projectId: null,
        ...resolveProjectSettings(settings, projectId),
      },
      settings,
      "backgroundActivity",
    );
    expect(layers.map((layer) => [layer.key, layer.value, layer.effective])).toEqual([
      ["environment", "성능", true],
      ["built-in", "균형", false],
    ]);
  });

  it("shows the checkout's project configuration as a layer for file-backed keys", () => {
    const file = { defaultThreadEnvMode: "worktree" as const };
    const fromFile = settingInheritanceLayers(
      {
        environmentId,
        label: "Laptop",
        projectId,
        ...resolveProjectSettings(DEFAULT_SERVER_SETTINGS, projectId, null, file),
      },
      DEFAULT_SERVER_SETTINGS,
      "defaultThreadEnvMode",
    );
    expect(fromFile.map((layer) => [layer.label, layer.value, layer.effective])).toEqual([
      ["프로젝트", "상속됨", false],
      ["Laptop", "상속됨", false],
      ["프로젝트 설정 파일", "새 워크트리", true],
      ["기본값", "현재 체크아웃", false],
    ]);
    const settings = { ...DEFAULT_SERVER_SETTINGS, defaultThreadEnvMode: "local" as const };
    const fromEnvironment = settingInheritanceLayers(
      {
        environmentId,
        label: "Laptop",
        projectId,
        ...resolveProjectSettings(settings, projectId, null, file),
      },
      settings,
      "defaultThreadEnvMode",
    );
    expect(fromEnvironment.map((layer) => [layer.value, layer.effective])).toEqual([
      ["상속됨", false],
      ["현재 체크아웃", true],
      ["상속됨", false],
      ["현재 체크아웃", false],
    ]);
  });
});
