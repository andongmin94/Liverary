import { EnvironmentId } from "@t3tools/contracts";
import { expect, it } from "vite-plus/test";

import { projectEnvironment } from "../state/projects";
import { getFileMetadataQueryAtom } from "./useFileMetadata";

it.each([undefined, "C:\\work\\project", "C:\\Users\\another-user\\project"])(
  "leaves home-relative metadata paths for the destination server with cwd %s",
  (cwd) => {
    const environmentId = EnvironmentId.make("environment-metadata");
    for (const path of ["~/notes.md", "~\\notes.md"]) {
      expect(getFileMetadataQueryAtom(environmentId, `${path}:3`, cwd)).toBe(
        projectEnvironment.fileMetadata({ environmentId, input: { path } }),
      );
    }
  },
);
